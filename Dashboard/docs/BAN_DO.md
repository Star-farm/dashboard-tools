# Bản đồ vùng canh tác

Mở mục **Bản đồ** trên menu, liên kết trên trang chủ, hoặc URL `/#map`.
Trang sử dụng header, footer, Lora và các biến màu/kích thước chữ của Dashboard.
Hình học và dữ liệu đều được phục vụ từ website; không cần dịch vụ bản đồ bên ngoài.

## Nội dung

- 992 vùng từ `includes/Dong Thap/plot_shapefile.shp`, tọa độ WGS 84 / UTM 48N.
- Năng suất (tấn/ha) và thu nhập ròng theo vùng từ 16 CSV
  `results/New Dong Thap/season/plot_yield_data_*.csv`.
- Chi phí, lượng nước và metan từ các JSON tổng hợp đang có của Dashboard,
  được đối chiếu bằng nhóm canh tác, khí hậu và tài nguyên để tìm Scenario Code.

Chọn nhóm kịch bản, mùa vụ, thời tiết và tài nguyên bằng cùng nhãn, giá trị
và thứ tự lựa chọn của Dashboard (`economicFacets`, `economicsText`). Chỉ hiện
các giá trị có dữ liệu bản đồ tương ứng; không thêm hiện trạng hoặc tài nguyên
trung tính khi bộ CSV không có. Thay một bộ lọc sẽ đặt lại các bộ lọc phía sau
về Tất cả. Tất cả kết hợp các kịch bản phù hợp theo số quan sát hợp lệ.

Chọn lớp năng suất hoặc thu nhập. Cuộn chuột để thu phóng quanh vị trí con trỏ,
kéo bản đồ để di chuyển; dùng +/− để thu phóng, Toàn cảnh để trở về. Bấm thửa
đất để mở popup diện tích, năng suất, thu nhập và ngữ cảnh năm/vụ/kịch bản đang
xem. Giá trị popup cập nhật theo thời gian và bộ lọc. Kéo bản đồ không mở popup;
đóng bằng nút đóng, Escape hoặc bấm ra ngoài bản đồ. Bàn phím hỗ trợ các phím
mũi tên, +/− và Home. Thông tin kỹ thuật về nguồn được giữ trong tài liệu này.

Nút Phát theo thời gian chạy từ năm đang xem đến 2050, mỗi giây một năm. Có
thể tạm dừng; phát lại khi đã đến cuối sẽ bắt đầu từ 2027. Kéo thanh năm hoặc
đổi bộ lọc sẽ dừng phát. Thanh thời gian có tick cho từng năm 2027–2050 và năm
nhãn năm đặt cách đều bên dưới để dễ đọc.
Biểu đồ phía dưới thể hiện trung bình mỗi vụ trong năm theo bộ lọc. CSV tải
xuống ghi các mã kịch bản thực sự được gộp và giữ rõ đơn vị trong tiêu đề cột.

Lựa chọn Vụ thu hoạch cho phép xem trung bình các vụ hoặc riêng Đông Xuân,
Xuân Hè, Thu Đông, tương ứng thứ tự vụ 1/2/3 theo yêu cầu của người dùng.
Bản đồ, biểu đồ, thống kê và CSV cùng dùng vụ đã
chọn; Play giữ nguyên vụ và chạy qua các năm. Thu Đông chỉ gộp những kịch bản có
ba vụ. Khi đổi bộ lọc sang nhóm không có vụ đang chọn, lựa chọn trở về trung
bình các vụ. Bộ lọc Mùa vụ vẫn giữ các hệ 2 vụ/3 vụ/bền vững của Dashboard.

Liên kết Xem kinh tế/tài nguyên/môi trường chuyển nhóm kịch bản, hệ mùa vụ,
thời tiết, tài nguyên, danh sách mã kịch bản, năm và vụ trong phần query của
hash URL. Trang đích khởi tạo bộ lọc theo các lựa chọn đó. Khi có vụ riêng,
trang đích mở chế độ Theo từng vụ và áp dụng năm/vụ tương ứng. Liên kết Trở
lại bản đồ giữ các lựa chọn ban đầu. Thay bộ lọc trên trang đích sẽ bỏ giới
hạn danh sách mã được mang từ bản đồ để có thể tiếp tục khám phá bình thường.

## Cách tính và giới hạn

Mỗi kịch bản có 20 lần chạy. Dữ liệu trình duyệt là giá trị trung bình theo
vùng, năm và thứ tự vụ; không phải kết quả của một lần chạy cụ thể. Vụ được
đánh số theo ngày thu hoạch trong mỗi năm/lần chạy và hiển thị tên mùa vụ theo
quy ước Đông Xuân / Xuân Hè / Thu Đông do người dùng chỉ định.
Lựa chọn tất cả các vụ tính trung bình theo số quan sát hợp lệ, không cộng
thành tổng năm. Thống kê toàn bộ vùng cho mỗi vùng trọng số như nhau, không
theo diện tích. Giữ giá trị 0 và âm; thiếu dữ liệu không được thay bằng 0.

Màu năng suất/thu nhập dùng 5 nhóm phân vị trên toàn bộ năm, vụ và vùng của
các kịch bản đang chọn, nên giữ nguyên thang khi đổi năm. Thang thay đổi
khi đổi bộ lọc và các khoảng số hiển thị dưới bản đồ.

`income` lấy từ `the_farmer.profit_net` trong `Global.gaml`, được mô hình mô tả
trong `Indicator.gaml` là USD/ha. Mã hiện có tạo một Farm/Farmer cho mỗi plot.
Thu nhập vùng hiển thị VNĐ/ha ở tiếng Việt và USD/ha ở tiếng Anh trên bản đồ,
popup, biểu đồ, bảng và CSV. Phần đối chiếu Dashboard tiếp tục lấy trực tiếp
VND hoặc USD từ nguồn tổng hợp tương ứng với ngôn ngữ.

`public/map-data/currency.json` lưu tỷ lệ kiểm chứng từ chi phí sản xuất của
các bản ghi tương ứng trong hai CSV Dashboard (ghép id/ngày/mã kịch bản).
Hiện tại 19.404 cặp chi phí cho tỷ lệ 26.322 VNĐ/USD. Cột `Currency Ratio`
ghi 25.874, khác với quy đổi thực tế; không dùng cột đó. Hai giá trị thu nhập
VND nguồn là ngoại lệ so với tỷ lệ chung; phần bản đồ dùng tỷ lệ được kiểm
chứng thống nhất từ chi phí. Không thay đổi các giá trị nguồn Dashboard.
Đây là quy đổi theo dữ liệu mô hình, không phải tỷ giá cập nhật hằng ngày.
Chuyển đổi trên từng bản ghi trước khi tổng hợp; giữ số âm, 0 và null, không
thay đổi năng suất hoặc số quan sát. VNĐ hiển thị không có phần thập phân.
CSV ghi `income_vnd_ha` hoặc `income_usd_ha` theo ngôn ngữ; thang màu giữ
nguyên phân nhóm khi đổi ngôn ngữ.
Các chỉ số Dashboard là bình quân 2027–2050, không đổi theo vùng/năm trên bản đồ;
chúng có thể dựa trên tập lần chạy khác với bộ CSV mới và không được gộp chung.

### Liên kết không gian

Shapefile không có trường thuộc tính. ID 0–991 giữ thứ tự đối tượng; các cột
CSV cũng được đánh số 0–991. `Global.gaml` tạo plot từ shapefile và xuất
`yield`/`income` khi duyệt plot. Liên kết của trang dựa trên quy trình đó.
Không có mã địa chính hoặc fingerprint shapefile trong kết quả CSV. Vì vậy
chưa có kiểm chứng độc lập rằng phiên bản hình học hiện tại chính là phiên
bản tạo các kết quả. Cần đối soát với mô hình gốc trước khi sử dụng ở cấp thửa.

Tài liệu GAMA mô tả [`ask` mặc định không chạy song song](https://gama-platform.org/wiki/1.8.1/Statements#ask).
Điều này hỗ trợ việc đọc mã xuất theo thứ tự, nhưng không chứng minh phiên bản
shapefile của lần chạy lịch sử.

Đường bao hiển thị được giản lược với ngưỡng 20 m để giảm dữ liệu, diện tích
tính bằng công thức diện tích vòng polygon gốc trong hệ tọa độ mét. Đây là
vùng canh tác mô hình đã gom/lọc, không có tên hoặc thông tin chủ đất.

## Chuẩn bị lại dữ liệu

```powershell
python scripts/build-map-data.py --model-root 'C:\path\to\STAR FARM'
```

Chỉ cập nhật tỷ lệ từ dữ liệu Dashboard, không cần repository mô hình:

```powershell
python scripts/build-map-data.py --currency-only
```

Script chỉ dùng Python standard library, không chỉnh nguồn mô hình. Đường dẫn
root được truyền bằng tham số; không phụ thuộc đường dẫn máy của người tạo.
Đầu ra `public/map-data/` gồm manifest, geometry và 16 file kết quả đã tính trung
bình. Các file này được đóng gói sẵn, nên `npm run build` không yêu cầu Python
hoặc repository mô hình. Cập nhật CSV/GIS thì chạy lại script trước khi build.

Script kiểm tra tên và số cột, dữ liệu trùng, số hữu hạn, cặp yield/income,
20 lần chạy, đủ năm và số vụ, cùng mã kịch bản duy nhất trong dữ liệu Dashboard.
Seed được giữ dạng chuỗi gốc. SHA-256 nguồn hình học và CSV được lưu để theo dõi
các lần chuẩn bị sau; đây không phải xác nhận lịch sử tạo dữ liệu.

Trình duyệt tải geometry và các kịch bản phù hợp bộ lọc; dữ liệu đã tải được giữ
trong bộ nhớ của phiên. Kiểm tra: `npm test -- --run tests/map-data.test.ts
tests/map-page.test.tsx`, `npm run lint`, `npm run build`.
