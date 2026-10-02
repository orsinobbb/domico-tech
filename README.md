# 豆米口科技 DOMICO LABS

豆米口科技的靜態形象官網。網站從中小企業與品牌／行銷／文創團隊正在面對的情境出發，介紹顧問、軟體開發、AI 導入、黑客松、企業內訓與教練陪跑，並用一份不必登入的 AI 任務診斷協助訪客整理下一步。

## 本機預覽

```sh
npm run dev
```

開啟 <http://localhost:4174/>。

## 驗證

```sh
npm test
```

測試會檢查網站結構、需求健檢、聯絡路徑、靜態資源與 GitHub Pages 部署契約。

## 專案結構

- `index.html`：頁面內容、服務與行銷漏斗
- `styles.css`：視覺系統與響應式版面
- `src/assessment.js`：需求健檢題目與結果判斷
- `src/contact.js`：依訪客狀況排序聯絡方式
- `src/config.js`：Email、LINE 與預約連結設定
- `src/funnel-content.js`：雙受眾文案、合作階段、證據與任務卡內容
- `src/journey.js`：診斷旅程的狀態轉換
- `src/views.js`：安全跳脫後的畫面片段
- `src/attribution.js`：來源參數清理與工作階段保存
- `src/funnel-events.js`：不含個資的漏斗事件契約
- `src/storage.js`：僅存於訪客瀏覽器的回答狀態
- `images/roles/`：小米的五種任務角色圖
- `test/`：Node 內建測試

## 聯絡方式設定

Email 預設為 `hello@domicotaiwan.com`，即使沒有 JavaScript 也能使用。LINE 官方帳號與 Google 預約尚未取得正式公開網址前維持空白；只有網址為有效 HTTPS、已完成實機測試且確定能公開使用後，才填入 `src/config.js`。網站會自動隱藏空白、非 HTTPS 或無效的外部按鈕並回退到 Email。

## 診斷與隱私邊界

診斷版本為 v2，共七題，順序固定為 `audience`、`process`、`frequency`、`impact`、`tools`、`role`、`timeline`。回答只保存在使用者瀏覽器的 `localStorage`；舊版、不完整或損壞的資料會安全回到空白 v2。使用者主動點選 Email 前，不收集姓名、Email、電話或自由文字。

來源只接受 `utm_source`、`utm_medium`、`utm_campaign`、`utm_content`、`utm_term`，清理後暫存在 `sessionStorage`。目前事件只在頁面內以 `CustomEvent` 發送，不會傳送到第三方，也不載入第三方分析服務。

漏斗事件名稱固定為：

- `audience_selected`
- `assessment_started`
- `assessment_completed`
- `task_card_copied`
- `proof_opened`
- `contact_selected`

事件資料只允許受眾、問題、服務、名單成熟度、聯絡渠道、證據項目、題目與步驟等非個資欄位；不得加入姓名、Email、電話、摘要或自由文字。

## 發布

正式網址為 <https://tech.domicotaiwan.com/>，使用 GitHub Pages 發布。網站全部使用相對資源路徑，可在自訂網域根目錄運作；Cloudflare DNS 使用 `tech` CNAME 指向 `orsinobbb.github.io`，並由根目錄的 `CNAME` 固定 Pages 自訂網域。

發布前應確認：

1. `npm test` 全部通過。
2. 1440px、390px、320px 三種寬度沒有橫向溢出。
3. 五張角色圖皆可載入，且沒有瀏覽器錯誤。
4. Email 可開啟郵件程式；LINE 與預約連結只在正式可用時顯示。
5. 首頁與需求健檢的鍵盤操作、焦點樣式、減少動態效果偏好皆正常。

## 內容原則

- 內容誠信優先：不虛構客戶、數字、推薦語或合作標誌。
- 說清楚適合情境、交付成果、不適合情境與下一步。
- 案例若來自本專案，明確標示為示範交付物。
- 真實案例公開前，逐一核對成果、可揭露資訊與授權；無授權時保持匿名或下架。
- 豆米口科技使用小米作為主形象；完整 IP 故事回到豆米口文創官網。
