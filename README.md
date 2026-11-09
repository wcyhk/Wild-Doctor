# Wild Doctor · 植物探索手記

以日系動漫自然探索為視覺主題的植物辨識網頁，支援電腦與手機。原有 2018 年專案已重寫，移除 jQuery／Material Design Lite 前端依賴；瀏覽器 ES modules 與 Node.js 24 原生 HTTP 服務，無第三方執行期套件。

- JPEG／PNG 相片或後置鏡頭拍照；來源相片上限 20 MB。
- 瀏覽器重新編碼及縮小至最長邊 1600 px，過長相片以留白保留全部構圖，符合供應商 3:1 比例。
- 先預覽、明確同意才傳送，獨立進度狀態、錯誤提示及取消等候。取消等候無法撤回已送出的供應商請求。
- 候選名稱、相似分數、百科說明及維基百科搜尋；所有文字以安全 DOM API 呈現。
- 本次探索結果名稱只留在頁面記憶體，重新載入即清除；不存相片、定位或帳戶。
- 拍照後、切換到背景或離開頁面即停止鏡頭。

## 使用與部署

網站：https://wild-doctor-wcyhk.onrender.com/

使用 Node.js 24 或以上：`npm ci`、`npm test`、`npm start`。預設連接埠 3000；Render 會提供 PORT。

GitHub Pages 托管靜態介面；config.js 只有公開 API 網址。Render 使用 master 分支，`npm ci --omit=dev`、`npm start`。詳見 [部署說明](DEPLOYMENT.md)。

真正辨識需要 BAIDU_API_KEY 及 BAIDU_SECRET_KEY，僅放 Render 環境變數，不放 GitHub／前端／聊天。`/api/status` configured=true 只代表存在設定，須真實相片測試才能確認權限與額度。

## 資料與限制

相片經本站後端傳往百度植物辨識 API，本站不保存相片、不記錄相片內容。名稱及百科說明保留供應商原文，相似分數不是鑑定正確率。結果只供學習，切勿用作食用或醫療判斷。

官方 API：https://cloud.baidu.com/doc/IMAGERECOGNITION/s/Mk3bcxe9i

預設每程序每日最多 100 次；服務重啟會重設，此限制不是費用硬上限，請在百度另設用量限制。歷史版本可能有已曝光的舊金鑰，請在供應商後台撤銷，不應沿用。

## 素材

首頁插圖為 WCY.HK STUDIO 原創動漫概念圖。既有 images/header-bg.jpg（Pixabay）保留作非私人植物測試照片。其餘 legacy vendor／images 為舊版本素材，現行介面沒有載入外部 UI 函式庫。

2018–2026 WCY.HK STUDIO，保留原專案版權。
