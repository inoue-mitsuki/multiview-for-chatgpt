# 作業指示

- タスクID: FEATURE-003
- 正式名称 / UI表示名: dev / dev
- 担当役割: 実装
- ステータス: 未着手
- 背景・目的: `task.md`を参照。標準サイドバーを左に1つ残し、右側の2/3/4画面へ会話を割り当てる。
- 作業範囲: `extension/manifest.json`、`background.js`、`content.js`、`README.md`。
- 作業対象外: 任意サイト対応、ChatGPT API、会話内容の収集・保存、外部送信、依存追加。
- 対象ファイル・変更可能なファイル: `extension/`と自身の報告MDのみ。
- 変更禁止のファイル: その他。削除不可。
- 変更権限: 指定範囲のみ書込。
- 制約事項: ChatGPT専用に戻す。2/3/4画面ボタン、標準サイドバーからの会話リンクのドラッグ・ドロップ、指定ペインのみのURL変更、終了操作を実装する。ドロップURLはChatGPTの会話URLに限定。研究報告の制約を参照する。
- 依存タスク: researcher調査完了。
- 参照すべきファイル: `coordination/tasks/FEATURE-003/task.md`、`coordination/reports/FEATURE-003/researcher.md`、extension/。
- 実施内容: レイアウト、D&D、ChatGPT専用権限、README、構文確認。
- 完了条件: 標準サイドバー1つと2/3/4画面、会話D&Dがコード上実装され、構文確認成功。未確認事項を記録。
- 確認方法: JSON/JS構文と可能なら実ブラウザ。
- 作業報告ファイル: `coordination/reports/FEATURE-003/dev.md`。
- 統合管理に判断を求める条件: 要件達成にサイト内部APIや広い権限が必要な場合。

## 調査後の補足 2026-09-25

`coordination/reports/FEATURE-003/researcher.md` を参照。親ページの標準サイドバーを左に露出し、ワークスペースを右に置く。幅の検出には妥当な候補とフォールバックを使う。iframe内の重複サイドバーは同一originのChatGPTフレームに限って隠すが、現行DOMは未検証なので過度な断定をしない。ドラッグ開始時・ドロップ時の両方でChatGPT会話URLを検証し、各ペインのURLを個別に保持する。画面数切替で既存ペインを不要に再読込しない。補助の貼付導線は今回必須ではない。

## 差戻し 2026-09-25

独立試験・レビューで、会話リンクがない状態ではiframe内の重複サイドバーを隠せず、親ページbody全体のMutationObserverで頻繁に幅計測が走り、サイドバーDOM置換後にResizeObserverの対象が古くなる可能性を指摘。iframe内の検出に左端位置・幅・高さに基づく安全なフォールバックを加える。親ページの幅更新はrequestAnimationFrame等でまとめ、サイドバー置換時にResizeObserverを新しい要素へ付け直す。変更範囲は従前どおり。実機未検証は維持する。

統合管理が再確認し、3画面時の細いペインではサイドバー幅がiframe幅の半分を超え得るため、幾何条件の上限をiframe幅の90%へ調整した。実機未確認は維持する。
