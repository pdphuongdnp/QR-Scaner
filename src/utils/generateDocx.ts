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
            text: "HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG QUẢN LÝ KHO DNP",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun("Chào mừng bạn đến với ứng dụng quản lý kho chuyên nghiệp. Tài liệu này sẽ giúp bạn làm quen với ứng dụng một cách dễ dàng nhất, ngay cả khi bạn không rành về công nghệ."),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "1. Chuẩn bị trước khi bắt đầu",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Điện thoại: ", bold: true }),
              new TextRun("Có camera hoạt động tốt để quét mã QR."),
            ],
            bullet: { level: 0 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Quyền truy cập: ", bold: true }),
              new TextRun('Khi ứng dụng hỏi "Cho phép truy cập Camera", hãy chọn "Cho phép" (Allow).'),
            ],
            bullet: { level: 0 },
          }),

          new Paragraph({
            text: "2. Các bước bắt đầu (Màn hình chính)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Khi mở ứng dụng, bạn sẽ thấy màn hình chào mừng.",
            spacing: { after: 200 },
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
          new Paragraph({ text: "1. Nhập tên của bạn: Nhập tên vào ô \"Người soạn / Người nhập\".", bullet: { level: 0 } }),
          new Paragraph({ text: "2. Nhập số đơn hàng: Bạn có thể tự gõ hoặc bấm nút biểu tượng mã QR bên cạnh để quét mã trên phiếu.", bullet: { level: 0 } }),
          new Paragraph({ text: "3. Chọn chế độ làm việc:", bullet: { level: 0 } }),
          new Paragraph({ text: "Bấm nút Màu Xanh Dương nếu bạn đi SOẠN HÀNG.", bullet: { level: 1 } }),
          new Paragraph({ text: "Bấm nút Màu Vàng nếu bạn đi NHẬP HÀNG.", bullet: { level: 1 } }),

          new Paragraph({
            text: "3. Cách Soạn Hàng (Giao diện Màu Xanh)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Đây là phần dành cho nhân viên đi lấy hàng theo đơn.",
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: soanHangImg,
                transformation: { width: 500, height: 300 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "Bước 1 - Quét mã sản phẩm: Bấm nút to nhất ở trên cùng để quét mã QR dán trên sản phẩm. Ứng dụng sẽ tự động hiện ra tên hàng, mã hàng...", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 2 - Nhập vị trí: Nhập vị trí bạn lấy hàng (Ví dụ: A-001-01).", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 3 - Nhập số lượng: Gõ số lượng thực tế bạn đã lấy.", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 4 - Thêm vào danh sách: Bấm nút \"Thêm vào danh sách\" ở dưới cùng.", bullet: { level: 0 } }),

          new Paragraph({
            text: "4. Cách Nhập Hàng (Giao diện Màu Vàng)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Đây là phần dành cho việc đưa hàng mới vào kho hoặc chuyển vị trí.",
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: nhapHangImg,
                transformation: { width: 500, height: 300 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "Bước 1: Nhập tên hàng hóa.", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 2: Quét hoặc nhập vị trí hiện tại và vị trí muốn chuyển đến (nếu có).", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 3: Nhập số lượng và ghi chú thêm (nếu cần).", bullet: { level: 0 } }),
          new Paragraph({ text: "Bước 4: Bấm nút \"Thêm vào danh sách\".", bullet: { level: 0 } }),

          new Paragraph({
            text: "5. Kiểm tra và Gửi dữ liệu",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "Sau khi quét xong nhiều món hàng, bạn có thể kiểm tra lại ở phần dưới cùng:", spacing: { after: 200 } }),
          new Paragraph({ text: "1. Duyệt danh sách: Vuốt sang trái hoặc phải ở khung dưới cùng để xem lại các món đã quét.", bullet: { level: 0 } }),
          new Paragraph({ text: "2. Sửa/Xóa: Nếu nhập sai, bạn có thể bấm nút \"Sửa\" hoặc \"Xóa\" ngay trên thẻ hàng đó.", bullet: { level: 0 } }),
          new Paragraph({ text: "3. Tải file dữ liệu: Khi đã hoàn thành toàn bộ đơn hàng, hãy bấm nút \"Ghi dữ liệu (Tải File CSV)\" ở dưới cùng.", bullet: { level: 0 } }),

          new Paragraph({
            text: "6. Một số lưu ý quan trọng",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "Mã QR: Hãy giữ camera thẳng và đủ ánh sáng để máy quét nhanh hơn.", bullet: { level: 0 } }),
          new Paragraph({ text: "Lưu trữ: Ứng dụng sẽ tự lưu các đơn hàng bạn đã làm trong ngày. Nếu lỡ tay thoát ra, bạn chỉ cần nhập lại tên và số đơn cũ để làm tiếp.", bullet: { level: 0 } }),
          new Paragraph({ text: "Màu sắc: Nhớ quy tắc: Xanh = Soạn đi, Vàng = Nhập vào.", bullet: { level: 0 } }),

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
