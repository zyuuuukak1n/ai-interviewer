# AI Interviewer 🎙️

新卒就活生向けのリアルタイムAI模擬面接＆フィードバックWebアプリケーションです。

志望企業名や企業サイトURL、求人票を入力すると、AIが企業の理念・事業内容・求める人物像を安全にスクレイピング・解析して「専属の面接官ペルソナ」を動的に構築します。
**Gemini 3.8 Live** による超低遅延の音声リアルタイム対話（マイク・スピーカー双方向）で本番さながらの深掘り面接を行い、終了後は **Gemini 3.8 Flash** が5軸レーダーチャートスコアや回答改善例の対比レポートを出力します。

---

## 主な機能

1. **企業解析＆面接官ペルソナ動的生成**
   - URLスクレイピングによる理念・事業課題・人物像の抽出
   - 多層SSRF防御（プライベートIP/クラウドメタデータ/DNSリバインディング遮断、5秒タイムアウト、2MB上限）
   - 1次（人事）・2次（現場マネージャー）・最終（役員）の各フェーズに応じた質問設計とWhy/Howの3段階深掘り
2. **Gemini 3.8 Live によるリアルタイム音声面接**
   - バックエンドWebSocketプロキシ経由でAPIキーを完全秘匿
   - Web Audio APIによる低遅延PCM音声ストリーミング
   - AI面接官の音声波形ビジュアライザー（Canvas API）
   - リアルタイム字幕（ON/OFF切替・本番緊張感維持のためデフォルトOFF）
   - 15分セッション制限・レート制限保護
3. **5軸スコア＆回答別改善対比フィードバック**
   - 総合判定（S / A / B / C）
   - レーダーチャート5軸評価（論理的思考力、企業理解度・志望度、主体性・再現性、結論ファースト、カルチャーフィット度：各100点）
   - 学生の実際の発言引用と、プロ面接官による改善回答例の対比表示
   - 深掘り耐性レビュー（一貫性評価）
4. **Cookie + IndexedDB + DB ハイブリッド履歴管理**
   - ゲスト利用時はブラウザ内IndexedDB（Dexie.js）に全履歴・フィードバックを即時保存
   - ログイン・新規登録時にゲスト履歴をサーバーDBへ自動同期（マージ）
5. **マルチ認証基盤**
   - メールアドレス＆パスワード認証（Argon2 / bcrypt）
   - Google アカウント認証 (OAuth 2.0 / OIDC)
   - パスキー認証 (WebAuthn / FIDO2：Touch ID, Face ID, Windows Hello)

---

## 技術スタック

- **フロントエンド & バックエンド**: Next.js 15 (App Router, TypeScript) + Tailwind CSS + Lucide Icons + Node.js カスタムサーバー (`server.ts` + `ws` WebSocket Proxy)
- **AIモデル**:
  - 音声リアルタイム対話: `gemini-3.8-live` (WebSocket)
  - 企業解析・構造化フィードバック: `gemini-3.8-flash` (Structured Outputs / JSON Schema)
- **データベース & ORM**: Prisma ORM + SQLite (PostgreSQL移行対応設計)
- **認証**: Better Auth + `@simplewebauthn/server` / `@simplewebauthn/browser`
- **クライアントDB**: Dexie.js (IndexedDB)
- **インフラ**: Docker / Docker Compose (node:20-alpine / USER node)

---

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/zyuuuukak1n/ai-interviewer.git
cd ai-interviewer
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

各環境変数を設定してください：
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/) で取得したAPIキー
- `BETTER_AUTH_SECRET`: `openssl rand -base64 32` などで生成した32文字以上のランダム文字列
- `BETTER_AUTH_URL`: アプリケーションのベースURL（例: `http://localhost:3080/tools/ai-interviewer`）
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google Cloud Consoleで発行したOAuth 2.0クライアントID/シークレット（Googleログインを利用する場合）
- `NEXT_PUBLIC_RP_ID`: WebAuthnのRelaying Party ID（ローカル時は `localhost`、本番時はドメイン名）

### 3. パッケージのインストール
```bash
npm install
```

### 4. データベースの初期化
```bash
npx prisma db push
```

### 5. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで `http://localhost:3080/tools/ai-interviewer` にアクセスしてください。

### 6. テストの実行
```bash
npm test
```

---

## Docker での起動

```bash
docker compose up -d --build
```

---

## ライセンス

[MIT License](LICENSE) © 2026 じゅーかきん
