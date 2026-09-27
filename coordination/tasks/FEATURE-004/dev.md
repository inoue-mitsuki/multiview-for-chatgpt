# 作業指示

- タスクID: FEATURE-004
- 正式名称 / UI表示名: dev / dev
- 担当役割: 実装
- ステータス: 未着手
- 背景・目的: `task.md`参照。右クリックメニューで会話を画面に割当。
- 作業範囲: `extension/`のmanifest、background、content、README。
- 作業対象外: D&Dの再修正、外部サイト対応、ChatGPT API、依存追加、公開。
- 対象ファイル・変更可能なファイル: `extension/`と自身の報告MDのみ。
- 変更禁止のファイル: その他。削除不可。
- 変更権限: 指定範囲のみ書込。
- 制約事項: `chrome.contextMenus`のlink用メニューで画面1～4を作成。`info.linkUrl`とページURLを検証。必要なら分割開始して対象画面へ割当。既存iframeを不要に再読込しない。D&D/pointer経路は削除。現在のChatGPT専用権限を維持し、追加はcontextMenusのみ。メニュー重複登録を避ける。
- 依存タスク: FEATURE-003、BUG-001の観測。
- 参照すべきファイル: `coordination/tasks/FEATURE-004/task.md`、extension/。
- 実施内容: 右クリックメニュー、URL割当、README、構文確認、バージョン更新。
- 完了条件: 4メニュー、指定ペインのみ変更、無効URL拒否、D&D削除をコードで確認。
- 確認方法: Node構文・URL検証、可能ならブラウザ。
- 作業報告ファイル: `coordination/reports/FEATURE-004/dev.md`。
- 統合管理に判断を求める条件: 想定以上の権限が必要な場合。
