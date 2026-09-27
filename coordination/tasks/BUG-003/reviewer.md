# 作業指示

- タスクID: BUG-003
- 正式名称 / UI表示名: reviewer / reviewer
- 担当役割: 独立レビュー
- ステータス: 未着手
- 目的: プロフィールメニューへの誤追加防止と、プロフィールの画面1表示を確認。
- 対象ファイル: extension/content.js、extension/manifest.json、extension/README.md。
- 変更可能なファイル: coordination/reports/BUG-003/reviewer.mdのみ。
- 変更禁止のファイル: その他。
- 確認観点: 会話行識別、古い会話URLの残留、標準メニュー追加範囲、プロフィールリンク、SPA履歴遷移、外部URL、既存の三点リーダー割当。
- 報告ファイル: coordination/reports/BUG-003/reviewer.md。
- 実機未確認ならその旨を記録する。
- 差戻し後確認: プロフィールのメニュー項目を画面1へ直接送る処理と、再利用メニューの内容変化を認識する処理を再確認する。
