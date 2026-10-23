# STAR FARM · Trang chủ, Về tương lai, Chi tiết kịch bản & Bảng định nghĩa

Trang chủ → **Khám phá Kinh tế** mở `#economics-explore`: trang trung gian với đủ bốn nhóm Tổng quan, So sánh, Canh tác như thường lệ và Một triệu hecta lúa. Cả chín mục đều dẫn thẳng tới nội dung. Các nhóm luôn hiển thị, hai cột trên máy tính và một cột trên điện thoại, cùng font và theme hiện có. Trang chủ giữ một liên kết cho chủ đề Kinh tế; trang khám phá hỗ trợ Việt/Anh, metadata và truy cập trực tiếp bằng hash.

Trang chủ → **Khám phá Tài nguyên** mở `#resources-explore`, dùng chung template với Kinh tế và dẫn đến đủ chín trang: Bảng thông tin (`#resources-overview`), Bảng so sánh (`#resources-comparison`), ba trang BAU3S/BAU2S/BAUSS so với 1Mha (`#resources-bau3-vs-1mha`, `#resources-bau2-vs-1mha`, `#resources-bauss-vs-1mha`) và bốn trang mô hình (`#resources-bau3`, `#resources-bau2`, `#resources-bauss`, `#resources-1mha`). Menu máy tính và điện thoại mở trực tiếp tất cả các trang này.

Trang chủ → **Khám phá Môi trường** mở `#environment-explore`, cùng template và đầy đủ chín trang: bảng thông tin (`#environment-overview`), bảng so sánh (`#environment-comparison`), BAU3S/BAU2S/BAUSS so với 1Mha (`#environment-bau3-vs-1mha`, `#environment-bau2-vs-1mha`, `#environment-bauss-vs-1mha`) và bốn mô hình (`#environment-bau3`, `#environment-bau2`, `#environment-bauss`, `#environment-1mha`). Cả ba chủ đề trên trang chủ hiện dẫn thẳng tới trang khám phá riêng; không mở menu header từ trang chủ.

`npm run data:scenarios` tạo thêm `src/data/environment.json` với 17 dòng kịch bản, 16 chuỗi năm, 18984 bản ghi tương lai và 420 bản ghi hiện trạng. Hai chỉ số là **Emission Intensity** và **Methane Emissions**. Cường độ trong CSV là **kg CH₄/kg gạo**, được kiểm chứng theo công thức `Methane Emissions / (Avg Yield × 1000)` trên từng bản ghi; trang Môi trường nhân giá trị nguồn với **1000** để hiển thị đúng **kg CH₄/tấn gạo** theo đơn vị trong ảnh. Phát thải vẫn là **kg CH₄/ha**. Không sửa CSV gốc hoặc cách hiển thị kg/kg ở trang Chi tiết kịch bản. Các bình quân dùng số bản ghi hợp lệ riêng của từng chỉ số; không lấy tỷ số của các bình quân để thay thế trường cường độ nguồn. Hai CSV được đối chiếu theo kịch bản/tổ hợp/năm, tổng và số bản ghi từng chỉ số cùng số bản ghi dùng AWD.

Trang Môi trường có cùng năm bộ lọc, dòng hiện trạng ở đầu bảng, cột chữ căn trái/cột số căn phải và thẻ mobile như Kinh tế. Bảng so sánh gồm hai biểu đồ cột, mỗi so sánh BAU với 1Mha gồm hai cặp biểu đồ đường; mỗi mô hình có hai biểu đồ và ba KPI: cường độ, phát thải, tỷ lệ AWD. Tỷ lệ AWD là số bản ghi dùng AWD / tổng bản ghi trong mô hình; thay đổi năm 2050 so với 2027 được ghi bằng **điểm phần trăm**, kể cả khi năm đầu là 0%. Hiện trạng bị loại khỏi KPI và các biểu đồ tương lai. Nhận xét tổng hợp và riêng dùng số liệu thực, in đậm số; đề xuất 1Mha thay đổi theo kết quả, có xem xét năng suất và quản lý nước, không gán toàn bộ chênh lệch giữa các gói kỹ thuật cho AWD. Đường thẳng, chấm năm, tooltip, tick năm thích ứng, bảng màu, font và bố cục responsive dùng cùng quy ước với Kinh tế/Tài nguyên. Mọi trang có Việt/Anh, metadata và liên kết trực tiếp; dữ liệu/biểu đồ được tải khi mở nội dung.

Tài nguyên gồm lượng nước tưới **mm** (độ sâu nước theo định nghĩa trong CSV), phân bón **kg N/ha**, thuốc trừ sâu **lần / applications**. `npm run data:scenarios` tạo `src/data/resources.json` từ hai CSV: 17 dòng kịch bản, trong đó 420 bản ghi hiện trạng 2016–2022 được đưa lên đầu bảng; 16 chuỗi cho bốn mô hình × bốn tổ hợp thời tiết–tài nguyên với 24 năm 2027–2050 (18984 bản ghi tương lai). Các số liệu vật lý, tổng và số bản ghi hợp lệ của từng chỉ số được đối chiếu giữa hai nguồn, không quy đổi theo ngôn ngữ và không cộng dồn hai nguồn. Giá trị trống giữ `null`, số 0 giữ nguyên; mọi bình quân tổng hợp có trọng số theo số bản ghi **hợp lệ của từng chỉ số**. Dữ liệu lịch sử được loại khỏi KPI, so sánh và chuỗi tương lai.

Bảng Tài nguyên dùng cùng năm bộ lọc kết hợp AND, nền hiện trạng, căn cột chữ trái/số phải và thẻ mobile của Kinh tế. Bảng so sánh có ba biểu đồ cột với bộ lọc thời tiết/tài nguyên, BAU đỏ và 1Mha xanh. Mỗi trang mô hình có ba KPI và ba biểu đồ; mỗi trang so sánh BAU với 1Mha có ba cặp biểu đồ dùng chung miền trục trong từng cặp. Tất cả có nhận xét tổng hợp và riêng, số liệu nhận xét in đậm, đường thẳng, chấm từng năm, tooltip bốn điều kiện, tick năm cách đều thích ứng chiều rộng và bảng màu thống nhất với Kinh tế. Nhận xét phân biệt mức sử dụng đầu vào với hiệu quả tài nguyên, cần đánh giá thêm năng suất. Trang hỗ trợ Việt/Anh, metadata và smooth scroll; dữ liệu và biểu đồ được tải khi mở nội dung, không xử lý CSV gốc trên trình duyệt.

Trang chủ giới thiệu nghiên cứu về đề án 1 triệu hecta lúa và trang tra cứu 31 thuật ngữ bằng tiếng Việt/Anh. Phát triển dựa trên template React 19 + TypeScript + Vite trong `../Web App/frontend`.

Menu cố định gồm Trang chủ (`#home`), Bảng định nghĩa (`#glossary`), Về tương lai (`#future`), Chi tiết kịch bản (`#scenario-details`) và ba menu chủ đề Kinh tế, Tài nguyên, Môi trường. Bảy mục dùng chung kiểu nút và nằm trên một hàng; trên điện thoại hàng menu cuộn ngang dưới thương hiệu và nút VI/EN. Truy cập gốc mở trang chủ; các liên kết hash hỗ trợ tải lại và nút Back/Forward mà không cần cấu hình rewrite ở máy chủ.

Ba menu chủ đề có cùng cấu trúc: Tổng quan → Bảng thông tin / Bảng so sánh; So sánh → BAU3S / BAU2S / BAUSS so với 1Mha; Canh tác như thường lệ → 3 mùa vụ / 2 mùa vụ / Bền vững; và Một triệu hecta lúa. Cả ba chủ đề đều có nội dung cho toàn bộ các mục; đường dẫn và cách tính được mô tả trong tài liệu này. Menu hỗ trợ hover, chạm, bàn phím, Escape, đóng khi bấm ra ngoài hoặc cuộn hàng menu; trên điện thoại, menu mở trong hộp thoại bên phải với menu cấp hai xếp bên trong để tránh tràn ngang.

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

## Tổng quan kinh tế

Trang `#economics-overview` lấy 5 nhóm phân loại và 7 chỉ số từ CSV. Năm bộ lọc kết hợp bằng điều kiện AND: nhóm kịch bản, mùa vụ, thời tiết, tài nguyên và AWD. Thời tiết ôn hòa trong CSV được hiển thị là “Bình thường” / “Normal”; dữ liệu nguồn giữ nguyên. Chuyển Việt/Anh giữ nguyên lựa chọn; tiền dùng số liệu gốc VNĐ hoặc USD tương ứng. Màn hình lớn hiển thị bảng 12 cột với tiêu đề hai tầng theo ba nhóm thông tin kịch bản, tài chính và sản xuất; cột tên kịch bản cố định khi kéo ngang. Bảng có nền xen kẽ, vạch ngăn nhóm mùa vụ và dòng hiện trạng nổi bật bằng màu vàng. Đến 767px chuyển thành thẻ với đầy đủ chỉ số và đơn vị. Bộ chọn trên điện thoại hiển thị tên nhiều dòng khi cần và vẫn dùng trình chọn gốc của thiết bị.

`npm run data:scenarios` đồng thời tạo `src/data/economics-overview.json`: 16 dòng kịch bản bình quân 2027–2050 và 1 dòng hiện trạng 2016–2022, ghi rõ giai đoạn tại từng dòng/thẻ. Hai CSV không được cộng dồn; không quy đổi tỷ giá. Các chỉ số là trung bình cộng bản ghi của từng kịch bản. Riêng ROI trong bảng tổng quan tính bằng **thu nhập ròng bình quân / chi phí sản xuất bình quân × 100%**, đúng cách tính trong ảnh bảng tổng quan (75,64% và 43,40% ở hai dòng đầu). Cách tính này khác trung bình ROI từng bản ghi ở trang Chi tiết kịch bản. Thiếu số liệu giữ `null`, số 0 được giữ nguyên; ROI không tính khi chi phí không dương. JSON và trang được tải riêng khi mở, không tải CSV gốc trong trình duyệt.

## So sánh kinh tế

Trang `#economics-comparison` gồm 5 biểu đồ cột: thu nhập ròng, giá trị rơm, chi phí sản xuất, năng suất và cường độ lao động trung bình. Bộ lọc thời tiết (tất cả, khắc nghiệt, bình thường) và tài nguyên (tất cả, thiếu tài nguyên, bình thường) kết hợp trên cả 5 biểu đồ. Mặc định xem tất cả; đổi ngôn ngữ giữ bộ lọc. Hai cột so sánh thường lệ (đỏ) và 1Mha (xanh), có nhãn giá trị và tooltip kèm đơn vị. Các giá trị cũng hiển thị bên dưới biểu đồ để đọc trên điện thoại và bằng công cụ hỗ trợ. Máy tính có hai cột biểu đồ; điện thoại một cột. Trục cột bắt đầu từ 0, bao gồm giá trị âm nếu có.

Mỗi biểu đồ ghi “Giai đoạn 2027 - 2050” / “Period 2027 - 2050”. Nhận xét tổng kết nằm giữa bộ lọc và các biểu đồ, gồm một đoạn văn với số liệu in đậm; cập nhật theo bộ lọc và ngôn ngữ. Đoạn nhận xét đối chiếu cả 5 chỉ số, ưu tiên 1Mha khi có lợi thế thu nhập và nêu nhu cầu về vốn, lao động hoặc năng suất theo số liệu. Mức chênh lệch dùng tỷ lệ so với trị tuyệt đối của thường lệ; nền bằng 0 dùng chênh lệch tuyệt đối, số liệu thiếu không suy diễn thành 0.

`npm run data:scenarios` tạo thêm `src/data/economics-comparison.json` với 9 tổ hợp bộ lọc từ hai CSV. Tính trung bình mọi bản ghi phù hợp trong 2027–2050 theo từng nhóm, không lấy trung bình không trọng số của các trung bình kịch bản. Nguồn không có năm 2026; các bản ghi lịch sử 2016–2022 được loại. Thu nhập, rơm và chi phí dùng VNĐ/ha từ Dữ liệu tổng khi chọn tiếng Việt, USD/ha từ Master file khi chọn tiếng Anh; rơm có đơn vị trên hecta như trang Bảng thông tin. Số 0 và âm thật được giữ nguyên, số liệu trống giữ `null`. Trang và Recharts được tải khi mở trang, không tải CSV gốc trong trình duyệt.

## So sánh BAU 3 vụ, BAU 2 vụ và BAU bền vững với 1Mha

Kinh tế → So sánh → BAU3S vs 1Mha mở `#economics-bau3-vs-1mha`. Trang có 5 cặp biểu đồ đường cho thu nhập, năng suất, cường độ lao động, chi phí sản xuất và tỷ suất lợi nhuận. Máy tính đặt BAU 3 vụ bên trái, 1Mha bên phải; điện thoại xếp từng cặp theo chiều dọc. Các biểu đồ dùng font, kích thước tiêu đề và màu nền của website. Bốn tổ hợp dùng cùng màu ở cả hai nhóm: khắc nghiệt–thiếu tài nguyên màu xanh dương, khắc nghiệt–tài nguyên bình thường màu tím, bình thường–thiếu tài nguyên màu cam, bình thường–tài nguyên bình thường màu xanh lá. Nhãn tên BAU vẫn đỏ và 1Mha xanh. Đường nối thẳng có chấm mỗi năm, tooltip hiển thị cả bốn tổ hợp với năm và đơn vị; số liệu thiếu giữ `null` và không nối qua khoảng thiếu. Một số đường năng suất, lao động trùng nhau do có cùng giá trị, được ghi chú trên biểu đồ.

Mỗi cặp dùng chung miền trục Y tính từ tất cả giá trị của cả hai mô hình; thu nhập, chi phí và tỷ suất lợi nhuận bao gồm gốc 0 và giá trị âm nếu có. Năng suất và lao động dùng khoảng có đệm quanh số liệu để rõ biến động. Nhận xét là một đoạn dưới mỗi cặp, trước chỉ số tiếp theo; số liệu trong đoạn được in đậm. So sánh trung bình các năm có dữ liệu ở cả hai mô hình trong từng tổ hợp, nêu số tổ hợp cao/thấp hơn, mức chênh lệch và kết quả năm cuối có dữ liệu chung. Chênh lệch tỷ suất lợi nhuận dùng **điểm phần trăm**. Kết luận trình bày lợi ích thu nhập, khả năng sinh lời cùng đánh đổi về vốn, năng suất và lao động, thay đổi theo dữ liệu.

`npm run data:scenarios` tạo `src/data/economics-bau3-series.json`: 8 chuỗi (2 mô hình × 4 tổ hợp), 24 năm từ 2027–2050, với số liệu gốc USD và VNĐ riêng. BAU chỉ lấy `Scenario Group = Business As Usual / Thường lệ` và `Season Type = 3 Seasons / 3 vụ`, loại 2 vụ, bền vững và dữ liệu lịch sử. Mỗi điểm là trung bình bản ghi trong cùng năm, cùng mô hình và cùng tổ hợp. Trang và dữ liệu được tải riêng khi mở; không xử lý CSV gốc trong trình duyệt.

Hai trang còn lại trong Kinh tế → So sánh sử dụng cùng `BauComparisonPage`, kiểu chữ, bảng màu, 5 cặp biểu đồ và nhận xét theo số liệu. BAU2S vs 1Mha mở `#economics-bau2-vs-1mha`, chỉ lấy thường lệ có `Season Type = 2 Seasons / 2 vụ`; dữ liệu nằm tại `economics-bau2-series.json`. BAUSS vs 1Mha mở `#economics-bauss-vs-1mha`, chỉ lấy thường lệ có `Season Type = Sustainable / Bền vững`; dữ liệu nằm tại `economics-bauss-series.json`. Cả hai JSON cũng được tạo trước dev/build, mỗi file có 8 chuỗi trong 2027–2050. Chuỗi 1Mha giống nhau ở cả ba trang; tên mô hình gốc, số liệu và nhận xét thay đổi theo từng trang. Nhận xét BAU 2 vụ phản ánh nhu cầu lao động cao hơn và năng suất thấp hơn của 1Mha khi số liệu cho thấy như vậy. Các trang và dữ liệu được tải riêng khi mở liên kết tương ứng.

Kinh tế → Canh tác như thường lệ → 3 mùa vụ mở `#economics-bau3`. Trang dùng lại chuỗi BAU 3 vụ trong `economics-bau3-series.json`, loại 1Mha khỏi KPI và miền trục. Năm KPI là thu nhập ròng, chi phí sản xuất, năng suất, tỷ suất lợi nhuận và cường độ lao động: giá trị bình quân 2027–2050 có trọng số theo số bản ghi của từng tổ hợp/năm (5688 bản ghi đầy đủ chỉ số trong mỗi CSV hiện tại); biến động so sánh bình quân năm 2050 với năm 2027. Tỷ suất lợi nhuận so sánh bằng điểm phần trăm, các chỉ số khác bằng phần trăm; không tính phần trăm khi gốc bằng 0. Giảm lao động dùng màu trung tính vì cần đánh giá cùng năng suất và thu nhập. Nhận xét tổng hợp nằm trước biểu đồ; từng biểu đồ có một đoạn phân tích xu hướng, giá trị cuối kỳ theo điều kiện và kết luận. Hai cột biểu đồ trên máy tính, một cột trên điện thoại; dùng chung font, KPI, đường thẳng, chấm năm, tooltip và bảng màu bốn tổ hợp của các trang trước. Các tick năm được chia theo cùng bước từ 2027, thích ứng chiều rộng biểu đồ; dữ liệu vẫn giữ từng năm đến 2050.

Ba trang bổ sung dùng chung `FarmingPage`: 2 mùa vụ mở `#economics-bau2` (3840 bản ghi từ thường lệ 2 vụ), Bền vững mở `#economics-bauss` (5616 bản ghi từ thường lệ bền vững), Một triệu héc ta lúa mở `#economics-1mha` (3840 bản ghi thuộc riêng nhóm 1Mha). Hai trang BAU dùng cache tương ứng `economics-bau2-series.json` và `economics-bauss-series.json`; 1Mha dùng lại chuỗi 1Mha đã có trong `economics-bau3-series.json`. Mỗi trang chỉ đưa bốn chuỗi của mô hình được chọn vào KPI và miền trục, không cộng lẫn các nhóm khác. Nhận xét và tên mô hình thay đổi theo dữ liệu; tiền dùng VNĐ/USD gốc theo ngôn ngữ. Các liên kết hoạt động trong cả menu máy tính, menu điện thoại và trang Khám phá Kinh tế. Mỗi trang và dữ liệu được tải khi mở, không tải hoặc xử lý CSV gốc trong trình duyệt.
