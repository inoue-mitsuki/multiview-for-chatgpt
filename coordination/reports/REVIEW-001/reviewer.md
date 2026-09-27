# 作業報告

- タスクID: REVIEW-001
- 正式名称 / UI表示名 / 担当役割: reviewer / reviewer / 独立レビュー
- ステータス: 未着手
# 独立レビュー報告

## タスクID / 担当
REVIEW-001 / reviewer（UI表示名 reviewer）

## 状態
報告済み。ソース変更なし。Brave実機未確認。

## 対象・実施
`extension/background.js`、`content.js`、`frame.js`、`manifest.json`、`README.md`を直接確認。`Get-Content`で行番号付き表示。既存報告の自己申告には依存しない。

## 指摘
1. **中: リサイズ位置が復元されない。** `extension/content.js:8,11-15,123-127,207-209,279-298`。境界を動かした後にページを再読み込みすると、保存状態にはcountとurlsしかなく、`splitX`/`splitY`とハンドル位置が初期値に戻る。状態に両比率を保存し、開始時にgridのCSS変数とハンドル位置へ反映する。2/3/4の切替後も比率を整合させる。
2. **中: iframe内でChatGPT以外の左ナビまで隠す可能性。** `extension/frame.js:5-19`。`suitable`は候補自身が`main`かだけを拒否し、`main`内にある`nav`や`aside`を除外しない。プロフィール等の画面1で本文の左ナビが条件に合うと非表示になる。`side.closest('main, [role=main]')`等で本文内候補を除外し、ChatGPT標準サイドバーをより限定する。
3. **低: 個別更新後の保存URLは更新されない場合がある。** `extension/content.js:195-199`。`about:blank`にしてから1フレーム後に元URLへ戻すが`saveState()`を呼ばないため、個別更新中にページが再読み込みされると保存済みURLと現在のiframe状態が食い違い得る。元URLを明示して保存したうえで再設定する。
4. **低: リサイズ操作をキャンセルした場合のイベント処理が残る。** `extension/content.js:284-296`。`pointercancel`時にmove/upリスナーを外さない。タッチ・ウィンドウ切替等でキャンセルされると次回の移動に旧処理が残る可能性がある。`pointercancel`/`lostpointercapture`でも同じ後片付けを行う。

## 観点別確認
- **全画面ナビ後復元・停止時state解除:** `manifest.json`の静的content scriptと`content.js:346`でactive状態なら自動開始。`start()`は親URL変化時に画面1を新URLへ設定し、2～4は保存URLを復元。`stop()`はsessionStorageキーを削除する。コード上の二重起動はトップフレームguardで抑制。
- **プロフィール・会話・メニュー:** プロフィールリンクは画面1へ送る。通常会話URLはパスを限定。会話メニュー項目は会話行近傍と`aria-controls`を確認。ただしChatGPT DOM変更・iframe側プロフィール表示は実機確認が必要。
- **URL・権限:** 外部URLは画面割当に通らず、権限は`activeTab`、`scripting`、`contextMenus`に限る。会話内容の外部送信コードなし。
- **iframeリクエスト:** 開始時に4枚のiframeを作り、各1回srcを設定する。復元時の`setCount()`はiframeを再設定しない。コード上は同一iframeの二重設定を確認せず。ただし非表示2枚もロードするため必要なら遅延生成を検討。
- **イベント:** `stop()`で主要observer、タイマー、documentリスナーを解除。上記pointercancelと、`menuClickHandler`の`setTimeout`が停止後も実行され得る点は残るが、`installMenuItems()`冒頭の`!host`で項目追加は防がれる。

## 未確認と引継ぎ
Brave実機の全画面遷移、プロフィール画面1表示、メニュー表示、2/3/4切替、境界ドラッグ、個別更新、iframe内サイドバーの状態は未確認。指摘1・2の修正後に実機で確認する。

## 完了日時
2026-09-25

## 追補レビュー（2026-09-25）
ユーザーがサイズ保持を不要と明示したため、初回指摘1は要求外として取り下げる。更新した`extension/`を再確認した。

- 初回指摘2: `frame.js:6`で`main`/`role=main`の内側を除外するよう修正。コード上解消。ただしChatGPT実DOMで本文がこのセマンティクスを持つかは未確認。
- 初回指摘3: `content.js:11-20,203-205`で現在のiframe URLを取得し、個別更新は`contentWindow.location.reload()`を使う。`about:blank`を挟む二重リクエストは削除。コード上解消。
- 初回指摘4: `content.js:304-311`で`pointercancel`時にmove/up/cancel監視を解除。コード上解消。
- 会話割当: `content.js:94-107`で親URL引数名を`parentPageUrl`に変更し、`paneUrl(pane)`を用いて既存会話の所在を調べる。変数名衝突は解消。

新たな重大不具合は静的レビューでは確認しなかった。引き続き、Brave実機でプロフィール表示、会話の画面移動、再読み込み復元、各画面の個別更新、サイズ操作を確認する必要がある。

## 最終追補レビュー（2026-09-25）
読み込み中URLの優先保存と非表示ペインの遅延読み込みに関する変更を静的確認。`content.js:11-26`は未完了ナビゲーションのURLを`pendingUrl`から保存し、`content.js:203-213`は起動時に表示中の枚数だけURLを設定する。`content.js:89-104,106-122`は非表示ペインのURLを`deferredUrl`として保持し、表示時に初めて設定する。画面3・4へ直接割り当てる際も、表示前に遅延URLを目標会話へ上書きするため、初期ホームへの余分な読み込みを避ける構造。

**低: 読み込みイベントのタイミング依存。** `content.js:19-22,213`の`load`ハンドラーはイベントの対象URLを確認せず`pendingUrl`を削除する。連続して別の会話を指定した際、古いナビゲーションの`load`が後から届くと、新しい`pendingUrl`が消え、`saveState()`が古い`contentWindow.location`を保存する可能性がある。ナビゲーションごとに識別子を持たせるか、`load`時の実URLが`pendingUrl`に一致する場合だけ解除する。ブラウザでこの順序が起きるかは未確認。

新たな重大不具合は静的確認では見つからなかった。`extension/tests/content-state.test.js`の更新は存在を確認したが、テストは実行していない。Brave実機で非表示ペインを開く操作、連続割当、再読み込み復元を確認する必要がある。
