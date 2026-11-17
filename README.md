# Thiệp cưới online — Văn Anh & Lưu Linh

Thiệp cưới một trang, dựng lại theo bố cục mẫu "Minimalism Dark Red" của chungdoi.com, viết bằng **HTML + CSS thuần** (thêm một file JavaScript nhỏ cho phần tương tác). Không cần cài đặt hay build gì.

Các hình trang trí (bó hoa, phong bì, sáp niêm phong, lâu đài, hộp quà) được vẽ lại bằng SVG, không dùng hình của chungdoi.com. Font lấy từ Google Fonts.

## Xem thử

- Cách nhanh nhất: mở file `index.html` bằng trình duyệt (double-click).
- Hoặc chạy server local: `python3 -m http.server 8000` rồi mở http://localhost:8000

## Cấu trúc thư mục

```
index.html                 Toàn bộ nội dung thiệp
assets/css/style.css       Giao diện
assets/js/main.js          Màn hình loading, mở thiệp, tự cuộn, nhạc, album, lịch, âm lịch, popup
assets/anh-cuoi/           Ảnh cưới gốc (small/ là bản thu nhỏ dùng cho album và phong bì)
assets/images/             Mã QR, hình trang trí
assets/music/              Nhạc nền (bạn tự thêm)
google-apps-script.gs      Script lưu xác nhận tham dự vào Google Sheets
```

## Những chỗ cần sửa

| Nội dung | Sửa ở đâu |
|---|---|
| Tên cô dâu, chú rể | `index.html`: tìm và thay "Văn Anh", "Lưu Linh" (có trong `<title>`, thẻ meta, bìa thiệp, phần Save the date, thẻ thông tin lễ cưới, nút "Thêm vào lịch") |
| Tên bố mẹ, địa chỉ hai nhà | `index.html`, khối `families` (hiện đang là tên mẫu "Ông Nguyễn Văn A"…) |
| Ngày giờ lễ thành hôn | thuộc tính `data-datetime` của `id="ceremony"`, dạng `YYYY-MM-DDTHH:mm` (hiện là `2026-12-13T11:00`) |
| Ngày giờ tiệc cưới | thuộc tính `data-datetime` của `id="party"` (hiện là `2026-12-13T16:00`) |
| Địa điểm tiệc | chữ trong `id="venue-address"`, link bản đồ trong `<iframe class="venue__map">`, link "Chỉ đường" |
| Ảnh trong phong bì | thay `assets/anh-cuoi/0.jpeg` rồi tạo lại bản nhỏ: `sips -Z 800 assets/anh-cuoi/0.jpeg --out assets/anh-cuoi/small/0.jpeg` |
| Album ảnh | mỗi dòng `<button class="coverflow__item">` có `src` (bản nhỏ trong `assets/anh-cuoi/small/`) và `data-full` (ảnh gốc, mở khi bấm xem). Thêm ảnh mới thì tạo bản nhỏ: `sips -Z 1000 assets/anh-cuoi/12.jpeg --out assets/anh-cuoi/small/12.jpeg` |
| Mã QR mừng cưới | đặt file `assets/images/qr-chu-re.jpg`, `assets/images/qr-co-dau.jpg`. Khi chưa có file, khung QR hiện icon và dòng "Mã QR sẽ sớm được cập nhật" |
| Nhạc nền | đặt file vào `assets/music/music.mp3` (phát khi bấm "Mở thiệp"; nút nhạc góc phải dưới tự ẩn nếu không có file) |
| Tốc độ tự cuộn, thời gian loading | `CONFIG` ở đầu `assets/js/main.js` (`autoScrollPxPerSecond`, `loaderMinMs`, `loaderMaxMs`) |
| Lời cảm ơn cuối trang | thẻ `<footer class="thanks">` |

Chỉ cần sửa `data-datetime`: thứ trong tuần, ngày âm lịch (tính tự động), ngày trên bìa và màn hình loading, lịch tháng có trái tim và link "Thêm vào lịch" sẽ tự cập nhật theo.

**Bản đồ:** mở Google Maps, tìm địa điểm → Chia sẻ → Nhúng bản đồ → copy giá trị `src` trong đoạn `<iframe>` và dán vào `src` của `venue__map`. Link "Chỉ đường" có dạng `https://www.google.com/maps/dir/?api=1&destination=<tên hoặc địa chỉ>`.

**Ảnh xem trước khi gửi link qua Zalo/Facebook:** đang dùng `assets/anh-cuoi/6.jpeg` (thẻ `og:image` trong `<head>`). Sau khi đưa thiệp lên mạng, sửa thành đường dẫn đầy đủ để Zalo/Facebook hiển thị chắc chắn:
`<meta property="og:image" content="https://<tên-miền-của-bạn>/assets/anh-cuoi/6.jpeg">`

## Lưu xác nhận tham dự vào Google Sheets

Mặc định thiệp **chưa lưu** dữ liệu: khách vẫn bấm gửi được, nhưng câu trả lời không được gửi đi đâu cả. Muốn nhận được, làm một lần như sau:

1. Tạo một Google Sheet mới.
2. Vào **Tiện ích mở rộng → Apps Script**, xoá code mẫu, dán toàn bộ nội dung file `google-apps-script.gs`, bấm Lưu.
3. Bấm **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**. Chọn *Thực thi với tư cách: Tôi*, *Người có quyền truy cập: Bất kỳ ai*. Cấp quyền khi được hỏi.
4. Copy đường dẫn ứng dụng web (dạng `https://script.google.com/macros/s/.../exec`).
5. Mở `assets/js/main.js`, dán đường dẫn đó vào `formEndpoint: ''` ở đầu file.

Sau đó mỗi xác nhận tham dự được ghi vào sheet `XacNhanThamDu`.

## Đưa thiệp lên mạng (miễn phí)

- **Netlify Drop:** kéo thả cả thư mục vào https://app.netlify.com/drop là có link ngay.
- **GitHub Pages:** đẩy thư mục lên một repo GitHub → Settings → Pages → chọn nhánh `main`.
