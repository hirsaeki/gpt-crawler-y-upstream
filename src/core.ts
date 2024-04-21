// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page, ElementHandle, Frame } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";

let pageCounter = 0;
let crawler: PlaywrightCrawler;

async function deepQuerySelectorAll(
  context: Page | Frame,
  selector: string,
  shadowSelector?: string,
): Promise<ElementHandle<Node>[]> {
  const elements = await context.$$(selector);
  const results: ElementHandle<Node>[] = [];

  for (const el of elements) {
    results.push(el);

    try {
      const shadowRoot = await el.evaluateHandle(
        (el: Element) => el.shadowRoot,
      );
      if (shadowRoot) {
        const shadowElement = shadowRoot.asElement();
        if (shadowElement !== null) {
          const shadowFrame = await shadowElement.contentFrame();
          if (shadowFrame !== null) {
            const shadowElements = await deepQuerySelectorAll(
              shadowFrame,
              shadowSelector || selector,
            );
            results.push(...shadowElements);
          }
        }
      }
    } catch (e) {
      if (
        !(e instanceof Error) ||
        !e.message.includes(
          "Cannot read properties of null (reading 'shadowRoot')",
        )
      ) {
        console.error("Unexpected error in deepQuerySelectorAll:", e);
      }
    }
  }

  return results;
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout },
  );
}

export async function crawl(config: Config) {
  configSchema.parse(config);

  if (process.env.NO_CRAWL !== "true") {
    crawler = new PlaywrightCrawler(
      {
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          const title = await page.title();
          pageCounter++;
          log.info(
            `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
          );

          let html = "";
          // セレクターがある場合はマッチするセレクターのみ処理し、ない場合はページ全体
          if (config.selector) {
            // セレクターが文字列の場合は1要素の配列に変換
            const selectors =
              typeof config.selector === "string"
                ? [config.selector]
                : config.selector;

            for (const selector of selectors) {
              try {
                if (selector.startsWith("/")) {
                  await waitForXPath(
                    page,
                    selector,
                    config.waitForSelectorTimeout ?? 1000,
                  );
                } else {
                  await page.waitForSelector(selector, {
                    timeout: config.waitForSelectorTimeout ?? 1000,
                  });
                }
              } catch (error) {
                console.log(`Selector not found: ${selector}`);
              }

              // 複数マッチする要素のテキストを取得し、改行で連結
              let elements: ElementHandle<Node>[];
              if (config.deepQuerySelectorAll) {
                elements = await deepQuerySelectorAll(page, selector);
              } else {
                elements = await page.$$(selector);
              }
              for (const el of elements) {
                const text = await el.evaluate((node: Node) => {
                  return node.textContent?.trim() || "";
                });
                // 空白文字と改行文字だけだった場合、追加しない
                if (text !== "") {
                  html += text + "\n";
                }
              }
            }
          } else {
            html = await page.evaluate(() => document.body.innerText);
          }

          if (html.trim() !== "") {
            await pushData({ title, url: request.loadedUrl, html });
          }

          if (config.onVisitPage) {
            await config.onVisitPage({ page, pushData });
          }

          let currentDepth = request.userData?.queueDepth ?? 0;
          if (currentDepth < (config.maxDepthToCrawl ?? 10)) {
            currentDepth++;
            if (config.crawlInSelector && config.selector) {
              const selectors: string[] =
                typeof config.selector === "string"
                  ? [config.selector]
                  : config.selector;
              const links = await page.evaluate((selectors: string[]) => {
                const linkSet = new Set<string>();
                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                    const links = el.querySelectorAll("a[href]");
                    for (const link of links) {
                      linkSet.add((link as HTMLAnchorElement).href);
                    }
                  }
                }
                return Array.from(linkSet);
              }, selectors);

              if (config.deepQuerySelectorAll) {
                for (const selector of selectors) {
                  const deepLinks = await deepQuerySelectorAll(page, selector);
                  const deepLinkHrefs = await Promise.all(
                    deepLinks.map(async (link) => {
                      return await link.evaluate(
                        (a: HTMLAnchorElement) => a.href,
                      );
                    }),
                  );
                  links.push(...deepLinkHrefs);
                }
              }

              await enqueueLinks({
                urls: links,
                globs:
                  typeof config.match === "string"
                    ? [config.match]
                    : config.match,
                exclude:
                  typeof config.exclude === "string"
                    ? [config.exclude]
                    : config.exclude ?? [],
                userData: {
                  queueDepth: currentDepth,
                },
              });
            } else {
              await enqueueLinks({
                globs:
                  typeof config.match === "string"
                    ? [config.match]
                    : config.match,
                exclude:
                  typeof config.exclude === "string"
                    ? [config.exclude]
                    : config.exclude ?? [],
                userData: {
                  queueDepth: currentDepth,
                },
              });
            }
          } else {
            log.info(
              `Skipping crawling as depth limit of ${
                config.maxDepthToCrawl ?? 10
              } reached`,
            );
          }
        },
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        preNavigationHooks: [
          async ({ request, page, log }) => {
            const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
            if (RESOURCE_EXCLUSTIONS.length === 0) {
              return;
            }
            if (config.cookie) {
              const cookies = (
                Array.isArray(config.cookie) ? config.cookie : [config.cookie]
              ).map((cookie) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.loadedUrl,
                };
              });
              await page.context().addCookies(cookies);
            }
            await page.route(
              `**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`,
              (route) => route.abort("aborted"),
            );
            log.info(
              `Aborting requests for as this is a resource excluded route`,
            );
          },
        ],
      },
      new Configuration({
        purgeOnStart: true,
      }),
    );

    const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);

    if (isUrlASitemap) {
      const listOfUrls = await downloadListOfUrls({ url: config.url });
      await crawler.addRequests(listOfUrls);
      await crawler.run();
    } else {
      await crawler.run([config.url]);
    }
  }
}

export async function write(config: Config) {
  let nextFileNameString: PathLike = "";
  const jsonFiles = await glob("storage/datasets/default/*.json", {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  let currentResults: Record<string, any>[] = [];
  let currentSize: number = 0;
  let fileCounter: number = 1;
  const maxBytes: number = config.maxFileSize
    ? config.maxFileSize * 1024 * 1024
    : Infinity;

  const getStringByteSize = (str: string): number =>
    Buffer.byteLength(str, "utf-8");

  const nextFileName = (): string =>
    `${config.outputFileName.replace(/\.json$/, "")}-${fileCounter}.json`;

  const writeBatchToFile = async (): Promise<void> => {
    nextFileNameString = nextFileName();
    await writeFile(
      nextFileNameString,
      JSON.stringify(currentResults, null, 2),
    );
    console.log(
      `Wrote ${currentResults.length} items to ${nextFileNameString}`,
    );
    currentResults = [];
    currentSize = 0;
    fileCounter++;
  };

  let estimatedTokens: number = 0;

  const addContentOrSplit = async (
    data: Record<string, any>,
  ): Promise<void> => {
    const contentString: string = JSON.stringify(data);
    const tokenCount: number | false = isWithinTokenLimit(
      contentString,
      config.maxTokens || Infinity,
    );

    if (typeof tokenCount === "number") {
      if (estimatedTokens + tokenCount > config.maxTokens!) {
        // Only write the batch if it's not empty (something to write)
        if (currentResults.length > 0) {
          await writeBatchToFile();
        }
        // Since the addition of a single item exceeded the token limit, halve it.
        estimatedTokens = Math.floor(tokenCount / 2);
        currentResults.push(data);
      } else {
        currentResults.push(data);
        estimatedTokens += tokenCount;
      }
    }

    currentSize += getStringByteSize(contentString);
    if (currentSize > maxBytes) {
      await writeBatchToFile();
    }
  };

  // Iterate over each JSON file and process its contents.
  for (const file of jsonFiles) {
    const fileContent = await readFile(file, "utf-8");
    const data: Record<string, any> = JSON.parse(fileContent);
    await addContentOrSplit(data);
  }

  // Check if any remaining data needs to be written to a file.
  if (currentResults.length > 0) {
    await writeBatchToFile();
  }

  return nextFileNameString;
}

class GPTCrawlerCore {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async crawl() {
    await crawl(this.config);
  }

  async write(): Promise<PathLike> {
    // we need to wait for the file path as the path can change
    return new Promise((resolve, reject) => {
      write(this.config)
        .then((outputFilePath) => {
          resolve(outputFilePath);
        })
        .catch(reject);
    });
  }
}

export default GPTCrawlerCore;
