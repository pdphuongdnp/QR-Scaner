# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ KHO DNP (CẬP NHẬT)

Chào mừng bạn đến với ứng dụng quản lý kho chuyên nghiệp. Tài liệu này sẽ giúp bạn làm quen với các tính năng mới nhất, giúp việc soạn hàng, nhập hàng và xuất phiếu trở nên nhanh chóng và chính xác hơn.

---

## 1. Chuẩn bị trước khi bắt đầu
*   **Thiết bị:** Điện thoại hoặc máy tính bảng có camera hoạt động tốt để quét mã QR.
*   **Quét mã QR linh hoạt:** 
    *   **Quét trực tiếp:** Hướng camera vào mã QR để quét tự động.
    *   **Tải ảnh từ máy (Mới):** Nếu ánh sáng yếu hoặc mã QR mờ, bạn có thể chụp ảnh mã QR trước, sau đó bấm nút **"Tải ảnh mã QR từ máy"** trong trình quét để ứng dụng tự đọc nội dung từ ảnh.
*   **Quyền truy cập:** Khi ứng dụng hỏi "Cho phép truy cập Camera", hãy chọn **"Cho phép" (Allow)**.
*   **Thư mục làm việc đề xuất:**
    *   📥 **Nhập file:** Nên để file dữ liệu tại `\download\DH_DNP\` để dễ tìm kiếm.
    *   📤 **Xuất file:** File PDF/CSV tải về nên được lưu trữ tại `\download\DNP\`.
*   **Các nút điều hướng:**
    *   🏠 **Nút HOME (Màu Trắng):** Quay lại màn hình chính.
    *   🚪 **Nút THOÁT (Màu Đỏ - Nhấp nháy):** Thoát ứng dụng nhanh chóng.

---

## 2. Màn hình chính (Chào mừng)

1.  **Nhập tên của bạn:** Nhập vào ô "Người soạn / Người nhập".
2.  **Nhập số đơn hàng:** Gõ trực tiếp hoặc quét mã QR trên phiếu.
3.  **Nhập dữ liệu từ File:** Bấm nút **"Nhập File CSV"**. 
    *   Ứng dụng sẽ cảnh báo nếu file đã được nhập trước đó.
    *   Đơn hàng trùng số sẽ tự động thêm hậu tố `-1`, `-2` để quản lý độc lập.
4.  **Chọn chế độ làm việc:**
    *   🟦 **Màu Xanh Dương:** Quy trình **SOẠN HÀNG**.
    *   🟨 **Màu Vàng:** Quy trình **NHẬP HÀNG**.
    *   🟪 **Màu Tím:** Quy trình **XUẤT HÀNG DNP** (Mới).

---

## 3. Cách Soạn Hàng (Màu Xanh)
*   **Bước 1:** Quét mã QR trên sản phẩm để lấy thông tin tự động.
*   **Bước 2:** Nhập vị trí lấy hàng (Ví dụ: A-001-01).
*   **Bước 3:** Nhập số lượng thực tế đã lấy.
*   **Bước 4:** Bấm "Thêm vào danh sách".

---

## 4. Cách Nhập Hàng (Màu Vàng)
*   Dùng khi đưa hàng mới vào kho hoặc chuyển đổi vị trí.
*   Nhập tên hàng, vị trí hiện tại, vị trí mới (nếu có) và số lượng.

---

## 5. Cách Xuất Hàng DNP (Màu Tím - Mới)
Đây là quy trình quan trọng nhất để tạo Phiếu Xuất Kho chuyên nghiệp:
1.  **Thông tin chung:** Số PXK, Khách hàng, Địa chỉ sẽ tự động được lấy từ file dữ liệu bạn đã nhập ở màn hình chính.
2.  **Số xe:** Nhập hoặc quét số xe vận chuyển. Bấm nút **Lưu** để cập nhật cho toàn bộ đơn hàng.
3.  **Xuất PDF:** Bấm nút **"Xuất file PDF"**.
    *   **Ngắt trang thông minh:** Tự động xuống trang khi dữ liệu dài.
    *   **Lặp lại tiêu đề:** Thông tin khách hàng luôn hiện ở đầu mỗi trang.
    *   **Làm nổi bật:** Các cột Số lượng được in to (**size 14.5**) và **in đậm**.
    *   **Chữ ký:** Luôn nằm ở cuối cùng với khoảng trống rộng rãi để ký tên.

---

## 6. Một số lưu ý quan trọng
*   **Font chữ:** Sử dụng font Roboto Unicode, hiển thị tốt trên iPhone/iPad mà không bị lỗi.
*   **Định dạng:** Trong file PDF, phần nội dung sau dấu hai chấm (`:`) luôn được **In Đậm & In Nghiêng**.
*   **Màu sắc:** Nhớ quy tắc: **Xanh = Soạn**, **Vàng = Nhập**, **Tím = Xuất**.

---
*Chúc bạn làm việc hiệu quả và an toàn!*
