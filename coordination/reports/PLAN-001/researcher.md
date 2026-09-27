# 作業報告

- タスクID: PLAN-001
- 正式名称 / UI表示名: researcher / researcher
- 担当役割: 技術調査
- ステータス: 報告済み
- 参照した親タスク: `coordination/tasks/PLAN-001/task.md`
- 参照した作業指示: `coordination/tasks/PLAN-001/researcher.md`

## 実施内容と結論

同一ブラウザウィンドウにChatGPTを4画面同時表示するには、通常はChatGPTの文書を4つのiframeへ読み込む必要がある。拡張ページ（`chrome-extension://...`）内のiframeと、`chatgpt.com` のトップページへcontent scriptで差し込む同一origin iframeは、異なる可否を持つ。

- 拡張ページ内のiframeは、ChatGPT側が `frame-ancestors` で拡張originを許可し、かつ `X-Frame-Options` 等と整合しなければ読み込めない。拡張機能のホスト権限は埋め込み許可に置き換わらない。[MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)、[MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- `chatgpt.com` のトップページへcontent scriptで `https://chatgpt.com/` のiframeを追加する場合、親子は同一originなので、応答が `frame-ancestors 'self'` または `X-Frame-Options: SAMEORIGIN` なら原理上許可される。一方、`frame-ancestors 'none'` または `X-Frame-Options: DENY` なら同一originでも禁止される。実際のChatGPT応答ヘッダーは未確認であり、この方式の可否は未決。[MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)、[MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- content scriptは対象ページDOMを変更できるが、拡張機能の分離世界で動くため、ChatGPTアプリの内部JavaScript状態に直接依存する方式は避けるべき。[Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- Chrome標準のSplit Viewは2タブを1組にするAPIで、4画面を単一表示領域に並べるAPIではない。公式APIは `createSplit` にちょうど2つのtab IDを要求する。Chrome 155以降と案内されており、Braveでの対応状況は未確認。[Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)、[Chrome Split View紹介](https://developer.chrome.com/blog/split-view-api-extensions)
- `chrome.windows` は別ウィンドウの作成と配置が可能だが、ユーザーの「同じウィンドウ内」要件を満たさない。[Chrome windows API](https://developer.chrome.com/docs/extensions/reference/api/windows)
- Side Panelは拡張ページをメインページの横に置く仕組みであり、ChatGPTの4つの独立したWebページを1つのメイン領域に表示するAPIではない。[Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

## 推奨する最初の検証

小さなMV3拡張を作り、`https://chatgpt.com/*` にだけcontent scriptを適用する。拡張アイコンで4分割を切り替え、ChatGPTトップページに同一origin iframeを3つ追加して、元のトップページを1画面として使う。最初はレイアウトとiframe読み込み可否だけを確認する。DevToolsでChatGPT文書の `Content-Security-Policy`（特に`frame-ancestors`）および `X-Frame-Options` と、実際のフレーム拒否エラーを確認する。ヘッダーが禁止するなら迂回せず、同一ウィンドウ4画面の実現方式についてユーザー判断を仰ぐ。

必要権限は、宣言済みcontent scriptなら `https://chatgpt.com/*` のmatchesと、操作ボタン用の`action`。プログラム注入方式なら `activeTab`と`scripting`が候補となる。ChatGPT画面を読むだけのために`tabs`、`webRequest`、`declarativeNetRequest`を初期権限として要求しない。ヘッダー除去による埋め込み制限の回避は、このタスクの対象外。

## 確認したファイル
`coordination/tasks/PLAN-001/task.md`、`coordination/tasks/PLAN-001/researcher.md`

## 作成・変更したファイル
`coordination/reports/PLAN-001/researcher.md`

## 実行したコマンド / 確認結果
`Get-Content` でタスク定義と指示を確認。Web検索で上記公式資料を確認。`Invoke-WebRequest -Uri 'https://chatgpt.com/' -Method Head` はサンドボックスのソケットアクセス禁止で失敗したため、ChatGPTの実ヘッダーを取得していない。Brave/Chromeでの実動作試験も未実施。

## 完了条件の達成状況
ブラウザAPIとiframe制限の条件を根拠付きで整理した。ChatGPTの現行ヘッダーと同一origin iframeの実動作は未検証。

## 発見した問題 / 未解決事項
ChatGPTが自己埋め込みを許可するか不明。仮に許可されても、ログイン状態、複数フレーム内でのアプリ動作、クリック・入力、狭い表示幅への対応は実ブラウザで検証が必要。

## 推測・仮定
推奨検証の「元ページ+3 iframe」はWebプラットフォーム上の条件付き試案であり、ChatGPTで稼働することの確認ではない。

## 統合管理に判断を求める事項
まず上記の可否検証を実装するか判断。ChatGPT側が自己埋め込みを禁じる場合は、ユーザー要件と衝突するため、迂回策を実装せずユーザーへ事実と選択肢を提示すること。

## 次工程への引継ぎ
レスポンスヘッダーだけで結論を出さず、ログイン済みブラウザでフレームの読み込みと4画面操作を確認すること。BraveとChromeを個別に確認すること。

## 作業完了日時
2026-09-25（日本時間）
