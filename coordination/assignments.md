# 割当て

| タスクID | 正式名称 | UI表示名 | 役割 | 作業指示 | 報告 | 変更権限 | 状態 | 依存 | 発行・更新日時 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-001 | researcher | researcher | 実現性調査 | tasks/PLAN-001/researcher.md | reports/PLAN-001/researcher.md | 調査対象は読み取り専用、報告MDのみ書込 | 完了 | なし | 2026-09-25 | 実動作は未検証 |
| FEATURE-001 | dev | dev | 検証用拡張の実装 | tasks/FEATURE-001/dev.md | reports/FEATURE-001/dev.md | 拡張ファイルと自身の報告のみ書込 | 完了 | PLAN-001 | 2026-09-25 | 4 iframe方式に修正済み |
| FEATURE-001 | tester | tester | 独立試験 | tasks/FEATURE-001/tester.md | reports/FEATURE-001/tester.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 静的確認のみ、実機未検証 |
| FEATURE-001 | reviewer | reviewer | 独立レビュー | tasks/FEATURE-001/reviewer.md | reports/FEATURE-001/reviewer.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 差戻し後の指摘解消を確認 |
| FEATURE-002 | dev | dev | 任意URL対応の実装 | tasks/FEATURE-002/dev.md | reports/FEATURE-002/dev.md | extension/と自身の報告のみ書込 | 中止 | FEATURE-001 | 2026-09-25 | ユーザーがChatGPT専用へ仕様変更 |
| FEATURE-002 | tester | tester | 独立試験 | tasks/FEATURE-002/tester.md | reports/FEATURE-002/tester.md | 報告MDのみ書込 | 中止 | dev | 2026-09-25 | 静的確認済み、採用せず |
| FEATURE-002 | reviewer | reviewer | 独立レビュー | tasks/FEATURE-002/reviewer.md | reports/FEATURE-002/reviewer.md | 報告MDのみ書込 | 中止 | dev | 2026-09-25 | 静的確認済み、採用せず |
| FEATURE-003 | researcher | researcher | ChatGPT画面の実現性調査 | tasks/FEATURE-003/researcher.md | reports/FEATURE-003/researcher.md | 報告MDのみ書込 | 完了 | FEATURE-001 | 2026-09-25 | DOMは実機未確認 |
| FEATURE-003 | dev | dev | 共通サイドバーと画面切替の実装 | tasks/FEATURE-003/dev.md | reports/FEATURE-003/dev.md | extension/と自身の報告のみ書込 | 完了 | researcher | 2026-09-25 | 0.3.0 |
| FEATURE-003 | tester | tester | 独立試験 | tasks/FEATURE-003/tester.md | reports/FEATURE-003/tester.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 静的試験済み、実機未確認 |
| FEATURE-003 | reviewer | reviewer | 独立レビュー | tasks/FEATURE-003/reviewer.md | reports/FEATURE-003/reviewer.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 実機DOM確認待ち |
| BUG-001 | dev | dev | 会話D&D不動作の修正 | tasks/BUG-001/dev.md | reports/BUG-001/dev.md | extension/と自身の報告のみ書込 | 完了 | FEATURE-003 | 2026-09-25 | 0.3.1に修正 |
| BUG-001 | tester | tester | 独立試験 | tasks/BUG-001/tester.md | reports/BUG-001/tester.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 静的検証と実DOM読取、再操作未確認 |
| BUG-001 | reviewer | reviewer | 独立レビュー | tasks/BUG-001/reviewer.md | reports/BUG-001/reviewer.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 追加指摘なし、再操作未確認 |
| FEATURE-004 | dev | dev | 右クリック画面割当の実装 | tasks/FEATURE-004/dev.md | reports/FEATURE-004/dev.md | extension/と自身の報告のみ書込 | 完了 | BUG-001 | 2026-09-25 | contextMenusを使用 |
| FEATURE-004 | tester | tester | 独立試験 | tasks/FEATURE-004/tester.md | reports/FEATURE-004/tester.md | 報告MDのみ書込 | 条件付き完了 | dev | 2026-09-25 | 実装後 |
| FEATURE-004 | reviewer | reviewer | 独立レビュー | tasks/FEATURE-004/reviewer.md | reports/FEATURE-004/reviewer.md | 報告MDのみ書込 | 報告済み | dev | 2026-09-25 | 実装後 |
| FEATURE-005 | researcher | researcher | 標準メニューと重なりの調査 | tasks/FEATURE-005/researcher.md | reports/FEATURE-005/researcher.md | 報告MDのみ書込 | 作業中 | FEATURE-004 | 2026-09-25 | DOM変更リスク |
| FEATURE-005 | dev | dev | メニュー表示と割当実装 | tasks/FEATURE-005/dev.md | reports/FEATURE-005/dev.md | extension/と自身の報告のみ書込 | 未着手 | researcher | 2026-09-25 | 既存メニュー維持 |
| FEATURE-005 | tester | tester | 独立試験 | tasks/FEATURE-005/tester.md | reports/FEATURE-005/tester.md | 報告MDのみ書込 | 未着手 | dev | 2026-09-25 | 実機未確認を明示 |
| FEATURE-005 | reviewer | reviewer | 独立レビュー | tasks/FEATURE-005/reviewer.md | reports/FEATURE-005/reviewer.md | 報告MDのみ書込 | 未着手 | dev | 2026-09-25 | DOM変更と誤割当 |
| REVIEW-001 | reviewer | reviewer | 拡張全体の独立レビュー | tasks/REVIEW-001/reviewer.md | reports/REVIEW-001/reviewer.md | 報告MDのみ書込 | 報告済み | BUG-003 | 2026-09-25 | 追補レビュー済み、Brave実機未確認 |
| REVIEW-001 | tester | tester | 拡張全体の独立試験 | tasks/REVIEW-001/tester.md | reports/REVIEW-001/tester.md | 報告MDのみ書込 | 条件付き完了 | BUG-003 | 2026-09-25 | 静的とChrome APIモック、Brave実機未確認 |
| BUG-004 | reviewer | reviewer | 会話メニューの独立レビュー | tasks/BUG-004/reviewer.md | reports/BUG-004/reviewer.md | 報告MDのみ書込 | 報告済み | BUG-003 | 2026-09-25 | 実DOM確認と静的レビュー、0.8.1実機未確認 |
