# Wild Doctor 復修版

網站支援選擇 JPEG／PNG 相片，以及使用現代瀏覽器鏡頭拍照。照片只在送出辨識時傳至百度；本站不儲存照片、不記錄照片內容。植物結果只供學習與探索。

## 本機啟動

使用 Node.js 22 或以上版本，執行 `npm ci`、`npm test` 及 `npm start`，開啟 `http://localhost:3000`。

## Render 服務

使用 `master` 分支，Node.js 24，建置指令 `npm ci --omit=dev`，啟動指令 `npm start`。程式使用平台提供的 `PORT`，並監聽 `0.0.0.0`。

在服務的 Environment 頁加入 `BAIDU_API_KEY` 與 `BAIDU_SECRET_KEY`，使用具備植物辨識權限的新金鑰。不要放入 GitHub、前端設定檔或聊天訊息。儲存並部署後，`/api/status` 的 `configured` 才會變成 `true`；這只代表已設定金鑰，仍需一次實際圖片辨識確認 API 權限及額度。

舊版程式碼中的金鑰已移除。歷史提交仍可能保留舊金鑰，應在百度後台撤銷並換發，不應繼續使用。

網站預設每個服務程序每日最多發出 100 次辨識請求，可使用 `DAILY_REQUEST_LIMIT` 調整；服務重啟會重設計數。這不是供應商的費用上限，請同時在百度控制台設定可接受的額度或用量限制。

GitHub Pages 只負責靜態介面，`config.js` 只保存公開服務網址。API 金鑰始終在伺服器環境中。
