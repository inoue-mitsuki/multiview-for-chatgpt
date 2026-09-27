# 作業指示

- タスクID: FEATURE-002
- 正式名称 / UI表示名: dev / dev
- 担当役割: 実装
- ステータス: 未着手
- 背景・目的: `task.md`を参照。現在タブのHTTP(S) URLを4画面共通の開始URLにする。
- 作業範囲: `extension/manifest.json`、`background.js`、`content.js`、`README.md`。
- 作業対象外: 異なるURL入力、ヘッダー解除、依存追加、外部公開。
- 対象ファイル・変更可能なファイル: `extension/`と自身の報告MDのみ。
- 変更禁止のファイル: その他すべて。削除不可。
- 変更権限: 指定範囲のみ書込。
- 制約事項: actionクリック時だけ`activeTab`+`scripting`で注入し、通常のHTTP(S) URLのみ対応。iframe内への再注入を避ける。必要以上の権限を追加しない。既存の解除とエラー表示を保つ。
- 依存タスク: FEATURE-001。
- 参照すべきファイル: `coordination/tasks/FEATURE-002/task.md`、`extension/`。
- 実施内容: 一般URL化、READMEの対応範囲と制限を明示、構文確認。
- 完了条件: 固定ChatGPT URLを除去し、4 iframeへ現在URLを使用。構文確認成功。
- 確認方法: nodeによるJSON/JS構文、コード経路。
- 作業報告ファイル: `coordination/reports/FEATURE-002/dev.md`。
- 統合管理に判断を求める条件: 権限拡大や既存の安全性を損なう変更が必要な場合。

## 差戻し 2026-09-25

独立試験・レビューで、iframe拒否でもloadイベントが発火すると空白画面になり、エラー表示を保証できないことを確認。各ペインに目立ちすぎない常設の案内を設け、空白ならサイトの埋め込み制限を確認できるようにする。非HTTP(S)ページの `!` バッジも、アイコンのタイトルで理由が分かるようにする。自動検出できるとREADMEで主張しない。変更範囲は従前どおり。
