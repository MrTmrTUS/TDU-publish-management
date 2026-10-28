/* Cấu hình hệ thống — sửa tệp này khi triển khai (xem README.md). */
window.APP_CONFIG = {
  APP_NAME: "Cổng hỗ trợ và quản lý nghiên cứu TDU",
  APP_SUB: "Hệ thống quản lý và hỗ trợ nghiên cứu khoa học",
  ORG_NAME: "Trường Đại học Thành Đông",

  // Chế độ chạy:
  //  "demo"     — chạy thử: tài khoản và dữ liệu mẫu lưu trên trình duyệt của từng người xem (khởi tạo từ data/demo.json).
  //               Mỗi người thử độc lập, không ai thấy thay đổi của ai. KHÔNG nhập dữ liệu thật ở chế độ này.
  //  "supabase" — dùng thật: tài khoản, dữ liệu và phân quyền nằm trên Supabase. Xem supabase/schema.sql và README.md.
  BACKEND: "demo",
  DEMO_DATA_URL: "data/demo.json",

  // Chỉ cho đăng ký bằng email có đuôi này (để trống = cho mọi email). Ví dụ: ["thanhdong.edu.vn"]
  ALLOWED_EMAIL_DOMAINS: [],

  // Chế độ "supabase": lấy ở Supabase › Project Settings › API.
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
