import { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  // ===== NHÓM ĐỜI SỐNG (8 Tình huống) =====
  {
    id: 'greeting',
    mode: 'daily',
    emoji: '👋',
    titleVi: 'Chào hỏi & giới thiệu bản thân',
    aiRole: 'Một người bạn Trung Quốc mới gặp',
    goalVi: 'Biết cách chào, giới thiệu tên, tuổi và quê quán Việt Nam.',
    openingHint: 'Bạn mới gặp Lão Sư Mei. Hãy chào và làm quen nhé!'
  },
  {
    id: 'restaurant',
    mode: 'daily',
    emoji: '🍜',
    titleVi: 'Gọi món ở nhà hàng',
    aiRole: 'Nhân viên phục vụ nhà hàng',
    goalVi: 'Gọi được món ăn, đồ uống (nóng/đá) và hỏi giá/thanh toán.',
    openingHint: 'Bạn bước vào quán ăn. Nhân viên đang tiến tới chào bạn.'
  },
  {
    id: 'shopping',
    mode: 'daily',
    emoji: '🛒',
    titleVi: 'Mua sắm & mặc cả',
    aiRole: 'Chủ cửa hàng quần áo / đồ lưu niệm',
    goalVi: 'Hỏi giá, chê đắt và mặc cả bớt một chút.',
    openingHint: 'Bạn đang xem đồ trong tiệm. Hãy hỏi giá món bạn thích.'
  },
  {
    id: 'taxi',
    mode: 'daily',
    emoji: '🚕',
    titleVi: 'Đi taxi / hỏi đường',
    aiRole: 'Tài xế taxi',
    goalVi: 'Nói địa điểm muốn đến, bảo rẽ trái/phải hoặc dừng lại.',
    openingHint: 'Bạn vừa lên xe taxi. Bác tài đang hỏi bạn muốn đi đâu.'
  },
  {
    id: 'hotel',
    mode: 'daily',
    emoji: '🏨',
    titleVi: 'Nhận phòng khách sạn',
    aiRole: 'Lễ tân khách sạn',
    goalVi: 'Check-in phòng đã đặt, hỏi mật khẩu wifi và giờ ăn sáng.',
    openingHint: 'Bạn đang đứng ở quầy lễ tân khách sạn để nhận phòng.'
  },
  {
    id: 'pharmacy',
    mode: 'daily',
    emoji: '🏥',
    titleVi: 'Đi khám / mua thuốc',
    aiRole: 'Dược sĩ hiệu thuốc',
    goalVi: 'Mô tả triệu chứng (đau đầu, sốt, đau bụng) và hỏi liều dùng.',
    openingHint: 'Bạn đang ở hiệu thuốc. Dược sĩ đang hỏi bạn cần mua gì.'
  },
  {
    id: 'coffee',
    mode: 'daily',
    emoji: '☕',
    titleVi: 'Làm quen, trò chuyện đời thường',
    aiRole: 'Bạn học / đồng nghiệp tại quán cà phê',
    goalVi: 'Hỏi sở thích, thói quen rảnh rỗi và hẹn lần sau gặp lại.',
    openingHint: 'Hai bạn đang ngồi tại quán cà phê trong giờ nghỉ.'
  },
  {
    id: 'free_talk',
    mode: 'daily',
    emoji: '💬',
    titleVi: 'Nói chuyện tự do',
    aiRole: 'Lão Sư Mei thân thiện',
    goalVi: 'Nói về bất kỳ chủ đề nào bạn thích, không giới hạn kịch bản.',
    openingHint: 'Bạn muốn tâm sự hoặc hỏi Mei về điều gì hôm nay?'
  },

  // ===== NHÓM CÔNG SỞ (10 Tình huống mới) =====
  {
    id: 'colleague_meet',
    mode: 'workplace',
    emoji: '🤝',
    titleVi: 'Gặp đồng nghiệp mới & giới thiệu bản thân',
    aiRole: 'Đồng nghiệp cùng phòng ban',
    goalVi: 'Giới thiệu tên, vị trí công việc, chào hỏi lịch sự ngày đầu nhận việc.',
    openingHint: 'Bạn bước vào văn phòng ngày đầu tiên và chào hỏi đồng nghiệp.'
  },
  {
    id: 'meeting',
    mode: 'workplace',
    emoji: '📅',
    titleVi: 'Họp & thảo luận công việc',
    aiRole: 'Trưởng nhóm / Chủ trì cuộc họp',
    goalVi: 'Nêu ý kiến, đồng ý / từ chối lịch sự và hỏi rõ yêu cầu công việc.',
    openingHint: 'Cuộc họp nhóm đang diễn ra, sếp vừa hỏi ý kiến của bạn.'
  },
  {
    id: 'phone_call',
    mode: 'workplace',
    emoji: '📞',
    titleVi: 'Nghe / gọi điện thoại công ty',
    aiRole: 'Khách hàng / Đối tác gọi tới công ty',
    goalVi: 'Chào chuẩn mực, chuyển máy, ghi lại lời nhắn hoặc hẹn gọi lại.',
    openingHint: 'Chuông điện thoại bàn reo. Bạn nhấc máy tiếp nhận cuộc gọi.'
  },
  {
    id: 'boss_report',
    mode: 'workplace',
    emoji: '📊',
    titleVi: 'Báo cáo tiến độ với sếp',
    aiRole: 'Sếp / Quản lý trực tiếp',
    goalVi: 'Báo cáo việc đã hoàn thành, việc đang làm và xin ý kiến chỉ đạo (dùng 您).',
    openingHint: 'Sếp gọi bạn vào phòng làm việc để hỏi tiến độ dự án tuần này.'
  },
  {
    id: 'leave_request',
    mode: 'workplace',
    emoji: '🙋',
    titleVi: 'Xin nghỉ phép / đi muộn / đổi ca',
    aiRole: 'Quản lý nhân sự / Trưởng phòng',
    goalVi: 'Nêu lý do, thời gian xin nghỉ phép/đi muộn và cách bàn giao việc.',
    openingHint: 'Bạn có việc gia đình đột xuất và cần nhắn xin phép quản lý.'
  },
  {
    id: 'job_interview',
    mode: 'workplace',
    emoji: '💼',
    titleVi: 'Phỏng vấn xin việc',
    aiRole: 'Người phỏng vấn tuyển dụng (HR)',
    goalVi: 'Trả lời kinh nghiệm làm việc, điểm mạnh và lý do ứng tuyển.',
    openingHint: 'Người phỏng vấn mỉm cười và mời bạn giới thiệu về bản thân.'
  },
  {
    id: 'quotation_negotiation',
    mode: 'workplace',
    emoji: '🧾',
    titleVi: 'Báo giá, đàm phán với đối tác',
    aiRole: 'Đại diện đối tác thương mại',
    goalVi: 'Hỏi số lượng, trao đổi đơn giá, thời gian giao hàng và điều khoản.',
    openingHint: 'Bạn đang đàm phán hợp đồng cung ứng với đối tác mới.'
  },
  {
    id: 'customer_complaint',
    mode: 'workplace',
    emoji: '🛠',
    titleVi: 'Xử lý phàn nàn / sự cố của khách hàng',
    aiRole: 'Khách hàng đang bức xúc về dịch vụ',
    goalVi: 'Lắng nghe, xin lỗi chân thành, giải thích nguyên nhân và đưa phương án bù đắp.',
    openingHint: 'Khách hàng liên hệ khiếu nại vì đơn hàng bị giao trễ.'
  },
  {
    id: 'lunch_gathering',
    mode: 'workplace',
    emoji: '🍻',
    titleVi: 'Ăn trưa, liên hoan cùng đồng nghiệp',
    aiRole: 'Nhóm bạn đồng nghiệp trong công ty',
    goalVi: 'Giao lưu gần gũi, nói chuyện sở thích, đồ ăn và văn hóa công ty.',
    openingHint: 'Giờ nghỉ trưa, mọi người rủ nhau đi ăn tại nhà hàng gần công ty.'
  },
  {
    id: 'workplace_free',
    mode: 'workplace',
    emoji: '💬',
    titleVi: 'Công sở tự do',
    aiRole: 'Cố vấn nghề nghiệp Trung Quốc',
    goalVi: 'Thoải mái trò chuyện về mọi tình huống văn phòng, tiếng lóng công sở.',
    openingHint: 'Bạn muốn luyện tập hoặc hỏi Mei về tình huống công sở nào?'
  }
];
