# Danh Sách Công Việc Triển Khai App Desktop Dịch Game RPGMaker (Phase 1)

- `[/]` Khởi tạo dự án
  - `[/]` Tạo file cấu hình `package.json` cho dự án Electron
  - `[/]` Tạo file Main Process `main.js` quản lý Đa Workspace và giao tiếp IPC
- `[ ]` Phát triển giao diện người dùng (Frontend UI)
  - `[ ]` Tạo file cấu trúc chính `renderer/index.html`
  - `[ ]` Tạo file phong cách giao diện `renderer/css/style.css` (Dark Mode, Glassmorphism)
- `[ ]` Phát triển các mô-đun xử lý logic (Scripts)
  - `[ ]` Tạo file `renderer/js/app.js` quản lý Đa Workspace và chuyển Tab
  - `[ ]` Tạo file `renderer/js/settings.js` quản lý các thông số AI nâng cao
  - `[ ]` Tạo file `renderer/js/terminology.js` trích xuất và quản lý thuật ngữ/xưng hô
  - `[ ]` Tạo file `renderer/js/prompt.js` lưu trữ và xử lý Prompt Persona Hana
  - `[ ]` Tạo file `renderer/js/api.js` xử lý kết nối proxy, Streaming và Safety Settings OFF
  - `[ ]` Tạo file `renderer/js/rpgmaker.js` xử lý phân tích và lắp ráp file JSON RPGMaker
- `[ ]` Kiểm thử và hoàn thiện
  - `[ ]` Thực thi cài đặt thư viện (`npm install`) và chạy thử nghiệm (`npm start`)
  - `[ ]` Kiểm thử các tính năng kết nối proxy, trích xuất text và đa workspace
  - `[ ]` Tạo tài liệu tổng kết `walkthrough.md`
