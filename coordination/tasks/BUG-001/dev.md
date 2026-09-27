# 作業指示

- タスクID: BUG-001
- 正式名称 / UI表示名: dev / dev
- 担当役割: 実装
- ステータス: 未着手
- 背景・目的: `task.md`を参照。会話D&D不動作を修正。
- 作業範囲: `extension/`のコード・README。
- 作業対象外: 外部URL、ChatGPT API、依存追加、公開。
- 対象ファイル・変更可能なファイル: `extension/`と自身の報告MDのみ。
- 変更禁止のファイル: その他。削除不可。
- 変更権限: 指定範囲のみ書込。
- 制約事項: `/c/<id>`と`/g/<project-id>/c/<id>`を許可。origin、認証情報、クエリ/ハッシュを検証。ドラッグ開始元は標準サイドバーの会話リンクへ限定。ネイティブdragstartがないときは閾値付きpointer操作で同じドロップ先を選べるようにする。クリック・スクロールを極力維持。外部送信なし。
- 依存タスク: FEATURE-003。
- 参照すべきファイル: `coordination/tasks/BUG-001/task.md`、`extension/`、`coordination/reports/FEATURE-003/integration.md`。
- 実施内容: 原因修正、URL形式の確認、バージョン/README更新。
- 完了条件: コードと意味のあるURL検証テスト、構文チェック。実機未検証は明記。
- 確認方法: node/ブラウザ可能な範囲。
- 作業報告ファイル: `coordination/reports/BUG-001/dev.md`。
- 統合管理に判断を求める条件: 標準サイドバーにURLを持つ要素が存在しない場合。

## 差戻し 2026-09-25

独立試験・レビューで、pointerupのpreventDefaultだけではその後のclickを抑止できず、元ページが会話へ遷移する重大な回帰候補が見つかった。ドラッグ成立時だけ元リンクに対する直後のclickを捕捉・抑止し、通常クリックは維持する。pointerdown直後のsetPointerCaptureによる操作競合を最小化する。native drop後の全ペインの強調表示も解除する。変更範囲は従前どおり。構文とURL検証を再実施。

## 実機DOM観測に基づく追加差戻し 2026-09-25

統合管理がBraveの既存ChatGPTタブで「スクワット記録」リンクを読み取り確認。hrefは通常の`/c/<id>`。リンク直近の`[class*="sidebar"]`祖先は`group/sidebar-expando-section`の部分セクション（幅約250px、高さ約1072px）であり、上位の`nav`がサイドバー全体（x=0、幅約260px、高さ約835px）。現行`sidebar()`は最初の会話リンクの部分セクションを返し、別セクションのリンクをcontainsで拒否する。`sidebar()`は位置・サイズが適切な上位nav等の共通祖先を選ぶ。`frame.js`も部分セクションだけでなくiframe内のサイドバー全体を隠すよう同じ観点で修正する。個別のChatGPT DOMクラス名を固定で前提にしない。変更範囲は従前どおり。
