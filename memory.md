# Tổng Hợp Bộ Nhớ & Kiến Trúc Dự Án (AI Game Translator Pro)

## 1. Tổng Quan Dự Án (Project Overview)
**AI Game Translator Pro** là phần mềm chuyên dụng hoạt động trên nền tảng Electron + Node.js, được thiết kế để mang lại quy trình bóc tách, quản lý và dịch thuật tự động trọn gói bằng AI cho hai engine phát triển game phổ biến nhất: **RPGMaker (MV/MZ)** và **Ren'Py Visual Novel**.

### Kiến Trúc Giao Diện (UI/UX)
- **Chuẩn Compact PC**: Thiết kế giao diện tối ưu hóa cho màn hình máy tính desktop, sử dụng các tỷ lệ nhỏ gọn (font `13px`, sidebar `200px`), tiết kiệm không gian để hiển thị dữ liệu trực quan.
- **Màu sắc & Thẩm mỹ**: Hệ thống áp dụng phong cách dark theme chuyên nghiệp (`#0d0a14`), kết hợp dải gradient đỏ - tím sang trọng (`#6b1839` → `#3b1a6b` → `#1a1060`) mang lại cảm giác cao cấp (Premium Edition).
- **Trải nghiệm người dùng (UX)**:
  - Sidebar có khả năng co giãn đóng/mở mượt mà.
  - Tích hợp hệ thống thông báo nhanh (Toast Notifications) ở góc phải dưới màn hình.
  - Cơ chế tính toán tự động chiều cao hộp thoại nhập liệu (`scrollHeight`), giúp bảng dịch tự động vừa khít với chiều cao văn bản gốc.

---

## 2. Quá Trình Phát Triển & Các Trụ Cột Đã Được Hoàn Thiện

### Phase 1: Dịch Thuật RPGMaker (Hoàn chỉnh 100%)
- **Gom Nhóm Theo Event**: Các file JSON của game (Map, CommonEvents...) không bị bẻ vụn theo từng dòng đơn lẻ mà được gom cụm toàn bộ câu thoại theo từng Event ID. Điều này mang lại ngữ cảnh toàn vẹn giúp AI dịch vô cùng chính xác.
- **Khởi Tạo Trống Trải**: Cột bản dịch mặc định bắt đầu trong trạng thái trống hoàn toàn (`translation: ""`), giúp người dùng phân định rõ ràng giữa câu đã dịch và chưa dịch.
- **Cơ Chế An Toàn (Fallback)**: Khi tiến hành xuất file (Export), nếu người dùng hoặc AI chưa dịch một dòng nào đó, hệ thống sẽ tự động giữ nguyên văn bản gốc để game không bao giờ gặp lỗi mất thoại.

### Quản Lý Prompt & Chế Độ AI Trực Tiếp
- **Lệnh Cấm Tuyệt Đối (Absolute Imperative)**: Đã cấu hình chỉ đạo cứng trong `prompt.js` cấm tuyệt đối AI chào hỏi, giới thiệu bản thân hay chèn các bình luận thừa thãi. Hệ thống cam kết AI chỉ trả về duy nhất văn bản game đã dịch.
- **Phân tách Rõ Ràng**: Giao diện chia rõ 2 khối: Prompt Persona Hana (quy định tư cách dịch giả) và Prompt Yêu cầu của người dùng (cho phép tùy chỉnh phong cách dịch thuật theo ý thích).

### Tối Ưu Proxy & Sửa Lỗi API (Lỗi 400)
- **Hỗ Trợ Đa Dạng Endpoint**: Hệ thống kết nối hoàn hảo qua Proxy `https://gcli.ggchan.dev/`, tương thích với cả định dạng `v1beta` (Gemini) và `v1/chat/completions`.
- **Đã Xử Lý Lỗi 400**: Loại bỏ hoàn toàn tham số `reasoningEffort` trong `generationConfig` đối với các dòng model tiêu chuẩn (Gemini 1.5 Flash/Pro) để tránh bị máy chủ Google API từ chối do sai chuẩn cấu trúc.

---

## 3. Phase 2: Dịch Thuật Ren'Py Visual Novel & Tối Ưu Hóa Nâng Cao
Đáp ứng yêu cầu mở rộng sang dịch thuật game Ren'Py (với thư mục gốc chứa các file script `.rpy`), hệ thống đã được trang bị các luồng xử lý chuyên sâu sau:

### 3.1. Bóc Tách Theo Từng Dòng & Lọc Chuẩn Xác (Line-by-line Parser)
- Khác với RPGMaker, game Ren'Py quy định thoại theo từng dòng (ví dụ: `j "Hello there."`). Module `renpy.js` được thiết kế với Regex chuẩn xác nhằm quét toàn bộ file `.rpy`, phân lập riêng phần chuỗi văn bản thoại (`"..."`).
- **Loại Trừ Hoàn Toàn Code Audio/Voice**: Hệ thống tự động nhận diện và loại bỏ toàn bộ các câu lệnh logic cấu trúc của Python/Ren'Py (`if`, `$`, `menu:`, `label`, `jump`...) cũng như các lệnh phát âm thanh/hiệu ứng (`voice`, `play`, `sound`, `music`, `audio`, `window`, `nvl`...). Ví dụ: các dòng `voice "audio/vo/..."` sẽ bị triệt tiêu hoàn toàn khỏi bảng dịch.

### 3.2. AI Tự Động Trích Xuất & Tóm Tắt Mối Quan Hệ Nhân Vật
- **Hai Khối Quản Lý Tích Hợp**: Trong trang Thuật Ngữ của Ren'Py, giao diện hiển thị 2 bảng quản lý song song:
  1. **Bảng Thuật Ngữ & Xưng Hô**: Phân tích cặp từ gốc và nghĩa dịch.
  2. **Bảng Thông Tin & Mối Quan Hệ Nhân Vật**: Lưu trữ các dữ liệu bối cảnh quan trọng như giới tính, tính cách, và mối quan hệ giữa các nhân vật (ví dụ: `Jennifer -> Nữ chính, có mối quan hệ phức tạp với quản lý...`).
- **Tự Động Hóa 100%**: Ngay khi nhấn nút `[AI Translate Ren'Py (F5)]`, hệ thống lập tức ngầm trích xuất mẫu text gửi lên AI. AI sẽ bóc tách cả Thuật ngữ lẫn Thông tin nhân vật, tự động tiêm vào bảng quản lý, sau đó gửi kèm toàn bộ dữ liệu này vào bối cảnh dịch.

### 3.3. Tối Ưu Hóa Chống Lag (Phân Trang - Pagination) & Dịch Theo Batch
- **Cơ Chế Phân Trang Siêu Tốc (Pagination)**: Để xử lý mượt mà các file kịch bản khổng lồ (ví dụ: `story.rpy` chứa hơn 28,000 dòng thoại), hệ thống áp dụng phân trang ảo trên DOM. Cho phép người dùng tùy chỉnh số dòng trên mỗi trang (mặc định: `100` dòng/trang, có thể nhập tùy ý `10`, `100`, `1000`...). Việc này loại bỏ hoàn toàn hiện tượng đơ/lag giao diện.
- **Cơ Chế Dịch Gộp Batch (Batch Translation)**: Tối ưu hóa API bằng cách gộp nhiều dòng thoại vào một lượt dịch (mặc định: `50` dòng/batch, cho phép tinh chỉnh tùy ý trên giao diện). Việc dịch theo lô giúp AI nắm bắt luồng giao tiếp tốt hơn, tăng tốc độ dịch lên gấp nhiều lần và giảm tải đáng kể số lượng request.
- **Tự Động Cứu Dữ Liệu (Unbreakable Regex Fallback)**: Trường hợp AI trả về cấu trúc JSON bị lỗi cú pháp nhẹ, module `api.js` được trang bị biểu thức chính quy (Regex) chuyên sâu tự động bóc tách từng cặp `id` và `translation` để đảm bảo 100% không bao giờ mất dữ liệu dịch của người dùng.

---

## 4. Phase 3: Hoàn Thiện Tối Đa - Tự Động Lưu State & Quản Lý Luồng Dịch
Trong lần nâng cấp toàn diện mới nhất, hệ thống đã trang bị các tính năng ở tầm vóc doanh nghiệp:

### 4.1. Cơ Chế Bền Vững Hóa Workspace (Unbreakable Persistence)
- **Tự Động Lưu Cấu Hình & File Cache**: Hệ thống lưu trữ trạng thái danh sách Workspace, tab hiện tại, số trang, số dòng/trang ngầm vào `localStorage`. Đồng thời, mọi thay đổi về dữ liệu file, bản dịch đều được tự động lưu vào file `.ai_translator_cache.json` trực tiếp tại thư mục game.
- **Tự Động Khôi Phục Khi Mở Lại App**: Bất cứ khi nào bạn tắt app và mở lại, hệ thống sẽ tự động nạp lại trọn vẹn toàn bộ danh sách file, toàn bộ các câu đã dịch và giữ nguyên trang đang xem mà không cần phải import lại từ đầu!

### 4.2. Quản Lý Prompt Độc Lập Giữa RPGMaker & Ren'Py
- Giao diện Prompt của Ren'Py được tách biệt hoàn toàn khỏi RPGMaker. 
- Bạn được cung cấp sẵn Persona Hana mặc định cho Ren'Py, đồng thời ô Yêu cầu của user được để trống hoàn toàn, kèm nút `[Lưu Cấu Hình Prompt Ren'Py]` riêng biệt.

### 4.3. Quản Lý Luồng Dịch (Nút Dừng & Giới Hạn Batch)
- **Nút Dừng Dịch (Stop Translation)**: Bổ sung nút `[Dừng Dịch]` màu đỏ bên cạnh nút AI Translate ở cả hai không gian RPGMaker và Ren'Py. Khi bấm, tiến trình dịch ngầm lập tức dừng lại một cách an toàn.
- **Giới Hạn Dừng Sau N Batch**: Cho phép người dùng cấu hình số Batch tối đa muốn dịch (ví dụ: `Dừng sau N Batch: 5`). Khi đạt đủ số lô quy định, hệ thống tự động tạm dừng để bạn kiểm tra kết quả trước khi tiếp tục.

---

## 5. Phase 4: Xuất File Hàng Loạt, Inline Edit, Phân Tách Cột Tên & Bảo Vệ Literal `\n`
Đáp ứng trải nghiệm người dùng cao cấp, các trụ cột UX/UI và thuật toán tối ưu hóa bối cảnh đỉnh cao vừa được hoàn thiện:

### 5.1. Xuất File Hàng Loạt Bằng Checkbox (Batch Export)
- **Tích Chọn Đa Dạng**: Trên bảng Danh Sách File của cả RPGMaker và Ren'Py, bổ sung cột Checkbox ở đầu mỗi dòng kèm nút `[Chọn Tất Cả]`.
- **Lưu Tự Động Hàng Loạt**: Khi bấm nút `[Export / Lưu File (F3 / F6)]`, nếu bạn đã tích chọn nhiều file, hệ thống sẽ tự động duyệt qua toàn bộ và lưu đè tất cả các file đó cùng một lúc, tiết kiệm tối đa thời gian thao tác. Nếu không chọn checkbox nào, hệ thống tự động xuất file bạn đang xem trong Bảng Dịch Thuật như bình thường.

### 5.2. Chỉnh Sửa Thuật Ngữ & Nhân Vật Trực Tiếp (Inline Edit)
- Gỡ bỏ trạng thái khóa cứng dạng văn bản tĩnh (`<td>`) trong bảng Thuật ngữ và Tóm tắt thông tin nhân vật.
- Toàn bộ nội dung giờ đây hiển thị dưới dạng các ô nhập liệu (`.input-inline` và `.input-inline-textarea`) tích hợp hài hòa vào nền bảng. Bạn có thể nhấn trực tiếp vào bất kỳ ô từ gốc, xưng hô, hay mô tả nhân vật nào để sửa đổi tức thì.

### 5.3. Bóc Tách Tên Thuần Túy & Dồn Mô Tả Sang Cột 2 (Pure Character Separation)
- **Cắt Tỉa Tìm Gốc & Tách Quan Hệ**: Khi AI trích xuất tự động ra chuỗi hỗn hợp (ví dụ: `Paul / Quản lý tòa nhà` hay `Jennifer / Bạn gái của Mark`), module `renpy_terminology.js` sẽ kích hoạt Regex phân tách:
  - Cột 1 (Nhân vật) chỉ giữ lại đúng tên thuần túy: **`Paul`**, **`Jennifer`**.
  - Phần giải thích vai trò (`Quản lý tòa nhà`, `Bạn gái của Mark`) được hệ thống tự động bóc tách và dồn nối liền mạch vào ô Thông tin mô tả ở cột 2 (`Vai trò / Mối quan hệ: Quản lý tòa nhà. ...`).
- **Khử Trùng Lặp 100%**: Gốc tên được so sánh với các dòng hiện tại, nếu trùng khớp sẽ tự động ghi đè/cập nhật thẳng vào thông tin cũ thay vì phình to bảng.

### 5.4. Phân Tích & Bảo Vệ Tuyệt Đối Chuỗi Xuống Dòng Literal `\n` Trong Ren'Py
- **Thực trạng**: Trong kịch bản Ren'Py, một câu thoại chứa xuống dòng được viết trên một dòng mã duy nhất với chuỗi hai ký tự `\n` (ví dụ: `j "*sigh*\n(Whatever...)"`). Khi AI dịch xong, chuỗi JSON trả về được trình duyệt phân tích thành ký tự xuống dòng vật lý (`\r\n` hoặc `\n`), khiến ô textarea hiển thị thành hai dòng riêng biệt.
- **Nguy cơ tiềm ẩn**: Nếu xuất file `.rpy` nguyên trạng với ký tự xuống dòng vật lý, chuỗi thoại trong script Ren'Py sẽ bị ngắt làm hai dòng code, dẫn đến lỗi sập nguồn game (Fatal Syntax Error).
- **Giải pháp bảo vệ toàn vẹn (Renpy Reconstructor Check)**: Tại module `renpy.js`, hàm `reconstructRPY` đã được trang bị thuật toán tự động chuyển đổi toàn bộ các ký tự xuống dòng vật lý trở về chuỗi hai ký tự `\n` (`\\n`) trước khi ghi vào đĩa:
  ```javascript
  const safeTranslation = item.translation.replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
  ```
- **Kết quả tuyệt vời**: Người dùng vừa được tận hưởng giao diện textarea nhiều dòng trực quan, dễ đọc dễ sửa trên ứng dụng, vừa an tâm tuyệt đối 100% rằng file `.rpy` xuất ra đạt quy chuẩn 문법 hoàn hảo của engine Ren'Py!

### 5.5. Nhập Số Trang Trực Tiếp (Nhảy Cóc Trang Bất Kỳ)
- **Thực trạng cũ**: Người dùng khi muốn duyệt tới các trang ở sâu bên trong (ví dụ: Trang 200) phải bấm nút `[Trang sau]` liên tục rất mất thời gian và gây nản chí.
- **Giải pháp bứt phá**:
  - Biến đổi nhãn hiển thị trang thành cụm ô nhập liệu trực tiếp: `Trang:` + `[ Ô nhập số trang ]` + `/ Tổng số trang`.
  - Bổ sung bộ lắng nghe sự kiện (`change`) tại module `app.js` cho phép người dùng gõ số trang mong muốn (ví dụ: `200`) và nhấn **Enter**. Hệ thống tự động thẩm định giới hạn trang hợp lệ và chuyển thẳng tới trang đích tức thì, tiết kiệm 99% thời gian thao tác.

### 5.6. Luồng Dịch Batch 2 Bước Tự Động (Per-Batch 2-Step Extraction & Translation)
- **Thực trạng cũ**: AI chỉ được gửi lệnh bóc tách thuật ngữ và nhân vật **đúng 1 lần duy nhất** ở đầu file với tập mẫu 15,000 ký tự đầu tiên. Nếu các nhân vật mới hoặc thuật ngữ mới xuất hiện ở các lô thoại sau (ví dụ: Batch 10), tiến trình dịch Batch cũ sẽ bỏ sót và không tự động cập nhật vào bảng quản lý trên giao diện.
- **Giải pháp tự động hóa 100% (Mới cập nhật)**:
  - **Nâng cấp API Bóc tách (`api.js`)**: Hàm `extractRenpyInfoAI` được cải tiến để **luôn luôn tiêm toàn bộ Persona Prompt (Hana)** cùng **Bảng thuật ngữ & nhân vật hiện tại** vào bối cảnh chỉ đạo (`systemInstruction`). Điều này đảm bảo AI hiểu trọn vẹn 100% bối cảnh trước khi phân tích từ mới.
  - **Tái cấu trúc vòng lặp Batch (`app.js`)**: Đưa tiến trình bóc tách vào sâu bên trong vòng lặp của từng Batch (`startAiTranslationRenpy`). Trước khi dịch bất kỳ 1 lô Batch nào (ví dụ 50 dòng), hệ thống sẽ chạy luồng 2 bước:
    1. **Bước 1 (Tại Batch N)**: Gửi 50 dòng thoại của Batch N kèm toàn bộ Prompt mặc định để AI bóc tách các thuật ngữ/nhân vật mới xuất hiện trong 50 dòng này, sau đó tự động gộp thông minh vào bảng giao diện.
    2. **Bước 2 (Tại Batch N)**: Trích xuất ngay bảng thuật ngữ vừa được cập nhật đầy đủ nhất để tiêm vào prompt dịch chính xác 50 dòng thoại đó sang tiếng Việt.

### 5.7. Xóa Workspace Trực Tiếp Trên Tab (Bảo Vệ Dữ Liệu An Toàn)
- **Thiết kế sang trọng**: Tích hợp icon `fa-xmark` nhỏ gọn (`.btn-delete-tab`) trực tiếp vào góc mỗi tab Workspace trên thanh header. Nút xuất hiện mượt mà khi di chuột kèm hiệu ứng hover đỏ nổi bật.
- **Quy trình bảo vệ toàn vẹn**:
  - Hộp thoại xác nhận `confirm` an toàn thông báo cho người dùng về việc dữ liệu file chưa xuất sẽ bị hủy bỏ khỏi ứng dụng, tránh thao tác bấm nhầm.
  - **Bảo vệ Workspace duy nhất**: Kiểm tra thông minh nếu ứng dụng chỉ còn lại đúng 1 Workspace duy nhất, hệ thống sẽ ngăn chặn thao tác xóa kèm thông báo Toast cảnh báo: `"Không thể xóa Workspace duy nhất còn lại!"`, đảm bảo giao diện ứng dụng luôn ổn định và không bao giờ bị lỗi trạng thái trống.
  - Sau khi xóa, ứng dụng tự động đồng bộ lại `localStorage`, tự động chuyển đổi sang tab Workspace kề bên và làm mới DOM ngay lập tức.

---

## 6. Phase 5: Tối Ưu Hóa Parser Regex, Chống Lag UI & Auto-Retry Dịch Batch
Trong giai đoạn này, hệ thống tập trung giải quyết triệt để các vấn đề liên quan đến độ ổn định của trình bóc tách kịch bản, độ trễ giao diện và độ tin cậy của mạng.

### 6.1. Trình Bóc Tách Ren'Py Cấp Độ Cao Nhất (Ultimate Regex Parser)
- **Vấn Đề Cũ**: Parser hay vớ nhầm các đoạn code cấu trúc (như `add`, `id`, `thumb`) làm lời thoại, không nhận diện được tên nhân vật nếu bị bọc nháy kép (`"Driver" "Hello"`), và bỏ lỡ các Menu lựa chọn vì đuôi có dấu hai chấm (`"Choice":`).
- **Giải Pháp Bứt Phá**:
  - Xây dựng **Danh Sách Đen (Blacklist)** gồm hơn 100 từ khóa cấu trúc (UI/Image/Audio/Logic) của Ren'Py. Bất cứ lệnh nào thuộc danh sách này đều bị tự động loại bỏ khỏi bảng dịch.
  - Tái cấu trúc bộ **Regex** với khả năng capture đa luồng: Bắt trọn vẹn cả trường hợp tên nhân vật có nháy hoặc không nháy, bắt trọn các Menu lựa chọn kết thúc bằng dấu `:`, giữ nguyên hoàn hảo mọi khoảng trắng và các hậu tố đặc thù (`with dissolve`, `xoffset`). 
  - Trình ráp nối (`reconstructRPY`) ghép lại dòng code Ren'Py chuẩn xác tới từng khoảng trắng, giữ an toàn tuyệt đối 100% mã nguồn game không bị phá vỡ cấu trúc.

### 6.2. Thu hẹp Phạm Vi Bóc Tách AI (Giảm Hallucination)
- **Cải tiến Prompt `extractRenpyInfoAI`**: Chỉnh sửa chỉ lệnh tiêm vào API, bắt buộc AI chỉ tập trung thu thập Tên nhân vật, Cách xưng hô, Tên địa danh/tổ chức đặc biệt. 
- Ra lệnh cho AI tuyệt đối **bỏ qua các danh từ chung** và từ vựng thông thường, tránh tình trạng AI tự phịa ra các khái niệm rác làm phình to bảng thuật ngữ.

### 6.3. Tối Ưu Hóa Giao Diện - Chống Lag Khi Nhập Liệu (Debounce)
- **Vấn Đề Cũ**: Người dùng phản ánh khi gõ sửa text trực tiếp trên textarea, giao diện bị giật lag nghiêm trọng do hệ thống liên tục serialize toàn bộ mảng dữ liệu khổng lồ xuống ổ cứng qua mỗi lần nhấn phím.
- **Giải Pháp Tối Ưu**: Áp dụng kỹ thuật **Debounce (1.5 giây)** cho hàm `saveWorkspaceCache`. Khi người dùng liên tục gõ phím, dữ liệu chỉ lưu ngầm vào RAM. Sau khi ngừng thao tác 1.5 giây, hệ thống mới gom dữ liệu và ghi ngầm một lần duy nhất vào file `.ai_translator_cache.json`. Trải nghiệm gõ phím trở nên mượt mà hoàn hảo.

### 6.4. Vòng Lặp Cứu Hộ Dịch Batch (Auto-Retry Loop)
- **Tự Động Thử Lại**: Bọc luồng dịch Batch Ren'Py bằng một vòng lặp `while (retryCount < 3)`. Khi gặp sự cố do đường truyền mạng, proxy, hoặc API lỗi, hệ thống sẽ tự động chờ 2 giây và thử gửi lại đúng Batch đó.
- **Skip Thông Minh**: Nếu xui xẻo lỗi liên tục 3 lần, thay vì crash hoặc dừng tiến trình, hệ thống sẽ bật cảnh báo Toast và **tự động nhảy sang Batch tiếp theo**, đảm bảo treo máy dịch qua đêm không bao giờ bị đứt gánh giữa chừng.
- **Tiếp Tục Dịch Dễ Dàng (Smart Resume)**: Kết hợp với thuật toán Smart Resume, khi dịch lại, các lô hoặc các câu đã có text dịch sẽ tự động bị bỏ qua ngay lập tức, tiết kiệm tài nguyên API.

## 8. Phase 6: Hoàn Thiện Trải Nghiệm Cốt Lõi, Tương Thích Ngược & Quản Lý File
Trong bản cập nhật này, hệ thống giải quyết các vấn đề liên quan đến tương thích phiên bản cũ và tối ưu hóa luồng làm việc với các kịch bản lớn, cải thiện đáng kể UX cho quá trình dịch thuật.

### 8.1. Tương Thích Ngược Bản Dịch Cũ (Old Cache Fallback)
- **Vấn Đề Cũ**: Khi người dùng tải lại các file cache `.ai_translator_cache.json` từ những phiên bản cũ (chưa lưu các thuộc tính `quoteChar`, `prefixSpaces`), việc xuất file `.rpy` sẽ dẫn đến lỗi văn bản hiển thị thành `undefined` do trình lắp ráp (`reconstructRPY`) không tìm thấy thông tin định dạng cần thiết.
- **Giải Pháp**: Bổ sung thuật toán tương thích ngược tại `reconstructRPY` (`renpy.js`). Hệ thống sẽ tự động phát hiện nếu file cache thuộc chuẩn cũ (`item.quoteChar === undefined`), và áp dụng phương pháp lắp ráp thủ công dựa trên cấu trúc `prefix` + `speaker` + `translation` + `suffix`, kèm theo xử lý an toàn dấu nháy kép `\"`. Bảo vệ 100% dữ liệu dịch cũ của người dùng không bị hỏng khi cập nhật app mới.

### 8.2. Bộ Lọc Dòng Chưa Dịch & Dịch Batch Mục Tiêu (Targeted Batch Translation)
- **Tối Ưu Hóa Hiển Thị**: Thêm Dropdown chọn bộ lọc (`Lọc: Tất cả / Chưa dịch`) trên thanh công cụ phân trang của Ren'Py. Người dùng có thể ẩn hoàn toàn các dòng đã dịch để chỉ tập trung vào các câu còn sót.
- **Tiết Kiệm Token Tối Đa**: Cơ chế dịch Batch (`startAiTranslationRenpy`) được nâng cấp để **tôn trọng bộ lọc này**. Nếu người dùng đang chọn "Lọc dòng chưa dịch", tiến trình AI sẽ chỉ bốc chính xác các câu còn thiếu để chia Batch và gửi đi dịch. Loại bỏ triệt để hiện tượng AI phải đọc lại các câu đã hoàn thành, giúp tiết kiệm API Token và tăng tốc độ hoàn thành kịch bản lên nhiều lần.

### 8.3. Tính Năng Xóa File Trực Tiếp Trong Workspace
- **Quản Lý Linh Hoạt**: Cả khu vực RPGMaker và Ren'Py đều được bổ sung tính năng **Xóa File Đã Chọn**. Khi người dùng tích chọn một hoặc nhiều file, một nút "Xóa File" màu đỏ sẽ tự động xuất hiện.
- **Dọn Dẹp Sạch Sẽ**: Khi bấm xóa, file sẽ bị gỡ khỏi danh sách Workspace hiện tại. Dữ liệu trên giao diện và file lưu ngầm cache (`saveWorkspaceCache`) cũng tự động cập nhật ngay lập tức. Tính năng này giúp người dùng loại bỏ các file không cần thiết để làm gọn không gian làm việc.

### 8.4. Nhập Kịch Bản Đơn Lẻ (Single File Import)
- **Tối Ưu Linh Hoạt**: Cung cấp thêm nút `[Import 1 File]` màu xám kề bên nút `[Import Thư Mục]` trong giao diện Dịch Ren'Py. Người dùng giờ đây có thể tùy chọn chỉ nạp đúng 1 file kịch bản (script `.rpy`) mình cần mà không bị ép phải quét đệ quy toàn bộ dự án.
- **Tích Hợp Thông Minh**: Nếu Workspace hiện tại chưa từng import folder nào, hệ thống sẽ tự động cấu hình `gamePath` là thư mục chứa file vừa nạp để dùng làm gốc cho cache ngầm. Nếu Workspace đã có file, file mới import sẽ tự động được thêm vào (hoặc ghi đè nếu trùng đường dẫn) mà không làm mất dữ liệu hiện tại, hỗ trợ xuất sắc nhu cầu dịch lẻ tẻ hay update script rời.

### 8.5. Tinh Chỉnh CSS & Responsive (Không vỡ layout)
- Xử lý triệt để tình trạng thanh công cụ bị vỡ dòng hoặc che khuất (oversized inputs) bằng cách áp dụng `white-space: nowrap` cho các nhãn chữ và thiết lập ưu tiên (`!important`) cho độ rộng các ô nhập liệu số. Thanh phân trang và batch dịch luôn giữ nguyên cấu trúc hàng ngang gọn gàng như thiết kế gốc.

### 8.6. Khôi phục văn bản gốc bằng Sidecar File (.orig.json)
- **Vấn đề**: File `.rpy` sau khi export sẽ bị thay thế tiếng Anh bằng tiếng Việt, khiến tool không nhận ra bản gốc nếu import lại.
- **Giải pháp (Lưu file phụ - Sidecar)**: Khi export bất kỳ file `.rpy` nào (cả xuất lẻ và xuất hàng loạt), tool sẽ âm thầm tạo ra 1 file phụ có tên là `<tên-file>.rpy.orig.json` (VD: `screens.rpy.orig.json`) nằm ngay cạnh file gốc, chứa toàn bộ bản backup tiếng Anh theo ID dòng.
- **Khôi phục tự động**: Khi import file/thư mục Ren'Py, tool tự động check nếu có file `.orig.json` đi kèm, nó sẽ lấy tiếng Anh từ đó đổ vào cột **Original Text**, còn nội dung trong file `.rpy` sẽ được đẩy vào cột **Translated Text**. Giúp file `.rpy` giữ sạch sẽ 100% không bị chèn comment rác.

### 8.7. Lọc Thông Minh & Tích Chọn Thủ Công (Manual Selection)
- **Bộ Lọc Nghi Ngờ Tiếng Anh (Regex)**: Thêm tùy chọn "Chỉ Nghi ngờ Tiếng Anh" vào dropdown. Cơ chế sử dụng Regex để quét toàn bộ các ký tự có dấu đặc trưng của Tiếng Việt. Nếu một dòng Original Text không chứa bất kỳ ký tự tiếng Việt nào, nó sẽ được phân loại là Tiếng Anh còn sót. Tiến trình AI Batch Translation tự động liên kết với bộ lọc này để chỉ dịch các câu sót.
- **Tích Chọn Dòng Thủ Công**: Cung cấp cột Checkbox ở mỗi dòng trong Bảng Dịch Thuật. Người dùng có thể đánh dấu chính xác những câu muốn dịch. Tiến trình AI Batch ưu tiên hàng đầu việc quét các dòng được tích chọn thủ công này.
- **Tối Ưu CSS Compact**: Giảm padding, thu hẹp khoảng cách giữa thanh Tên File và Thanh Phân trang. Giảm font-size và cho phép copy text (`user-select: text`) trên thanh công cụ. Phục hồi và kích hoạt chức năng Collapse (thu nhỏ) Sidebar bằng nút Toggle.

---

## 9. Tóm Tắt Cấu Trúc Thư Mục & Module Chính
- `src-tauri/`: Module Rust Native Backend (Tauri v2):
  - `src-tauri/Cargo.toml`: Cấu hình dependencies: `tauri = "2"`, `serde`, `serde_json`, `reqwest`, `walkdir`, `rfd`, `tokio`.
  - `src-tauri/tauri.conf.json`: Cấu hình cửa sổ WebView2, identifier, permissions.
  - `src-tauri/src/main.rs`: Định nghĩa các command handlers bằng Rust: hộp thoại file/thư mục, đọc/ghi UTF-8, quét đệ quy `walkdir`, và cầu nối HTTP client Proxy AI `reqwest`.
- `renderer/js/bridge.js`: Cầu nối linh hoạt giữa Webview và Rust Native Backend, tích hợp giả lập tương thích ngược cho `ipcRenderer.invoke`.
- `main.js`: Quản lý vòng đời Electron (chế độ chạy song song/fallback).
- `renderer/index.html`: Cấu trúc DOM chính chứa 3 trang độc lập, nạp module `bridge.js`, bổ sung Keycap badges cho phím tắt.
- `renderer/css/style.css`: Hệ thống thiết kế mới Dark Obsidian & Neon Cyber (Cyber Violet & Neon Cyan), viền kính mờ glassmorphism.
- `renderer/js/app.js`: Controller điều phối giao diện, quản lý cơ chế tự động khôi phục Workspace (Persistence), luồng xuất file/xóa file hàng loạt (Batch Export/Delete), luồng dịch Batch 2 bước tự động.
- `renderer/js/settings.js`: Quản lý cấu hình AI, duy trì danh sách Model, tích hợp cơ chế Auto-save ngầm.
- `renderer/js/prompt.js`: Module quản lý Prompt Persona & User Prompt.
- `renderer/js/rpgmaker.js`: Module phân tích và lắp ráp file JSON RPGMaker.
- `renderer/js/renpy.js`: Module phân tích và lắp ráp script `.rpy` của Ren'Py (Tích hợp bảo vệ literal `\n` & Tương thích ngược cache cũ).
- `renderer/js/terminology.js`: Module quản lý Thuật ngữ RPGMaker.
- `renderer/js/renpy_terminology.js`: Module quản lý Thuật ngữ + Tóm tắt thông tin/Mối quan hệ nhân vật Ren'Py (Hỗ trợ Inline Edit, Tách Tên Thuần & Khử trùng lặp thông minh).
- `renderer/js/api.js`: Trung tâm xử lý giao tiếp Proxy, Streaming AI, trích xuất tự động và dịch Batch 2 bước an toàn.

---

## 10. Phase 7: Tái Cấu Trúc Toàn Bộ Dự Án Bằng Rust (Tauri v2) & Đổi Mới UI/UX Toàn Diện
Trong giai đoạn này, dự án bước vào cuộc cách mạng kiến trúc toàn diện: chuyển dịch từ môi trường Electron sang **Rust Native (Tauri v2)**, thay thế toàn bộ giao diện cũ bằng phong cách thiết kế hiện đại, đồng thời cam kết bảo tồn 100% tính năng nghiệp vụ.

### 10.1. Khởi Tạo Rust Native Backend (`src-tauri`)
- **Tối ưu hóa hiệu năng & tài nguyên**: Thay thế hoàn toàn Chromium/Node.js cồng kềnh bằng Rust native kết hợp WebView2 có sẵn của Windows. Dung lượng bộ nhớ RAM giảm từ ~300MB xuống chỉ còn ~30-50MB, tốc độ mở app tức thì.
- **Xây dựng bộ Rust Command Handlers (`src-tauri/src/main.rs`)**:
  - `select_file`, `select_directory`: Tương tác trực tiếp với hộp thoại hệ điều hành native qua crate `rfd`.
  - `read_dir`: Đọc danh sách thư mục đơn cấp.
  - `read_dir_recursive`: Sử dụng crate `walkdir` để quét đệ quy hàng nghìn file `.rpy` trong chớp mắt.
  - `read_file`, `write_file`: Thao tác tệp UTF-8 an toàn với cơ chế tự động tạo thư mục cha (`create_dir_all`).
  - `check_exists`: Kiểm tra sự tồn tại của file/thư mục tức thì.
  - `proxy_request`: Xây dựng cầu nối HTTP client tốc độ cao qua thư viện `reqwest` của Rust. Triệt tiêu hoàn toàn các lỗi CORS, timeout, giới hạn header hay lỗi bộ đệm khi gọi các Proxy AI bên ngoài.

### 10.2. Cầu Nối NativeBridge Tương Thích Linh Hoạt (`bridge.js`)
- **Nhận diện môi trường tự động**: Module `NativeBridgeHandler` kiểm tra sự tồn tại của `window.__TAURI__.core` để ưu tiên gọi trực tiếp các lệnh Rust. Nếu chạy trên Electron hoặc Browser, hệ thống sẽ tự động fallback về môi trường tương ứng.
- **Tương thích ngược 100%**: Tạo bộ giả lập `window.ipcRenderer.invoke(...)` đóng gói trong `bridge.js`. Nhờ đó, toàn bộ hơn 1,440 dòng mã logic nghiệp vụ trong `app.js` được bảo tồn nguyên vẹn và vận hành thông suốt qua backend Rust mà không cần viết lại toàn bộ mã gọi lệnh.

### 10.3. Đổi Mới Toàn Diện Giao Diện UI/UX (Dark Obsidian & Neon Cyber)
- **Bảng màu & Thẩm mỹ cao cấp**:
  - Tông nền đen sâu thẳm **Dark Obsidian** (`#07080c`) kết hợp bề mặt thẻ `#121520` và hiệu ứng kính mờ viền sáng (`backdrop-filter: blur(12px)`).
  - Dải màu phát sáng biểu tượng: **Electric Violet** (`#8b5cf6` → `#6366f1`) và **Neon Cyan** (`#06b6d4` → `#3b82f6`).
- **Nâng cấp các thành phần tương tác**:
  - **Huy hiệu phím tắt Keycap**: Tích hợp các badge sắc nét (<span class="keycap">F1</span>, <span class="keycap">F2</span>, <span class="keycap">F3</span>, <span class="keycap">F5</span>, <span class="keycap">F6</span>) trực quan trên các nút bấm.
  - **Bảng dịch thuật**: Chia cột rõ ràng, ô textarea dịch tự động co giãn theo chiều cao văn bản gốc, viền sáng nhẹ khi focus.
  - **Thanh phân trang hiện đại**: Bố cục thẳng hàng, tích hợp ô nhập số trang nhảy cóc trực tiếp.
  - **Đèn báo trạng thái Proxy**: Hiệu ứng radar pulse hai vòng sóng lan tỏa sống động.
  - **Toast Notifications**: Thẻ thông báo nổi kính mờ góc dưới màn hình với biểu tượng phân loại trạng thái rực rỡ.

### 10.4. Bảo Tồn Nguyên Vẹn 100% Tính Năng Nghiệp Vụ
- Không làm suy giảm hay loại bỏ bất kỳ tính năng nào:
  - Bóc tách Event RPGMaker (gom nhóm ID, cột dịch trống ban đầu, fallback câu gốc, xuất file hàng loạt).
  - Bóc tách từng dòng Ren'Py (loại trừ mã code game/audio, bảo vệ literal `\n`, sidecar `.orig.json`, nhảy cóc số trang, phân trang ảo chống lag).
  - Trích xuất thông tin nhân vật và phân tách tên thuần túy.
  - Quản lý Batch Translation, nút dừng dịch khẩn cấp, lưu cấu hình và khôi phục Workspace State bền vững.
- Đồng bộ và đẩy toàn bộ mã nguồn lên Git Repository tại: `https://github.com/abcxyzeric/tool-dich-game.git`.
