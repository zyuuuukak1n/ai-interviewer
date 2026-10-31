# 実装計画書: AI模擬面接＆フィードバックWebアプリケーション (ai-interviewer)

新卒就活生向けのリアルタイムAI模擬面接＆フィードバックWebアプリケーションのアーキテクチャ設計および実装計画書です。

---

## 1. システムアーキテクチャ概要

本システムは、志望企業情報（企業名、URL、求人票）と学生プロフィール（ガクチカ、自己PR、志望職種、面接フェーズ）をもとに、AIが企業固有の面接官ペルソナを動的生成し、リアルタイム音声（WebSocket経由）で模擬面接と深掘りを行い、終了後に詳細な5軸フィードバックを提供するWebアプリケーションです。

```
+-----------------------------------------------------------------------------------+
| ブラウザ (Client: Next.js 15 App Router + Tailwind CSS)                           |
|  - Web Audio API (マイクPCM入力 16kHz / スピーカー出力 24kHz)                     |
|  - 音声波形ビジュアライザー (Canvas API) / リアルタイム字幕 (ON/OFF切替)           |
|  - レーダーチャート表示 (Recharts)                                                |
|  - IndexedDB (Dexie.js: ゲスト履歴保存 & ログイン時自動同期)                      |
+--------------------------+--------------------------------------------------------+
                           | HTTP / REST API (Zod検証)
                           | WebSocket (PCMバイナリ / JSONストリーム)
+--------------------------v--------------------------------------------------------+
| サーバー (Node.js カスタムサーバー: Next.js + ws WebSocket Proxy)                 |
|  - 認証層: Better Auth (Email/PW, Google OAuth, WebAuthn Passkey)                 |
|  - 安全な企業スクレイパー: SSRF防御 (プライベートIP/DNSリバインディング排除)        |
|  - Gemini 3.8 Flash連携: 企業分析・ペルソナ生成 / 面接後構造化フィードバック      |
|  - WebSocket プロキシ: クライアントと Gemini Live API をセキュアに中継 (APIキー秘匿) |
|  - ORM / DB: Prisma ORM + SQLite (PostgreSQL移行対応設計)                         |
+--------------------------+--------------------------------------------------------+
                           |
                           +---> Google AI Studio / Gemini APIs
                                  - gemini-3.8-flash (Structured Outputs / JSON)
                                  - gemini-3.8-live  (Bidi WebSocket リアルタイム音声対話)
```

---

## 2. ディレクトリ構造

過剰なファイル分割を避け、Next.js 15 App Router に準拠したシンプルかつ堅牢な構造を採用します。

```
ai-interviewer/
├── .github/
│   └── workflows/
│       └── main.yml                  # CIパイプライン (Lint, Typecheck, Test, Build)
├── prisma/
│   ├── schema.prisma                 # データベーススキーマ定義
│   └── migrations/                   # マイグレーション履歴
├── public/
│   ├── ogp.png                       # 1200x630 OGP画像 (SNS用)
│   ├── favicon.ico
│   └── audio-processor.js            # AudioWorklet (低遅延PCM音声処理)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx        # ログイン画面 (Email, Google, Passkey)
│   │   │   └── register/page.tsx     # 新規登録画面
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts# Better Auth エンドポイント
│   │   │   ├── analyze-company/route.ts # 企業URL解析＆ペルソナ生成 API
│   │   │   ├── feedback/route.ts     # 面接終了後フィードバック生成・取得 API
│   │   │   └── interviews/
│   │   │       ├── route.ts          # 面接セッション一覧・作成
│   │   │       ├── [id]/route.ts     # 面接詳細・更新・削除
│   │   │       └── sync/route.ts     # IndexedDBからのゲスト履歴マージ API
│   │   ├── interview/
│   │   │   ├── setup/page.tsx        # 企業情報・面接フェーズ入力画面
│   │   │   ├── room/[id]/page.tsx    # リアルタイム面接対話画面
│   │   │   └── feedback/[id]/page.tsx# 5軸評価・改善対比レポート画面
│   │   ├── history/page.tsx          # 面接履歴一覧 (IndexedDB / DBマージ表示)
│   │   ├── layout.tsx                # ルートレイアウト (Meta, Header, Footer)
│   │   └── page.tsx                  # ランディングページ (Hero, 特徴, CTA)
│   ├── components/
│   │   ├── interview/
│   │   │   ├── AudioVisualizer.tsx   # Canvas音声波形アニメーション
│   │   │   ├── LiveCaptions.tsx      # リアルタイム字幕 (ON/OFF切替可能)
│   │   │   ├── InterviewTimer.tsx    # 経過時間タイマー (最大15分制限表示)
│   │   │   └── InterviewControls.tsx # マイクミュート、強制終了、設定ボタン
│   │   ├── feedback/
│   │   │   ├── RadarScoreChart.tsx   # 5軸評価レーダーチャート
│   │   │   ├── TurnByTurnReview.tsx  # 学生発言と面接官懸念・改善例の対比UI
│   │   │   └── FollowUpReview.tsx    # 深掘り質問耐性レビュー
│   │   ├── auth/
│   │   │   └── PasskeyManager.tsx    # パスキー登録・生体認証ボタン
│   │   └── ui/
│   │       ├── Navbar.tsx            # ナビゲーションバー
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       └── Modal.tsx
│   ├── lib/
│   │   ├── auth.ts                   # Better Auth 設定 (Prismaアダプタ, Passkey)
│   │   ├── auth-client.ts            # Better Auth クライアント側フック
│   │   ├── prisma.ts                 # PrismaClient シングルトン
│   │   ├── ssrf.ts                   # SSRF完全防御スクレイパー (DNS/IP検証)
│   │   ├── gemini-flash.ts           # gemini-3.8-flash (ペルソナ・評価 JSON Schema)
│   │   ├── gemini-live-proxy.ts      # Gemini Live API への WebSocket 接続中継
│   │   ├── db-indexed.ts             # Dexie.js (ブラウザIndexedDBラッパー)
│   │   └── sync-service.ts           # IndexedDB -> サーバーDB 同期ロジック
│   ├── server/
│   │   └── ws-server.ts              # WebSocketサーバー本体 (セッション認証 & 中継)
│   └── types/
│       ├── interview.ts              # セッション、ペルソナ型定義
│       └── feedback.ts               # フィードバックJSON Schema型定義
├── tests/
│   ├── ssrf.test.ts                  # SSRF防御バリデータの単体テスト
│   ├── auth.test.ts                  # 認証および認可ロジックテスト
│   ├── feedback-schema.test.ts       # Structured Outputs スキーマテスト
│   └── sync.test.ts                  # IndexedDBマージロジックテスト
├── server.ts                         # Node.js カスタムHTTP & WSサーバー
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml                      # Docker Compose 設定 (unless-stopped)
├── Dockerfile                        # マルチステージビルド (node:20-alpine / USER node)
├── LICENSE                           # MIT License ("じゅーかきん")
├── package.json
├── README.md
├── DEPLOYMENT_GUIDE_LOCAL.md         # 実環境用デプロイ手順書
├── DEPLOYMENT_GUIDE.md               # GitHub公開用汎用デプロイ手順書
└── SESSION_HISTORY.md                # セッション作業履歴
```

---

## 3. データベーススキーマ設計 (Prisma)

開発環境は `SQLite`、本番環境は `PostgreSQL` に移行可能な汎用データ型を採用します。

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ------------------------------------------------------
// ユーザー・認証モデル (Better Auth 互換 + Passkey)
// ------------------------------------------------------
model User {
  id            String             @id @default(cuid())
  name          String
  email         String             @unique
  emailVerified Boolean            @default(false)
  image         String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  sessions      Session[]
  accounts      Account[]
  passkeys      Passkey[]
  interviews    InterviewSession[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?   // Email/Password認証用ハッシュ (Argon2 / bcrypt)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verifications")
}

model Passkey {
  id           String   @id @default(cuid())
  userId       String
  name         String?
  publicKey    String   // Base64エンコード公開鍵
  credentialID String   @unique
  counter      Int      @default(0)
  deviceType   String?
  backedUp     Boolean  @default(false)
  transports   String?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("passkeys")
}

// ------------------------------------------------------
// 面接セッション & フィードバックモデル
// ------------------------------------------------------
enum InterviewPhase {
  FIRST_HR           // 1次: 人事面接 (コミュニケーション・ガクチカ重視)
  SECOND_MANAGER     // 2次: 現場リーダー面接 (スキル・再現性・事業理解重視)
  FINAL_EXECUTIVE    // 最終: 役員・社長面接 (カルチャーフィット・理念共感重視)
}

enum InterviewStatus {
  SETUP              // 企業解析完了・開始待ち
  IN_PROGRESS        // 面接実施中
  COMPLETED          // 正常終了・フィードバック生成済み
  ABORTED            // 中断
}

model InterviewSession {
  id                 String           @id @default(cuid())
  userId             String?          // ログイン時のみ紐付け (未ログイン時はnull)
  guestToken         String?          // ゲスト識別用ハッシュ
  companyName        String
  targetUrl          String?
  targetRole         String           // 応募職種 (例: 総合職, ソフトウェアエンジニア)
  interviewPhase     InterviewPhase   @default(FIRST_HR)
  jobDescription     String?          // 求人票テキスト
  studentProfile     String?          // 自己PR・ガクチカ
  
  // 企業解析 & 面接官ペルソナ情報 (JSON)
  companyAnalysis    String?          // スクレイピング要約・企業カルチャー・課題
  personaInstruction String?          // Gemini Live API用のSystem Instruction
  
  // 面接ログ
  transcript         String?          // 発話履歴 JSON [{ role: "interviewer"|"user", text: string, timestamp: number }]
  durationSeconds    Int              @default(0)
  status             InterviewStatus  @default(SETUP)
  
  feedbackReport     FeedbackReport?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  user               User?            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([guestToken])
  @@map("interview_sessions")
}

model FeedbackReport {
  id                 String           @id @default(cuid())
  interviewSessionId String           @unique
  overallGrade       String           // S, A, B, C
  
  // レーダーチャート用 5軸スコア (0〜100)
  scoreLogical       Int              // 論理的思考力
  scoreCompanyFit    Int              // 企業理解度・志望度
  scoreInitiative    Int              // 主体性・再現性
  scoreCommunication Int              // コミュニケーション・結論ファースト
  scoreCultureFit    Int              // カルチャーフィット度
  
  overallSummary     String           // 総合講評
  detailedReviews    String           // JSON: 回答別の改善提案 [{ question, studentAnswer, shallowReason, interviewerConcern, betterAnswer }]
  followUpResistance String           // JSON: 深掘り耐性レビュー (Why/Howの追求に対する一貫性)
  
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  interviewSession   InterviewSession @relation(fields: [interviewSessionId], references: [id], onDelete: Cascade)

  @@map("feedback_reports")
}
```

---

## 4. APIエンドポイントおよびWebSocket設計

### 4.1 REST API エンドポイント

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| `POST` | `/api/analyze-company` | 不要（ゲスト可） | 企業URL・求人票を解析し、ペルソナを生成してセッションを作成 |
| `POST` | `/api/feedback/generate` | 不要（セッション所有者） | 面接ログをもとに `gemini-3.8-flash` で5軸評価を生成 |
| `GET` | `/api/interviews` | 要ログイン | ユーザーの面接セッション一覧取得（N+1防止 include） |
| `GET` | `/api/interviews/[id]` | 任意（所有者検証） | 面接詳細およびフィードバックの取得 |
| `POST` | `/api/interviews/sync` | 要ログイン | IndexedDBのゲストセッションをユーザーアカウントにマージ |
| `ALL` | `/api/auth/[...all]` | - | Better Auth（Email/PW, Google, Passkey）ハンドラ |

### 4.2 WebSocket エンドポイント (`/api/live-interview`)

- **URL**: `ws://<host>:<port>/api/live-interview?sessionId=<sessionId>&guestToken=<guestToken>`
- **接続フロー**:
  1. クライアントがセッションIDを伴って接続。
  2. サーバー側でDBの `InterviewSession` を検証（認可チェック）。
  3. サーバーが Google AI Studio の Gemini Live API (`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`) に対し、バックエンドからセキュアに接続（`GEMINI_API_KEY` をサーバーサイドからのみ付与）。
  4. 初期設定メッセージ（`BidiGenerateContentSetup`）にて、モデル名 `gemini-3.8-live`、音声出力設定（PCM 24kHz）、および動的生成された `personaInstruction` を注入。
  5. 双方向ストリーミング:
     - **Client -> Server -> Gemini**: マイクPCM 16kHz音声チャンク (`realtimeInput`)
     - **Gemini -> Server -> Client**: 面接官音声PCM 24kHzチャンク (`serverContent`) + リアルタイム文字起こしテキスト
  6. 終了時: クライアントまたは時間制限（15分）到達時にセッションをクローズし、サーバー側でトランスクリプト全体をDBに保存。

---

## 5. 防御的セキュリティ設計

### 5.1 SSRF (Server-Side Request Forgery) 完全防御
ユーザーが入力したURLを安全にスクレイピングするため、多層防御を施します：
1. **プロトコル検証**: `http:` または `https:` のみ許可（`file:`, `gopher:`, `ftp:` 等は即時拒絶）。
2. **DNS事前解決 & IPアドレス判定**:
   - `dns.promises.lookup` で全A/AAAAレコードを取得。
   - 解決されたIPが以下のプライベート・予約済みアドレス空間に該当する場合は即時エラー：
     - `127.0.0.0/8` (Loopback)
     - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (プライベートIP)
     - `169.254.0.0/16` (リンクローカル / クラウドメタデータ `169.254.169.254`)
     - `0.0.0.0/8`, `100.64.0.0/10` (CGNAT), `198.18.0.0/15`, `224.0.0.0/4` (マルチキャスト)
     - `::1` (IPv6 Loopback), `fc00::/7` (Unique Local), `fe80::/10` (Link Local)
3. **リクエスト制限**:
   - タイムアウト: 5秒厳格適用。
   - 最大レスポンスサイズ: 2MB（Streamで受信し超過時は直ちにAbort）。
   - リダイレクト処理時もリダイレクト先ホストに対して同一のIP検証を反復実行。

### 5.2 APIキー秘匿とレート制限（Free Tier保護）
- クライアント側環境変数（`NEXT_PUBLIC_`）にAPIキーを含めない。
- 1セッション最大面接時間を15分に制限（タイマー経過で自動切断）。
- 1日あたりのセッション生成数制限（同一IP/ユーザーあたり5回/日）。
- Gemini API エラー（HTTP 429）発生時の Exponential Backoff およびフロントエンドへの明確なエラー通知。

### 5.3 認可制御とデータ保護
- 他ユーザーのセッション・フィードバック閲覧を防止するため、`userId` または `guestToken` の照合を必須化。
- パスワードは強固なハッシュ化アルゴリズムを適用。
- Cookie は `HttpOnly`, `Secure`, `SameSite=Lax` を徹底。

---

## 6. IndexedDB + DB ハイブリッド履歴管理

| 状態 | 保存先 | 同期タイミング |
|---|---|---|
| **未ログイン (ゲスト)** | ブラウザ **IndexedDB** (`Dexie.js`) | 即時ローカル保存 |
| **ログイン完了時** | IndexedDB から サーバー **SQLite/Postgres** | ログイン/新規登録直後に `/api/interviews/sync` を実行してマージ |
| **ログイン中** | サーバー **SQLite/Postgres** | 面接完了時に即時サーバーDBへ永続化 |

---

## 7. デプロイおよび公開構成（ユーザー承認待ち事項）

Antigravity行動規範に従い、サーバーの内部ポートおよび公開形態を事前提案します。

1. **ホスト側内部バインドポート候補**:
   - 候補A: **`3080`** (推奨: Next.js + WS 統合カスタムサーバー用)
   - 候補B: **`8080`**
   - ※ `127.0.0.1:<候補ポート>:3000` にバインドします。

2. **公開形態の選択**:
   - **パターンA: サブディレクトリ公開**
     - URL: `https://zyuuuukak1n.dev/tools/ai-interviewer/`
     - 設定: Apache2 リバースプロキシ (`/tools/ai-interviewer/` -> `http://127.0.0.1:<承認ポート>/`)
   - **パターンB: サブドメイン公開**
     - URL: `https://ai-interviewer.zyuuuukak1n.dev/`
     - 設定: Apache2 VirtualHost + Cloudflare Tunnel Public Hostname 登録

