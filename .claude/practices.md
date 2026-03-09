# ソフトウェア開発実践ガイド

`principles.md` の原則を前提とした、具体的な実践手順です。
各サブエージェントは担当する Phase のみを参照します。

---

## Phase 1: 設計

### RFC リファレンス

実装対象の機能に関連する RFC 番号を `docs/specifications/` に記録します。

| 領域 | RFC |
|---|---|
| OAuth 2.0 | RFC 6749, RFC 6750 |
| OAuth 2.1 | RFC 9728 |
| JWT | RFC 7519 |
| PKCE | RFC 7636 |
| WebAuthn / パスキー | W3C Web Authentication |
| HTTP セマンティクス | RFC 9110 |
| HTTP キャッシュ | RFC 9111 |
| TLS 1.3 | RFC 8446 |
| JSON | RFC 8259 |
| UUID | RFC 9562 |
| URI | RFC 3986 |
| SMTP | RFC 5321 |
| DNS | RFC 1035, RFC 8484（DoH） |

### アーキテクチャ

- **DDD**（Domain-Driven Design）でドメインモデルを設計します。
- **設定の外部化**（dotenvx 等）でハードコードを避けます。
- **クエリの外部化** で SQL やフィルタ条件を設定から分離します。
- **JSON Schema** で入出力のバリデーションスキーマを定義します。
- **デザインパターン** を適用して構造を整理します。
- **プラグイン機構** で拡張ポイントを設計します。

### プロトタイピング

- 複数のプロトタイプを生成し、比較して選定します。
- セキュリティ要件を満たすかを選定基準に含めます。

---

## Phase 2: 実装

### コード品質

- 1 コミット 1 機能（Single Responsibility per Commit）で変更を管理します。
- ファイルを適切な粒度で分割します。
- 型注釈（Type Annotation）を付与します。
- 不変条件（Invariant）をアサーションで表明します。

### セキュリティ実装

- **パスキー**（Passkey / WebAuthn）を認証に採用します。
- 実装対象の機能に関連する **CWE** を特定し、該当する弱点への対策をコードに反映します。

#### CWE 参照の手順

1. 実装する機能の領域（認証、入力処理、暗号、ファイル操作等）を特定します。
2. CWE のカテゴリ・ビューから関連する弱点を検索します。
3. 該当する CWE ID と対策をコードコメントまたは `docs/specifications/` に記録します。

#### 主要な CWE カテゴリ

| 領域 | CWE |
|---|---|
| インジェクション | CWE-77（コマンドインジェクション）, CWE-78（OS コマンドインジェクション）, CWE-89（SQL インジェクション）, CWE-79（XSS） |
| 認証・認可 | CWE-287（不適切な認証）, CWE-862（認可の欠如）, CWE-863（不正な認可） |
| 暗号 | CWE-327（不十分な暗号アルゴリズム）, CWE-328（可逆ハッシュの使用）, CWE-330（不十分な乱数） |
| メモリ安全性 | CWE-119（バッファオーバーフロー）, CWE-416（Use After Free）, CWE-476（NULL ポインタ参照） |
| ファイル・パス | CWE-22（パストラバーサル）, CWE-434（危険なファイルアップロード） |
| 情報漏洩 | CWE-200（情報の露出）, CWE-532（ログへの機微情報の記録） |
| 並行処理 | CWE-362（レースコンディション）, CWE-367（TOCTOU） |
| デシリアライゼーション | CWE-502（安全でないデシリアライゼーション） |

### デザインシステムの適用

- デザイントークン（色、タイポグラフィ、間隔）を一元管理します。
- コンポーネントライブラリを参照し、独自実装を避けます。
- ツールチップで補足説明を表示し、ラベルだけでは伝わらない情報を補完します。
- レイアウトオフセットやディスプレイ切り替えなど、表示モードの変更にはユーザーが制御可能なトグルを提供します。
- 参考: Inhouse（Pepabo Design）、その他の組織固有のデザインシステム

---

## Phase 3: テスト

### テスト技法

- テスト観点を採番して管理します。
- **モック**（Mock / Stub / Spy）をプロトコルベースで導入します。
- **UI テスト**（Playwright 等）で E2E の振る舞いを検証します。
- **レースコンディション** のテストを実施します。

---

## Phase 4: 静的解析・検証

### Lint / SAST

- 言語ごとの Linter を実行します（RuboCop, ESLint, Clippy 等）。
- **SAST**（Static Application Security Testing）を実施します。
- **Semgrep** でカスタムルールを定義し、プロジェクト固有の脆弱性パターンを検出します。
- **DRYRUN** で変更の適用を事前に確認します。

### 依存関係の管理

- **Dependabot** を有効化し、クールダウン期間（Cooldown）を設定して更新頻度を制御します。
- `cargo audit` / `npm audit` 等で依存ライブラリの脆弱性を検査します。
- 依存ライブラリのライセンスを確認します。

---

## Phase 5: CI/CD・リリース

### GitHub Actions

- `pull_request_target` を避け、`pull_request` を使用します。
- `actionlint` で YAML の構文・セキュリティを検証します。
- サードパーティ Actions を pinact でコミットハッシュにピン留めします。

### リリース

- **Semantic Versioning** でバージョンを管理します。
- バイナリをストリップ（strip）して配布サイズを最適化します。
- マルチプラットフォーム（Linux / macOS / Windows）のビルドを CI で実行します。
- Homebrew での配布に対応します。

---

## Phase 6: 公開前チェックリスト

- [ ] ソースコードに秘密情報（API トークン、認証情報）が含まれていないことを確認します。
- [ ] 固有名詞・所属企業を特定できるデータが含まれていないことを確認します。
- [ ] `.gitignore` で秘密情報、ビルド成果物、OS/IDE ファイルを除外します。
- [ ] ライセンス（MIT 等）を設定します。
- [ ] 依存ライブラリのライセンス互換性を確認します。
- [ ] ドキュメントを英語で記述します。
- [ ] CLAUDE.md に公開可能な開発指針を整理して含めます。
- [ ] GitHub Actions の YAML にセキュリティ上の問題がないことを確認します。

---

## Phase 7: 運用監視

- スケーラビリティのボトルネックを監視します。
- 容量管理でディスク・メモリの逼迫を検知します。
- ネットワーク監視で帯域使用率・TCP キュー長を計測します。
- I/O 監視でディスク故障・遅延を検知します。

---

## フロントエンド技術

- **Playwright** で E2E テストを記述し、UI の仕様を固定化します。
- **モックデータ** を作成し、開発時のデータ投入を自動化します。
- WebGL / IndexedDB / WASM / SQLite / DuckDB はユースケースに応じて採用します。

---

## その他（未分類・ドメイン固有）

### デバイス制御

- MIDI デバイス制御

### 参考リンク

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Web フロントエンド設計ガイドライン（フューチャー）](https://future-architect.github.io/arch-guidelines/documents/forWebFrontend/web_frontend_guidelines.html)
- [Latent Space - Reviews Dead](https://www.latent.space/p/reviews-dead)
- [Claude Code カスタマイズの設計論](https://developer.so-tech.co.jp/entry/2026/02/27/113000)
- [Claude Code パーミッション & Sandbox ガイド](https://qiita.com/dai_chi/items/4e7921ab38908fbc2ad5)
