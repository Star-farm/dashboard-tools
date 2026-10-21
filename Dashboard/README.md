# STAR FARM · Trang chủ, Về tương lai, Chi tiết kịch bản & Bảng định nghĩa

Trang chủ giới thiệu nghiên cứu về đề án 1 triệu hecta lúa và trang tra cứu 31 thuật ngữ bằng tiếng Việt/Anh. Phát triển dựa trên template React 19 + TypeScript + Vite trong `../Web App/frontend`.

Menu cố định gồm Trang chủ (`#home`), Bảng định nghĩa (`#glossary`), Về tương lai (`#future`), Chi tiết kịch bản (`#scenario-details`) và ba menu chủ đề Kinh tế, Tài nguyên, Môi trường. Bảy mục dùng chung kiểu nút và nằm trên một hàng; trên điện thoại hàng menu cuộn ngang dưới thương hiệu và nút VI/EN. Truy cập gốc mở trang chủ; các liên kết hash hỗ trợ tải lại và nút Back/Forward mà không cần cấu hình rewrite ở máy chủ.

Ba menu chủ đề có cùng cấu trúc: Tổng quan → Bảng thông tin / Bảng so sánh; So sánh → BAU3S / BAU2S / BAUSS so với 1Mha; Canh tác như thường lệ → 3 mùa vụ / 2 mùa vụ / Bền vững; và Một triệu hecta lúa. Theo yêu cầu hiện tại chỉ dựng menu, các mục cuối có `aria-disabled` và chưa dẫn tới trang nội dung. Menu hỗ trợ hover, chạm, bàn phím, Escape, đóng khi bấm ra ngoài hoặc cuộn hàng menu; trên màn hình nhỏ, menu cấp hai mở bên trong khung để tránh tràn ngang.

Theme dùng xanh rừng, vàng lúa và nền kem theo ảnh tham khảo. Nền trang chủ dùng bản minh họa gốc không có chữ `big painting.png` có sẵn trong thư mục tải xuống, được chuyển sang JPEG tại `src/assets/mekong-landscape.jpg` để tối ưu dung lượng. Chữ trên ảnh là HTML nên đổi được theo ngôn ngữ. Footer dùng ảnh logo IRD, CIRAD, Đại học Cần Thơ, DeSIRA kèm cờ EU và FAO trên nền trắng. Ảnh được lưu tại `src/assets/partners`, giữ tỷ lệ khi co giãn và tự xếp lại trên điện thoại. Nguồn ảnh ghi trong [danh sách logo](src/assets/partners/README.md). Thông tin và liên kết dự án tham khảo [trang STAR-FARM của ACROSS](https://across-lab.org/application/star-farm/).

Lần truy cập đầu tiên dùng ngôn ngữ ưu tiên đầu tiên của trình duyệt (`navigator.languages[0]`, dự phòng `navigator.language`): `vi`/`vi-VN` dùng tiếng Việt; ngôn ngữ khác dùng tiếng Anh. Nút VI/EN đổi toàn bộ giao diện, tên/định nghĩa từ CSV và thứ tự sắp xếp tương ứng. Lựa chọn được lưu tại `localStorage['star-farm-glossary.language']` và được ưu tiên cho các lần truy cập tiếp theo. Nếu trình duyệt chặn lưu trữ, người dùng vẫn đổi được ngôn ngữ trong phiên hiện tại. Đổi tiếng giữ nguyên từ khóa, nhóm chủ đề và chiều sắp xếp.

Giao diện được thiết kế lại từ ảnh tham khảo với tông xanh lá trầm, nền sáng và bảng dễ đọc. Trên màn hình từ 601px, thuật ngữ và định nghĩa nằm trong hai cột; trên điện thoại đến 600px, mỗi mục xếp dọc, bộ lọc chia ba cột và có nút sắp xếp riêng. Khung nội dung giới hạn 1376px trên màn hình lớn.

## Chạy ứng dụng

Đã kiểm tra bằng Node.js 24. Script xử lý dữ liệu dùng khả năng đọc TypeScript trực tiếp của Node.

```powershell
cd Dashboard
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://localhost:5173`). Ứng dụng đọc CSV đóng gói sẵn, không cần backend hoặc API key.

## Kiểm tra và build

```powershell
npm test -- --run
npm run lint
npm run build
npm run preview
```

Thư mục `dist` chứa bản build tĩnh. Có thể phục vụ bằng bất kỳ static host nào; cấu hình `base: './'` hỗ trợ triển khai trong thư mục con.

## Dữ liệu

`src/data/indicators.csv` là bản sao nguyên vẹn của file người dùng cung cấp `STAR_FARM CSV - Indicators Definition.csv`. Dữ liệu CSV chỉ được dùng làm nội dung hiển thị và tìm kiếm.

Hai file dữ liệu mới được giữ nguyên tên và byte nguồn trong `src/data/`:

| File | Bản ghi | Cột | Giai đoạn |
| --- | ---: | ---: | --- |
| `STAR_FARM CSV - Dữ liệu tổng.csv` | 19.404 | 29 | 2016–2050 |
| `STAR_FARM CSV - Master file.csv` | 19.404 | 30 | 2016–2050 |

Mỗi file có 17 mã kịch bản. Thông tin tổng quan nằm trong `src/data/catalog.json` và được đối chiếu với dữ liệu thực bằng kiểm thử. Khi cập nhật CSV, cập nhật catalog tương ứng. Đây là hai bản nguồn riêng, không cộng dồn số bản ghi và không tự động quy đổi các đơn vị tiền tệ. Mục thư viện dữ liệu và các liên kết tải đã được gỡ khỏi giao diện; hai CSV cung cấp dữ liệu cho trang Về tương lai.

## Về tương lai

Ba biểu đồ Recharts hiển thị trung bình cộng của tất cả bản ghi trong từng năm, theo từng nhóm, từ 2027 đến 2050. Mỗi nguồn có 18.984 bản ghi trong giai đoạn này; các năm lịch sử 2016–2022 được loại khỏi trang tương lai. Không cộng các vụ trong năm thành tổng năm, không cân lại trọng số để các kịch bản con có số quan sát bằng nhau, và không trộn hai nguồn CSV thành một mẫu lớn hơn.

| Biểu đồ | Nhóm | Đơn vị / Nguồn |
| --- | --- | --- |
| Thu nhập ròng | `Scenario Group`: 1Mha / Business As Usual (Thường lệ) | USD/ha: Master file; VNĐ/ha: Dữ liệu tổng |
| Cường độ lao động | `Scenario Group`: 1Mha / Business As Usual | giờ/ha, Master file |
| Phát thải metan | `AWD Adoption`: With AWD / Without AWD | kg CH₄/ha, Master file |

Màu nhận diện cố định theo yêu cầu: 1Mha luôn xanh, thường lệ đỏ; có AWD xanh, không có AWD đỏ. Nhận xét là một đoạn văn dưới mỗi biểu đồ, phân tích chênh lệch bình quân, thay đổi đầu–cuối kỳ và số liệu năm cuối rồi đề xuất ưu tiên 1Mha và AWD khi số liệu trong khoảng năm đang chọn ủng hộ. Cường độ lao động của 1Mha có thể cao hơn thường lệ; nhận xét thể hiện điều này và đề xuất bố trí nhân công, xem xét cơ giới hóa phù hợp khi triển khai. Đường nối thẳng, không làm mềm, có chấm cho mỗi năm; hover hiển thị năm, số liệu cả hai nhóm và đơn vị. Cả hai đường và chú giải đều dùng nét liền; đường lưới và trục được tăng độ tương phản. Trục lao động tự chọn khoảng có đệm quanh số liệu của cả hai nhóm để làm rõ chênh lệch. Các biểu đồ khác giữ gốc 0 hoặc bao gồm giá trị âm nếu có. Đã gỡ bảng số liệu, số thứ tự biểu đồ và phần hướng dẫn/nguồn khỏi giao diện.

Bộ chọn năm áp dụng cho cả ba biểu đồ. Đơn vị thu nhập tự đổi theo ngôn ngữ: tiếng Việt dùng VNĐ/ha từ Dữ liệu tổng, tiếng Anh dùng $/ha từ Master file, không tự quy đổi tiền tệ. Mỗi biểu đồ ghi rõ “Đơn vị:” / “Unit:”. Các năm hoặc nhóm thiếu giá trị dùng `null`, không điền bằng 0 và không nối đường qua khoảng thiếu; số 0 và giá trị âm thật được giữ nguyên.

`npm run data:future` đọc hai CSV và sinh `src/data/future-series.json`. Lệnh này tự chạy trước `npm run dev` và `npm run build`, nên cập nhật nguồn sẽ tạo lại chuỗi số liệu. Trình duyệt chỉ tải chuỗi đã tổng hợp, không tải và phân tích 12 MB CSV. Trang và thư viện biểu đồ được tải riêng khi người dùng mở Về tương lai; homepage không phải tải thư viện biểu đồ.

| Cột CSV | Sử dụng |
| --- | --- |
| `id` | Định danh thuật ngữ |
| `Tên kịch bản` | Tên tiếng Việt hiển thị |
| `Định nghĩa` | Nội dung định nghĩa hiển thị |
| `Phân loại` | Bộ lọc chủ đề |
| `Name`, `Definition` | Hiển thị và tìm kiếm tiếng Anh |

Giữ nguyên tên cột khi cập nhật CSV, sau đó build lại để phát hành dữ liệu mới. Nội dung gốc, kể cả cách viết trong CSV, được giữ nguyên. Tìm kiếm cả hai ngôn ngữ không phụ thuộc tiếng đang hiển thị, không phân biệt hoa/thường và dấu tiếng Việt; bộ lọc chủ đề kết hợp với từ khóa; tên sắp xếp tăng/giảm theo ngôn ngữ hiện tại. Có bộ đếm kết quả, xóa tìm kiếm, đặt lại bộ lọc, trạng thái không có kết quả và thông báo lỗi dữ liệu.

## Chi tiết kịch bản

Trang `#scenario-details` có 16 lựa chọn theo `Scenario Code`, mặc định `BAU-BV-OH-TH` như ảnh tham khảo. Ba nhóm gồm 7 chỉ số kinh tế, 3 chỉ số nguồn lực và 3 mục bền vững (metan, cường độ phát thải, AWD). Chọn kịch bản cập nhật tất cả thẻ và đoạn nhận xét. Chuyển ngôn ngữ giữ lựa chọn; tiếng Việt dùng số tiền gốc VNĐ, tiếng Anh dùng USD từ Master file. Các tên tiếng Anh chuẩn hóa lỗi chính tả “Serve Climate” thành “Severe Climate” khi hiển thị, không sửa CSV.

Các giá trị trong ảnh là trung bình cộng mọi bản ghi của kịch bản trong 2027–2050, so với trung bình 420 bản ghi nền 2016–2022. Chúng không phải giá trị riêng năm 2050 hoặc riêng năm 2022; giao diện ghi rõ hai giai đoạn. Số liệu trên hecta là trung bình theo mùa vụ, không cộng thành tổng năm. Chênh lệch tương đối tính bằng `(giá trị - nền) / abs(nền) × 100%`; nền bằng 0 hoặc thiếu dữ liệu không tạo tỷ lệ giả.

ROI tính trên từng bản ghi bằng `Net Income / Production Cost × 100%`, rồi lấy trung bình; bỏ qua ROI khi chi phí thiếu hoặc không dương. `Profit Margin` dùng trực tiếp từ CSV. Cường độ phát thải giữ đơn vị gốc kg CH₄/kg gạo (số khoảng 0,06 trong ảnh), nước là độ sâu mm, phân bón gốc nitơ là kg/ha. Các giá trị metan dùng CH₄, không dùng NH₄ như nhãn sai trong ảnh tham khảo.

Màu thay đổi xét theo ý nghĩa của chỉ số: thu nhập, rơm, năng suất, tỷ suất lợi nhuận và ROI tăng là xanh; chi phí, lao động, đầu vào và phát thải giảm là xanh. Các chiều ngược lại là đỏ. Nhận xét phân tích thu nhập, năng suất, chi phí, khả năng sinh lời, nước và metan rồi kết luận theo dữ liệu đang chọn.

`npm run data:scenarios` tạo `src/data/scenario-details.json` từ hai CSV. Lệnh tự chạy trước dev/build cùng bước tạo dữ liệu biểu đồ. Trình duyệt tải trang và JSON đã tổng hợp khi mở Chi tiết kịch bản; không tải CSV gốc để xử lý tại máy người dùng.
