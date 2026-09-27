# 作業指示

- タスクID: BUG-002
- 正式名称 / UI表示名: reviewer / reviewer
- 担当役割: 独立レビュー
- ステータス: 未着手
- 目的: サイドバーの通常リンクとプロジェクト用ボタンが画面1へ開く変更を確認する。
- 対象ファイル: extension/content.js、extension/manifest.json、extension/README.md。
- 変更可能なファイル: coordination/reports/BUG-002/reviewer.mdのみ。
- 変更禁止のファイル: その他。
- 確認観点: 戻るボタン削除、通常会話クリック、非会話リンク、ボタン経由の親URL変化、プロフィール表示、誤った外部URLをiframeで開かないこと、既存の画面割当。
- 報告ファイル: coordination/reports/BUG-002/reviewer.md。
- 実機未確認ならその旨を記録する。
- 追加確認: Ctrl/Meta/Shift/Alt付きクリックの標準動作、分割終了時のイベント監視解除、メニュー監視の重複防止を修正後に再確認する。
