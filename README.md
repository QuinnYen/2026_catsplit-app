# 貓咪分帳 CatSplit

> LINE LIFF 分帳應用程式，讓朋友之間的費用分攤變得簡單輕鬆。

---

## 功能

- 建立分帳群組，支援圖示與底色選擇
- 透過邀請連結加入群組
- 新增費用並記錄誰付款、金額、備註
- 自動計算每位成員的應付金額
- 結算功能，清楚顯示誰欠誰多少錢
- 透過 LINE LIFF 整合，直接在 LINE 內使用

## 技術棧

- **Frontend** — React 19 + Vite + Tailwind CSS
- **Database** — Firebase Firestore
- **Auth** — LINE LIFF SDK
- **Hosting** — Firebase Hosting

## 開發環境設定

### 1. 安裝套件

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env`，填入對應的值：

```bash
cp .env.example .env
```

```env
VITE_LIFF_ID=你的 LINE LIFF ID
VITE_TOKEN_EXCHANGE_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_APPCHECK_SITE_KEY=   # 選填，reCAPTCHA v3 site key；沒設定則不啟用 App Check
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

## 部署

```bash
npm run build
firebase deploy
```

## 安全與維運

上線時已做的防護，以及之後修改時要注意的地方。

### 存取控制

- **Firestore / Storage rules 是唯一的存取防線**（`firestore.rules`、`storage.rules`），推送到 `main` 時由 CI 一併部署。改 rules 後請用兩個帳號實測：加入、退出、建立者移除成員、改暱稱。
- 群組成員名單只能減少一人（本人退出，或建立者移除他人）；新增成員只能由本人加入，上限 50 人。
- **收據圖片受 rules 保護**：Firestore 只存 `receiptPath`（Storage 路徑），顯示時用 `getBlob()` 以登入身分下載。**不要改回 `getDownloadURL()` 並存進資料庫**，帶 token 的網址會繞過 rules，任何拿到網址的人都能看。群組封面仍使用帶 token 的網址（敏感度低）。

### Storage CORS

`getBlob()` 需要 bucket 設定 CORS，設定內容在 `storage-cors.json`，不會隨部署更新，需手動套用：

```bash
gcloud storage buckets update gs://catsplit-app.firebasestorage.app --cors-file=storage-cors.json
```

### 綁定正式網域時要一起改

1. `functions/index.js` 的 `ALLOWED_ORIGINS`
2. `storage-cors.json`，並重新執行上面的指令
3. LINE Developers 後台的 LIFF Endpoint URL 與 LINE Login Callback URL

### 備份與用量

- Firestore 已開啟時間點復原（PITR，保留 7 天）。**Storage 的收據圖片沒有備份**。
- Google Cloud 已設預算警示。
- Cloud Functions（`lineLogin`、`verifyLiffToken`）為公開端點，已設 `maxInstances: 5`。

### 分帳計算

- 四捨五入的尾差歸付款人（付款人不在分攤名單時歸第一位成員），確保各人份額總和等於總額。邏輯在 `applyExchangeRate`。
- `npm test` 可跑 `expenseHelpers` 的單元測試。

### 已知取捨與未完成

- 已知漏洞：`@grpc/grpc-js`（firebase 間接相依，僅 Node 端使用，瀏覽器不載入）與 functions 的 `uuid`（邊界檢查，不受影響）。待上游更新後再升級。
- App Check 尚未啟用（程式已就緒，需 site key）；啟用後先只看 metrics，確認正常流量都帶 token 再 enforce。
- 尚未接前端錯誤監控。
- 每人可建立的群組數無法只靠 rules 限制，目前不限。

## 專案結構

```
src/
├── components/     # 共用元件
├── config/         # Firebase、LIFF 設定
├── context/        # React Context（全域狀態）
├── pages/          # 各頁面元件
└── assets/         # 圖片資源
```
