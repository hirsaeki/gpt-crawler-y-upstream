# GPT Crawler

GPTクローラーは、指定されたURLまたは複数のURLからデータを収集し、カスタムGPT（OpenAIの自然言語処理モデル）を作成するための知識ファイルを生成するためのツールです。

クロール実行を示すGIF

## 特徴

- 指定したURLやURLパターンに一致するページをクロールし、指定したCSSセレクタで抽出したテキストデータを収集
- 収集したデータをJSONファイルに出力し、OpenAIのカスタムGPTやカスタムアシスタントの学習データとして利用可能
- クロール設定をコードまたはAPIで柔軟に指定可能
- Dockerを使ったコンテナ化にも対応

## 使い方

### ローカルでの実行

#### 前提条件

- Node.js >= 16がインストールされていること

#### インストール

1. リポジトリをクローンします。

```bash
git clone https://github.com/builderio/gpt-crawler
```

2. 依存関係をインストールします。

```bash
cd gpt-crawler
npm install
```

#### 設定

`config.ts` ファイルを開き、クロールの設定を行います。主な設定項目は以下の通りです。

- `url`: クロールを開始するURL
- `match`: クロール対象とするURLのパターン
- `selector`: テキストデータを抽出するCSSセレクタ
- `maxPagesToCrawl`: クロールする最大ページ数
- `outputFileName`: 出力ファイル名

#### 実行

以下のコマンドでクロールを実行します。

```bash
npm start
```

クロールが完了すると、指定した出力ファイル名でJSONファイルが生成されます。

### Dockerを使った実行

Dockerを使ってコンテナ化された環境でクロールを実行することもできます。詳細は [containerapp/README.md](./containerapp/README.md) を参照してください。

### APIサーバーとしての実行

GPT CrawlerをAPIサーバーとして実行することもできます。`/crawl` エンドポイントにPOSTリクエストを送信し、設定をJSONで指定することでクロールを実行できます。APIドキュメントは `/api-docs` エンドポイントで提供されています。

## OpenAIへのデータアップロード

生成されたJSONファイルをOpenAIにアップロードすることで、カスタムGPTやカスタムアシスタントを作成できます。

1. [OpenAIのWebサイト](https://platform.openai.com/assistants) にアクセスします。
2. "Create a GPT" または "Create an Assistant" を選択します。
3. "Upload a file" を選択し、生成したJSONファイルをアップロードします。

## ライセンス

このプロジェクトは ISC ライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) ファイルを参照してください。

## 貢献

プルリクエストや改善提案は大歓迎です。バグ報告や機能リクエストは、Issueからお願いします。

<p align="center">
   <a href="https://www.builder.io/m/developers">
      <picture>
         <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/844291/230786554-eb225eeb-2f6b-4286-b8c2-535b1131744a.png">
         <img width="250" alt="Made with love by Builder.io" src="https://user-images.githubusercontent.com/844291/230786555-a58479e4-75f3-4222-a6eb-74c5af953eac.png">
       </picture>
   </a>
</p>

また、このリポジトリのフォーク元である、Builder.ioの開発者の方々に感謝します。[1][2][3][4][5][6][7][8][9][10][11][12][13][14][15][16][17][18][19][20]

Citations:
[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/106256/9d5871fe-a866-4b58-a66c-970d400e7b4b/gpt-crawler-y-upstream_project_summary.xml
[2] https://blog.csdn.net/weixin_43896318/article/details/122809780
[3] https://www.cnblogs.com/henuliulei/p/14710316.html
[4] https://github.com/Labmem003/README.md-Sample
[5] https://www.makeareadme.com
[6] https://www.cnblogs.com/xiang--liu/p/9710296.html
[7] https://whiterobe.github.io/TIC2019GitTrain/articles/how_to_write_markdown.html
[8] https://yuuichung.github.io/2018/06/06/hexo-readme/
[9] https://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
[10] https://www.freecodecamp.org/chinese/news/how-to-write-a-good-readme-file/
[11] https://cpp-learning.com/readme/
[12] https://deeeet.com/writing/2014/07/31/readme/
[13] https://qiita.com/shun198/items/c983c713452c041ef787
[14] https://mazhuang.org/2017/09/01/markdown-odd-skills/
[15] https://appdev-room.com/swift-github-readme
[16] https://qiita.com/autotaker1984/items/bce70c8c67a8f6fb1b9d
[17] https://docs.github.com/ja/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
[18] https://www.freecodecamp.org/japanese/news/how-to-write-a-good-readme-file/
[19] https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
[20] https://github.com/selfteaching/markdown-writing-with-mixed-cn-en/blob/master/README.md
