import { Config } from "./src/config";

export const defaultConfig: Config = {
  // url: "https://www.builder.io/c/docs/developers",
  // match: "https://www.builder.io/c/docs/**",
  url: "https://help.mypurecloud.com/articles/about-cx-cloud-from-genesys-and-salesforce/",
  match: "https://help.mypurecloud.com/?p**",
  maxPagesToCrawl: 100,
  // outputFileName: "output.json",
  outputFileName: "cxcloud.json",
  waitTime: 1000,
  onVisitPage: async ({ visitPageWaitTime }) => {
    await new Promise((resolve) =>
      setTimeout(resolve, visitPageWaitTime ?? 1000),
    );
  },
  // userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  maxTokens: 2000000,
  selector: "#main-content > div",
  crawlInsideSelector: true,
};
