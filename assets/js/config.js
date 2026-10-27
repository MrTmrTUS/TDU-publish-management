/* Cấu hình hệ thống — sửa tệp này khi triển khai (xem README.md). */
window.APP_CONFIG = {
  APP_NAME: "Theo dõi nghiên cứu & công bố",
  APP_SHORT: "Dashboard NCKH",
  ORG_NAME: "Trường Đại học Thành Đông",

  // Nơi lưu dữ liệu:
  //  "static"   — CHỈ DÙNG CHO BẢN THỬ VỚI DỮ LIỆU GIẢ ĐỊNH. Dữ liệu là tệp data/data.json trong repo (ai biết đường
  //               dẫn đều tải được). Quản trị viên sửa trên trình duyệt (bản nháp lưu trên máy), rồi "Xuất bản" để tải
  //               data.json mới và đưa lên GitHub. Không cần máy chủ.
  //  "supabase" — dùng cho dữ liệu thật: dữ liệu và tài khoản nằm trên Supabase, chỉ người đã đăng nhập mới đọc được;
  //               sửa là lưu ngay. Xem supabase/schema.sql và README.md.
  BACKEND: "static",
  DATA_URL: "data/data.json",

  // Chế độ "static": tài khoản quản trị viên. Mật khẩu lưu dạng SHA-256 (mặc định: Tdu@2026).
  // Đổi mật khẩu tại Cấu hình › Tài khoản, rồi dán mã băm mới vào đây. Lưu ý: chế độ static chỉ chặn ở giao diện,
  // không phải bảo mật máy chủ.
  LOCAL_ADMIN: {
    username: "admin",
    passwordSha256: "3c37bd765be6aedb9afe3e3a57bce1ff4f8e54e1c488b5e6ecbcc83652dca75e"
  },

  // Chế độ "supabase": lấy ở Supabase › Project Settings › API.
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Đường dẫn repo, dùng cho nút "Mở trang tải lên GitHub" khi xuất bản ở chế độ static.
  REPO_URL: "https://github.com/MrTmrTUS/TDU-publish-management",
  REPO_BRANCH: "main"
};
