import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from "docx";
import { saveAs } from "file-saver";

async function fetchImageAsBuffer(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export const downloadUserGuideDocx = async () => {
  const images = {
    welcome: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop",
    soanHang: "https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=800&auto=format&fit=crop",
    nhapHang: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=800&auto=format&fit=crop",
  };

  const welcomeImg = await fetchImageAsBuffer(images.welcome);
  const soanHangImg = await fetchImageAsBuffer(images.soanHang);
  const nhapHangImg = await fetchImageAsBuffer(images.nhapHang);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ KHO DNP (CẬP NHẬT)",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun("Chào mừng bạn đến với hệ thống quản lý kho DNP chuyên nghiệp. Tài liệu này sẽ giúp bạn làm quen với các tính năng mới nhất, đặc biệt là quy trình Xuất Hàng và tạo Phiếu Xuất Kho PDF."),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "1. Chuẩn bị và Thư mục làm việc",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Thư mục Nhập file: ", bold: true }),
              new TextRun("Nên để file dữ liệu tại \\download\\DH_DNP\\ để dễ tìm kiếm khi bấm nút Nhập File CSV."),
            ],
            bullet: { level: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Thư mục Xuất file: ", bold: true }),
              new TextRun("File PDF/CSV tải về nên được lưu trữ tại \\download\\DNP\\."),
            ],
            bullet: { level: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Quyền truy cập: ", bold: true }),
              new TextRun('Hãy chọn "Cho phép" (Allow) khi ứng dụng yêu cầu truy cập Camera.'),
            ],
            bullet: { level: 0 },
          }),

          new Paragraph({
            text: "2. Màn hình chính (Chào mừng)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: welcomeImg,
                transformation: { width: 500, height: 300 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "1. Nhập tên: Nhập vào ô \"Người soạn / Người nhập\".", bullet: { level: 0 } }),
          new Paragraph({ text: "2. Nhập số đơn: Gõ trực tiếp hoặc quét mã QR trên phiếu.", bullet: { level: 0 } }),
          new Paragraph({ text: "3. Nhập dữ liệu từ File: Bấm nút \"Nhập File CSV\" để làm tiếp đơn hàng cũ.", bullet: { level: 0 } }),
          new Paragraph({ text: "4. Chọn chế độ làm việc:", bullet: { level: 0 } }),
          new Paragraph({ text: "Màu Xanh Dương: SOẠN HÀNG.", bullet: { level: 1 } }),
          new Paragraph({ text: "Màu Vàng: NHẬP HÀNG.", bullet: { level: 1 } }),
          new Paragraph({ text: "Màu Tím: XUẤT HÀNG DNP (Mới).", bullet: { level: 1 } }),

          new Paragraph({
            text: "3. Quy trình Xuất Hàng DNP (Màu Tím)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Đây là quy trình quan trọng nhất để tạo Phiếu Xuất Kho chuyên nghiệp.",
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "Bước 1: Thông tin Số PXK, Khách hàng, Địa chỉ sẽ tự động được lấy từ file dữ liệu đã nhập.", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 2: Nhập hoặc quét số xe vận chuyển. Bấm nút Lưu (biểu tượng đĩa mềm) để cập nhật cho toàn bộ đơn.", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 3: Bấm nút \"Xuất file PDF\" để tải phiếu về máy.", bullet: { level: 0 } }),

          new Paragraph({
            text: "4. Đặc điểm nổi bật của Phiếu PDF",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "Ngắt trang thông minh: Tự động xuống trang khi dữ liệu dài, không bị mất thông tin.", bullet: { level: 0 } }),
          new Paragraph({ text: "Lặp lại tiêu đề: Thông tin khách hàng luôn hiện ở đầu mỗi trang.", bullet: { level: 0 } }),
          new Paragraph({ text: "Làm nổi bật số liệu: Các cột Số lượng được in to (size 14.5) và in đậm.", bullet: { level: 0 } }),
          new Paragraph({ text: "Định dạng chuyên nghiệp: Phần sau dấu hai chấm (:) luôn được In Đậm & In Nghiêng.", bullet: { level: 0 } }),
          new Paragraph({ text: "Chữ ký: Luôn nằm ở cuối cùng với khoảng trống rộng rãi để ký tên.", bullet: { level: 0 } }),

          new Paragraph({
            text: "5. Một số lưu ý quan trọng",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "Font chữ: Sử dụng font Roboto Unicode, hiển thị tốt trên iPhone/iPad.", bullet: { level: 0 } }),
          new Paragraph({ text: "Màu sắc: Xanh = Soạn, Vàng = Nhập, Tím = Xuất.", bullet: { level: 0 } }),
          new Paragraph({ text: "Nút Thoát & Home: Luôn hiển thị ở thanh tiêu đề để thao tác nhanh.", bullet: { level: 0 } }),

          new Paragraph({
            text: "Chúc bạn làm việc hiệu quả và an toàn!",
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "HUONG_DAN_SU_DUNG_DNP.docx");
};
