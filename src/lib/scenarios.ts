import { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'greeting',
    emoji: '👋',
    titleVi: 'Chào hỏi & giới thiệu bản thân',
    aiRole: 'Một người bạn Trung Quốc mới gặp',
    goalVi: 'Biết cách chào, giới thiệu tên, tuổi và quê quán Việt Nam.',
    openingHint: 'Bạn mới gặp Lão Sư Mei. Hãy chào và làm quen nhé!'
  },
  {
    id: 'restaurant',
    emoji: '🍜',
    titleVi: 'Gọi món ở nhà hàng',
    aiRole: 'Nhân viên phục vụ nhà hàng',
    goalVi: 'Gọi được món ăn, đồ uống (nóng/đá) và hỏi giá/thanh toán.',
    openingHint: 'Bạn bước vào quán ăn. Nhân viên đang tiến tới chào bạn.'
  },
  {
    id: 'shopping',
    emoji: '🛒',
    titleVi: 'Mua sắm & mặc cả',
    aiRole: 'Chủ cửa hàng quần áo / đồ lưu niệm',
    goalVi: 'Hỏi giá, chê đắt và mặc cả bớt một chút.',
    openingHint: 'Bạn đang xem đồ trong tiệm. Hãy hỏi giá món bạn thích.'
  },
  {
    id: 'taxi',
    emoji: '🚕',
    titleVi: 'Đi taxi / hỏi đường',
    aiRole: 'Tài xế taxi',
    goalVi: 'Nói địa điểm muốn đến, bảo rẽ trái/phải hoặc dừng lại.',
    openingHint: 'Bạn vừa lên xe taxi. Bác tài đang hỏi bạn muốn đi đâu.'
  },
  {
    id: 'hotel',
    emoji: '🏨',
    titleVi: 'Nhận phòng khách sạn',
    aiRole: 'Lễ tân khách sạn',
    goalVi: 'Check-in phòng đã đặt, hỏi mật khẩu wifi và giờ ăn sáng.',
    openingHint: 'Bạn đang đứng ở quầy lễ tân khách sạn để nhận phòng.'
  },
  {
    id: 'pharmacy',
    emoji: '🏥',
    titleVi: 'Đi khám / mua thuốc',
    aiRole: 'Dược sĩ tại hiệu thuốc',
    goalVi: 'Mô tả triệu chứng đơn giản (đau đầu, sốt, đau bụng) và mua thuốc.',
    openingHint: 'Bạn bị ốm nhẹ và ghé hiệu thuốc để nhờ dược sĩ tư vấn.'
  },
  {
    id: 'coffee',
    emoji: '☕',
    titleVi: 'Làm quen, trò chuyện đời thường',
    aiRole: 'Bạn học / đồng nghiệp cùng quán cà phê',
    goalVi: 'Hỏi thăm sở thích, thời tiết, cuối tuần làm gì.',
    openingHint: 'Hai người đang ngồi uống trà sữa/cà phê tán gẫu nhẹ nhàng.'
  },
  {
    id: 'free_talk',
    emoji: '💬',
    titleVi: 'Nói chuyện tự do',
    aiRole: 'Lão Sư Mei - gia sư trò chuyện vui tính',
    goalVi: 'Thoải mái trò chuyện về bất kỳ chủ đề nào bạn thích.',
    openingHint: 'Không có kịch bản định sẵn. Bạn muốn nói gì Mei cũng chiều!'
  }
];

