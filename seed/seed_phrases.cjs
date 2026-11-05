const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

// Đọc service role key từ .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env.SUPABASE_URL || 'https://lamhrbavfyhffeihyxdz.supabase.co';
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('dán_')) {
  console.error('Lỗi: Chưa có SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

// Hàm sinh pinyin chuẩn có dấu thanh
function getPinyin(text) {
  return pinyin(text, { toneType: 'symbol', type: 'string' });
}

// 12 Nhóm Đời Sống
const DAILY_GROUPS = [
  {
    slug: 'greeting',
    emoji: '👋',
    titleVi: 'Chào hỏi & Xã giao cơ bản',
    sort: 1,
    pairs: [
      { q: '你好！', a: '你好！很高兴见到你。', note: 'Chào hỏi cơ bản nhất trong tiếng Trung' },
      { q: '你好吗？', a: '我很好，你呢？', note: 'Hỏi thăm sức khỏe quen thuộc' },
      { q: '早安！今天怎么样？', a: '早上好！今天心情很不错。', note: 'Chào buổi sáng thân mật' },
      { q: '明天见！', a: '好的，明天见！路上小心。', note: 'Hẹn gặp lại ngày mai' },
      { q: '最近忙吗？', a: '还可以，不算太忙。', note: 'Cách hỏi thăm tiến độ cuộc sống' },
      { q: '你吃了吗？', a: '我刚吃饱，你吃了没有？', note: 'Câu chào hỏi truyền thống của người Trung' },
    ]
  },
  {
    slug: 'self_intro',
    emoji: '🙋',
    titleVi: 'Giới thiệu bản thân & Quê quán',
    sort: 2,
    pairs: [
      { q: '你叫什么名字？', a: '我叫小明，你呢？', note: 'Câu hỏi tên cơ bản' },
      { q: '你是哪国人？', a: '我是越南人，来自河内。', note: 'Hỏi quốc tịch và quê quán' },
      { q: '你今年多大了？', a: '我今年二十五岁。', note: 'Hỏi tuổi người đồng trang lứa' },
      { q: '你在做什么工作？', a: '我是程序员，在一家科技公司上班。', note: 'Hỏi nghề nghiệp' },
      { q: '你学中文多久了？', a: '我刚学了半年左右。', note: 'Nói về thời gian học tiếng' },
      { q: '你家有几口人？', a: '我家有四口人：爸妈、妹妹和我。', note: 'Giới thiệu về gia đình' },
    ]
  },
  {
    slug: 'dining',
    emoji: '🍜',
    titleVi: 'Ăn uống & Gọi món ở nhà hàng',
    sort: 3,
    pairs: [
      { q: '服务员，请问有菜单吗？', a: '有的，这是菜单，请问几位？', note: 'Gọi phục vụ và xin thực đơn' },
      { q: '这个菜辣不辣？', a: '这个菜有点儿辣，微辣可以吗？', note: 'Hỏi độ cay của món ăn' },
      { q: '我要一杯冰奶茶，少糖。', a: '好的，一杯冰奶茶，七分甜，请稍等。', note: 'Tùy chỉnh độ ngọt/đá khi gọi nước' },
      { q: '这里的招牌菜是什么？', a: '我们的烤鸭和麻婆豆腐很有名。', note: 'Hỏi món đặc sản, bán chạy' },
      { q: '服务员，买单！一共多少钱？', a: '一共一百二十块钱，微信还是支付宝？', note: 'Kêu tính tiền và hỏi phương thức trả' },
      { q: '可以帮我打包吗？', a: '没问题，请稍等我拿打包盒。', note: 'Xin đóng gói mang về' },
    ]
  },
  {
    slug: 'shopping',
    emoji: '🛒',
    titleVi: 'Mua sắm & Trả giá',
    sort: 4,
    pairs: [
      { q: '这个多少钱一件？', a: '这个八十块钱一件。', note: 'Hỏi giá tiền đồ vật' },
      { q: '太贵了，可以便宜一点儿吗？', a: '如果你买两件，给你打八折。', note: 'Câu mặc cả thông dụng nhất' },
      { q: '请问有大一号的吗？', a: '有的，请稍等我进库房拿给你。', note: 'Hỏi đổi kích cỡ (size)' },
      { q: '我可以试穿一下吗？', a: '可以的，试衣间在那边。', note: 'Hỏi thử đồ quần áo' },
      { q: '这个能刷信用卡吗？', a: '可以刷卡，也可以扫码支付。', note: 'Hỏi thanh toán quẹt thẻ' },
    ]
  },
  {
    slug: 'taxi_direction',
    emoji: '🚕',
    titleVi: 'Đi taxi, hỏi đường & Đi lại',
    sort: 5,
    pairs: [
      { q: '师傅，去机场要多少钱？', a: '打表大概六十块钱左右。', note: 'Hỏi tài xế taxi giá tiền đi xe' },
      { q: '请问去地铁站怎么走？', a: '一直往前走，在第二个路口向右拐。', note: 'Chỉ dẫn đường đi bộ' },
      { q: '师傅，请在前面的路口停一下。', a: '好的，请带好随身物品。', note: 'Bảo tài xế dừng xe trả khách' },
      { q: '到火车站还要多长时间？', a: '大概二十分钟，前面稍微有点堵车。', note: 'Hỏi thời gian di chuyển' },
    ]
  },
  {
    slug: 'hotel',
    emoji: '🏨',
    titleVi: 'Khách sạn & Nhận phòng',
    sort: 6,
    pairs: [
      { q: '你好，我预订了一间大床房。', a: '请出示您的护照，我帮您查一下。', note: 'Làm thủ tục check-in phòng đã đặt' },
      { q: '请问无线网密码是多少？', a: '密码在房卡背面，全小写字母。', note: 'Hỏi mật khẩu Wifi' },
      { q: '早餐是几点到几点？', a: '早餐在二楼餐厅，早上七点到九点半。', note: 'Hỏi giờ và địa điểm ăn sáng' },
      { q: '我可以把行李寄存在这里吗？', a: '当然可以，退房后免费寄存到下午六点。', note: 'Gửi nhờ hành lý ở sảnh' },
    ]
  },
  {
    slug: 'health',
    emoji: '🏥',
    titleVi: 'Sức khỏe & Khám bệnh / Mua thuốc',
    sort: 7,
    pairs: [
      { q: '你哪里不舒服？', a: '我头疼，还有点儿发烧。', note: 'Bác sĩ hoặc người khác hỏi thăm triệu chứng' },
      { q: '这个药一天吃几次？', a: '一天吃三次，每次饭后吃两片。', note: 'Hỏi liều lượng dùng thuốc' },
      { q: '请问附近有医院吗？', a: '出门向左走两百米就有一家人民医院。', note: 'Hỏi vị trí bệnh viện gần nhất' },
    ]
  },
  {
    slug: 'politeness',
    emoji: '🙏',
    titleVi: 'Cảm ơn, xin lỗi & Từ chối lịch sự',
    sort: 8,
    pairs: [
      { q: '谢谢你的帮忙！', a: '不客气，不用谢！举手之劳。', note: 'Cảm ơn và đáp lại lịch thiệp' },
      { q: '对不起，我来晚了。', a: '没关系，我也刚到不久。', note: 'Xin lỗi khi đi trễ' },
      { q: '今晚一起去唱歌好吗？', a: '不好意思，我今晚有点急事，下次吧。', note: 'Từ chối lời mời khéo léo' },
      { q: '打扰一下，请问洗手间在哪儿？', a: '顺着走廊直走，左手边就是。', note: 'Hỏi đường lịch sự kèm câu mở đầu' },
    ]
  }
];

// 8 Nhóm Công Sở
const WORKPLACE_GROUPS = [
  {
    slug: 'meeting_wp',
    emoji: '📅',
    titleVi: 'Họp hành & Thảo luận công việc',
    sort: 1,
    pairs: [
      { q: '今天的会议主要讨论什么？', a: '主要讨论下个季度的产品推广方案。', note: 'Hỏi nội dung trọng tâm cuộc họp' },
      { q: '各位对这个方案有什么意见吗？', a: '我觉得整体不错，但是预算可能需要调整。', note: 'Xin ý kiến đóng góp' },
      { q: '请问会议几点开始？', a: '下午两点半在三号会议室准时开始。', note: 'Hỏi giờ và phòng họp' },
      { q: '这个项目的截止日期是哪天？', a: '预计在下周五之前必须交付初稿。', note: 'Hỏi hạn chót hoàn thành (deadline)' },
    ]
  },
  {
    slug: 'report_wp',
    emoji: '📊',
    titleVi: 'Báo cáo tiến độ với sếp (dùng 您)',
    sort: 2,
    pairs: [
      { q: '李总，这是本周的工作汇报，请您过目。', a: '好的，放我桌上吧，我下午看完给你反馈。', note: 'Trình báo cáo lịch sự với sếp' },
      { q: '项目进展顺利吗？有没有遇到困难？', a: '目前按计划进行，客户那边已经确认了需求。', note: 'Báo cáo tình hình thuận lợi' },
      { q: '请问您对这份报告有什么修改意见吗？', a: '第三部分的图表数据需要再核实一下。', note: 'Hỏi ý kiến chỉnh sửa của cấp trên' },
    ]
  },
  {
    slug: 'leave_wp',
    emoji: '🙋',
    titleVi: 'Xin nghỉ phép / Đi muộn / Đổi ca',
    sort: 3,
    pairs: [
      { q: '张经理，我明天家里有急事，想请一天事假。', a: '好的，请在系统里提交一下请假单。', note: 'Xin phép nghỉ 1 ngày vì việc riêng' },
      { q: '路上堵车很严重，我可能会迟到十五分钟。', a: '收到，路上注意安全，到了先打卡。', note: 'Báo trước khi đi trễ do kẹt xe' },
      { q: '请问我可以和周师傅换一下周末的班吗？', a: '你们两位沟通好并且签个字就可以。', note: 'Xin đổi ca trực' },
    ]
  },
  {
    slug: 'phone_wp',
    emoji: '📞',
    titleVi: 'Nghe / gọi điện thoại công ty',
    sort: 4,
    pairs: [
      { q: '您好，这里是华星科技，请问有什么可以帮您？', a: '您好，请帮我转接一下销售部王经理。', note: 'Chào chuẩn mực khi nhấc máy bàn công ty' },
      { q: '王经理现在在开会，需要我帮您留言吗？', a: '好的，请让他开完会给我回个电话。', note: 'Báo bận và đề nghị ghi lời nhắn' },
      { q: '请问您怎么称呼？您的电话号码是多少？', a: '我姓陈，电话是13800138000。', note: 'Hỏi tên và số điện thoại người gọi' },
    ]
  },
  {
    slug: 'colleague_wp',
    emoji: '🤝',
    titleVi: 'Gặp đồng nghiệp mới & Giới thiệu',
    sort: 5,
    pairs: [
      { q: '大家好，我是今天新入职的阮文明。', a: '欢迎加入我们团队！以后多多关照。', note: 'Chào hỏi đồng nghiệp ngày đầu nhận việc' },
      { q: '中午要不要一起去楼下吃快餐？', a: '太好了，我正好不知道附近有什么好吃的。', note: 'Rủ đồng nghiệp đi ăn trưa' },
      { q: '这个打印机怎么用？能教我一下吗？', a: '没问题，先按这个绿色的启动键。', note: 'Nhờ vả đồng nghiệp việc nhỏ' },
    ]
  },
  {
    slug: 'partner_wp',
    emoji: '🧾',
    titleVi: 'Làm việc với đối tác & Khách hàng',
    sort: 6,
    pairs: [
      { q: '王总，很荣幸能与贵公司合作。', a: '我们也非常期待这次的双赢合作。', note: 'Chào mừng đối tác làm ăn' },
      { q: '请问最快什么时候可以交货？', a: '合同签订并收到预付款后十五天内发货。', note: 'Thỏa thuận thời gian giao hàng' },
      { q: '我们希望能在价格上再给一点优惠。', a: '如果订购数量超过一千件，我们可以给九折。', note: 'Đàm phán chiết khấu số lượng lớn' },
    ]
  }
];

// Hàm dịch tiếng Việt cho câu hỏi và câu trả lời
const TRANSLATIONS = {
  // Chào hỏi
  '你好！': 'Xin chào!',
  '你好！很高兴见到你。': 'Chào bạn! Rất vui được gặp bạn.',
  '你好吗？': 'Bạn khỏe không?',
  '我很好，你呢？': 'Tôi rất khỏe, còn bạn thì sao?',
  '早安！今天怎么样？': 'Chào buổi sáng! Hôm nay thế nào rồi?',
  '早上好！今天心情很不错。': 'Chào buổi sáng! Hôm nay tâm trạng tôi rất tốt.',
  '明天见！': 'Hẹn gặp lại ngày mai nhé!',
  '好的，明天见！路上小心。': 'Được, mai gặp lại! Đi đường cẩn thận nhé.',
  '最近忙吗？': 'Dạo này bạn có bận không?',
  '还可以，不算太忙。': 'Cũng bình thường, không bận lắm.',
  '你吃了吗？': 'Bạn ăn cơm chưa?',
  '我刚吃饱，你吃了没有？': 'Tôi vừa ăn no rồi, bạn đã ăn chưa?',

  // Giới thiệu
  '你叫什么名字？': 'Bạn tên là gì?',
  '我叫小明，你呢？': 'Tôi tên là Tiểu Minh, còn bạn?',
  '你是哪国人？': 'Bạn là người nước nào?',
  '我是越南人，来自河内。': 'Tôi là người Việt Nam, đến từ Hà Nội.',
  '你今年多大了？': 'Năm nay bạn bao nhiêu tuổi rồi?',
  '我今年二十五岁。': 'Năm nay tôi 25 tuổi.',
  '你在做什么工作？': 'Bạn đang làm công việc gì?',
  '我是程序员，在一家科技公司上班。': 'Tôi là lập trình viên, làm việc tại một công ty công nghệ.',
  '你学中文多久了？': 'Bạn học tiếng Trung được bao lâu rồi?',
  '我刚学了半年左右。': 'Tôi mới học được khoảng nửa năm.',
  '你家有几口人？': 'Nhà bạn có mấy người?',
  '我家有四口人：爸妈、妹妹和我。': 'Nhà tôi có 4 người: bố mẹ, em gái và tôi.',

  // Ăn uống
  '服务员，请问有菜单吗？': 'Phục vụ ơi, cho tôi xin thực đơn với?',
  '有的，这是菜单，请问几位？': 'Có ạ, đây là thực đơn, xin hỏi quý khách đi mấy người?',
  '这个菜辣不辣？': 'Món ăn này có cay không?',
  '这个菜有点儿辣，微辣可以吗？': 'Món này hơi cay một chút, cay nhẹ được không ạ?',
  '我要一杯冰奶茶，少糖。': 'Cho tôi một ly trà sữa đá, ít đường.',
  '好的，一杯冰奶茶，七分甜，请稍等。': 'Dạ vâng, một trà sữa đá 70% ngọt, xin đợi chút.',
  '这里的招牌菜是什么？': 'Món đặc sản/bán chạy nhất ở đây là gì?',
  '我们的烤鸭和麻婆豆腐很有名。': 'Vịt quay và đậu hũ Ma Bà ở quán chúng tôi rất nổi tiếng.',
  '服务员，买单！一共多少钱？': 'Phục vụ ơi, tính tiền! Tổng cộng bao nhiêu tiền?',
  '一共一百二十块钱，微信还是支付宝？': 'Tổng cộng là 120 tệ, bạn trả qua WeChat hay Alipay?',
  '可以帮我打包吗？': 'Có thể gói mang về giúp tôi được không?',
  '没问题，请稍等我拿打包盒。': 'Không vấn đề gì, xin đợi một lát tôi lấy hộp xốp.',

  // Mua sắm
  '这个多少钱一件？': 'Cái này bao nhiêu tiền một chiếc vậy?',
  '这个八十块钱一件。': 'Cái này 80 tệ một chiếc bạn nhé.',
  '太贵了，可以便宜一点儿吗？': 'Đắt quá, có thể giảm giá một chút được không?',
  '如果你买两件，给你打八折。': 'Nếu bạn mua 2 chiếc, tôi giảm cho bạn 20% (tính 80% giá).',
  '请问有大一号的吗？': 'Cho tôi hỏi có kích cỡ lớn hơn một số không?',
  '有的，请稍等我进库房拿给你。': 'Có ạ, xin đợi chút tôi vào kho lấy cho bạn.',
  '我可以试穿一下吗？': 'Tôi có thể mặc thử một chút được không?',
  '可以的，试衣间在那边。': 'Được chứ, phòng thay đồ ở phía bên kia.',
  '这个能刷信用卡吗？': 'Cái này có quẹt thẻ tín dụng được không?',
  '可以刷卡，也可以扫码支付。': 'Có thể quẹt thẻ, hoặc quét mã QR thanh toán đều được.',

  // Taxi & đường xá
  '师傅，去机场要多少钱？': 'Bác tài ơi, đi ra sân bay hết bao nhiêu tiền?',
  '打表大概六十块钱左右。': 'Bấm đồng hồ thì khoảng tầm 60 tệ.',
  '请问去地铁站怎么走？': 'Cho hỏi đi đến ga tàu điện ngầm đi đường nào?',
  '一直往前走，在第二个路口向右拐。': 'Cứ đi thẳng về phía trước, đến ngã rẽ thứ hai thì rẽ phải.',
  '师傅，请在前面的路口停一下。': 'Bác tài ơi, làm phiền cho tôi dừng ở ngã tư phía trước nhé.',
  '好的，请带好随身物品。': 'Được rồi, bạn nhớ cầm theo đồ đạc tư trang nhé.',
  '到火车站还要多长时间？': 'Đến ga xe lửa còn mất bao lâu nữa?',
  '大概二十分钟，前面稍微有点堵车。': 'Khoảng 20 phút nữa, phía trước hơi tắc đường một chút.',

  // Khách sạn
  '你好，我预订了一间大床房。': 'Xin chào, tôi đã đặt trước một phòng giường lớn đơn.',
  '请出示您的护照，我帮您查一下。': 'Xin vui lòng xuất trình hộ chiếu, tôi kiểm tra giúp bạn.',
  '请问无线网密码是多少？': 'Cho tôi hỏi mật khẩu Wifi ở đây là gì?',
  '密码在房卡背面，全小写字母。': 'Mật khẩu ở mặt sau thẻ phòng, toàn bộ là chữ thường.',
  '早餐是几点到几点？': 'Bữa sáng phục vụ từ mấy giờ đến mấy giờ?',
  '早餐在二楼餐厅，早上七点到九点半。': 'Bữa sáng ở nhà hàng tầng 2, từ 7h00 đến 9h30 sáng.',
  '我可以把行李寄存在这里吗？': 'Tôi có thể gửi nhờ hành lý ở đây được không?',
  '当然可以，退房后免费寄存到下午六点。': 'Tất nhiên rồi, sau khi trả phòng gửi miễn phí đến 18h.',

  // Khám bệnh
  '你哪里不舒服？': 'Bạn cảm thấy khó chịu ở chỗ nào?',
  '我头疼，还有点儿发烧。': 'Tôi bị đau đầu, lại còn hơi sốt nữa.',
  '这个药一天吃几次？': 'Thuốc này uống mỗi ngày mấy lần?',
  '一天吃三次，每次饭后吃两片。': 'Một ngày uống 3 lần, mỗi lần 2 viên sau bữa ăn.',
  '请问附近有医院吗？': 'Cho hỏi quanh đây có bệnh viện nào không?',
  '出门向左走两百米就有一家人民医院。': 'Ra khỏi cửa rẽ trái đi 200m là có Bệnh viện Nhân dân.',

  // Lịch sự
  '谢谢你的帮忙！': 'Cảm ơn sự giúp đỡ nhiệt tình của bạn nhé!',
  '不客气，不用谢！举手之劳。': 'Không có chi, đừng khách sáo! Chuyện nhỏ nhặt thôi mà.',
  '对不起，我来晚了。': 'Xin lỗi mọi người, tôi đến muộn mất rồi.',
  '没关系，我也刚到不久。': 'Không sao đâu, tôi cũng vừa mới tới thôi.',
  '今晚一起去唱歌好吗？': 'Tối nay đi hát karaoke cùng nhau được không?',
  '不好意思，我今晚有点急事，下次吧。': 'Ngại quá, tối nay tôi có chút việc bận đột xuất, để dịp sau nhé.',
  '打扰一下，请问洗手间在哪儿？': 'Xin làm phiền chút, cho hỏi nhà vệ sinh ở đâu ạ?',
  '顺着走廊直走，左手边就是。': 'Đi thẳng dọc theo hành lang, phía tay trái là tới.',

  // Công sở: Họp
  '今天的会议主要讨论什么？': 'Cuộc họp hôm nay chủ yếu thảo luận về vấn đề gì?',
  '主要讨论下个季度的产品推广方案。': 'Chủ yếu thảo luận phương án quảng bá sản phẩm quý tới.',
  '各位对这个方案有什么意见吗？': 'Mọi người có ý kiến đóng góp gì cho phương án này không?',
  '我觉得整体不错，但是预算可能需要调整。': 'Tôi thấy tổng thể rất tốt, nhưng ngân sách có thể cần điều chỉnh.',
  '请问会议几点开始？': 'Xin hỏi cuộc họp mấy giờ bắt đầu?',
  '下午两点半在三号会议室准时开始。': 'Đúng 2h30 chiều tại phòng họp số 3 bắt đầu.',
  '这个项目的截止日期是哪天？': 'Hạn chót hoàn thành (deadline) dự án này là ngày nào?',
  '预计在下周五之前必须交付初稿。': 'Dự kiến trước thứ Sáu tuần tới bắt buộc phải nộp bản thảo đầu tiên.',

  // Công sở: Báo cáo sếp
  '李总，这是本周的工作汇报，请您过目。': 'Chào Giám đốc Lý, đây là báo cáo công việc tuần này, xin mời sếp xem qua.',
  '好的，放我桌上吧，我下午看完给你反馈。': 'Được rồi, cứ để trên bàn tôi, chiều tôi xem xong sẽ phản hồi.',
  '项目进展顺利吗？有没有遇到困难？': 'Tiến độ dự án có thuận lợi không? Có gặp khó khăn gì không?',
  '目前按计划进行，客户那边已经确认了需求。': 'Hiện tại đang tiến hành đúng kế hoạch, phía khách hàng đã chốt xong yêu cầu.',
  '请问您对这份报告有什么修改意见吗？': 'Xin hỏi sếp có ý kiến chỉnh sửa gì cho bản báo cáo này không ạ?',
  '第三部分的图表数据需要再核实一下。': 'Số liệu biểu đồ ở phần 3 cần được xác minh lại một lần nữa.',

  // Công sở: Nghỉ phép
  '张经理，我明天家里有急事，想请一天事假。': 'Thưa Trưởng phòng Trương, mai nhà tôi có việc gấp, tôi muốn xin nghỉ phép 1 ngày.',
  '好的，请在系统里提交一下请假单。': 'Được rồi, bạn nhớ nộp đơn xin nghỉ phép lên hệ thống nhé.',
  '路上堵车很严重，我可能会迟到十五分钟。': 'Đường tắc dữ quá, tôi có thể sẽ đến muộn khoảng 15 phút.',
  '收到，路上注意安全，到了先打卡。': 'Đã nhận tin, đi đường cẩn thận nhé, tới nơi nhớ chấm công trước.',
  '请问我可以和周师傅换一下周末的班吗？': 'Cho hỏi tôi có thể đổi ca trực cuối tuần với anh Chu được không?',
  '你们两位沟通好并且签个字就可以。': 'Hai người bàn bạc thống nhất xong ký xác nhận là được.',

  // Công sở: Điện thoại
  '您好，这里是华星科技，请问有什么可以帮您？': 'Kính chào quý khách, đây là Công ty Hoa Tinh, xin hỏi tôi có thể giúp gì cho bạn?',
  '您好，请帮我转接一下销售部王经理。': 'Xin chào, làm phiền chuyển máy giúp tôi tới Quản lý Vương phòng Kinh doanh.',
  '王经理现在在开会，需要我帮您留言吗？': 'Quản lý Vương đang họp, bạn có cần tôi ghi lại lời nhắn không?',
  '好的，请让他开完会给我回个电话。': 'Được, nhờ bạn bảo anh ấy họp xong gọi lại cho tôi một cuộc.',
  '请问您怎么称呼？您的电话号码是多少？': 'Xin hỏi quý khách xưng hô thế nào? Số điện thoại của bạn là bao nhiêu?',
  '我姓陈，电话是13800138000。': 'Tôi họ Trần, số điện thoại là 13800138000.',

  // Công sở: Đồng nghiệp
  '大家好，我是今天新入职的阮文明。': 'Chào mọi người, tôi là Nguyễn Văn Minh, nhân viên mới nhận việc hôm nay.',
  '欢迎加入我们团队！以后多多关照。': 'Chào mừng bạn gia nhập đội ngũ! Sau này cùng giúp đỡ nhau nhé.',
  '中午要不要一起去楼下吃快餐？': 'Trưa nay có muốn cùng nhau xuống dưới tầng ăn cơm trưa không?',
  '太好了，我正好不知道附近有什么好吃的。': 'Tuyệt quá, tôi đang chưa biết quanh đây có món gì ngon.',
  '这个打印机怎么用？能教我一下吗？': 'Máy in này dùng thế nào vậy? Bạn có thể chỉ giúp tôi một chút không?',
  '没问题，先按这个绿色的启动键。': 'Không thành vấn đề, đầu tiên bấm nút bật màu xanh lá này nhé.',

  // Công sở: Khách hàng / Đối tác
  '王总，很荣幸能与贵公司合作。': 'Thưa Giám đốc Vương, rất vinh hạnh được hợp tác cùng quý công ty.',
  '我们也非常期待这次的双赢合作。': 'Chúng tôi cũng rất mong đợi vào sự hợp tác đôi bên cùng có lợi lần này.',
  '请问最快什么时候可以交货？': 'Xin hỏi thời gian giao hàng sớm nhất là khi nào?',
  '合同签订并收到预付款后十五天内发货。': 'Sau khi ký hợp đồng và nhận tiền cọc, trong vòng 15 ngày sẽ giao hàng.',
  '我们希望能在价格上再给一点优惠。': 'Chúng tôi mong muốn có thể nhận được thêm một chút ưu đãi về giá cả.',
  '如果订购数量超过一千件，我们可以给九折。': 'Nếu số lượng đặt hàng vượt quá 1000 chiếc, chúng tôi có thể giảm 10% (tính 90% giá).'
};

async function seed() {
  console.log('🚀 Bắt đầu nạp dữ liệu Mẫu câu vào Supabase...');

  const allGroups = [
    ...DAILY_GROUPS.map(g => ({ ...g, kind: 'daily' })),
    ...WORKPLACE_GROUPS.map(g => ({ ...g, kind: 'workplace' }))
  ];

  let totalGroupsInserted = 0;
  let totalPairsInserted = 0;

  for (const group of allGroups) {
    // 1. Thêm / cập nhật nhóm (phrase_groups)
    const groupPayload = {
      kind: group.kind,
      slug: group.slug,
      emoji: group.emoji,
      title_vi: group.titleVi,
      sort: group.sort
    };

    const groupRes = await fetch(`${SUPABASE_URL}/rest/v1/phrase_groups?on_conflict=slug`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([groupPayload])
    });

    const groupData = await groupRes.json();
    if (!groupRes.ok || !groupData[0]) {
      console.error('Lỗi thêm group:', group.slug, groupData);
      continue;
    }
    const groupId = groupData[0].id;
    totalGroupsInserted++;

    // 2. Thêm các cặp câu (phrase_pairs)
    const pairsPayload = group.pairs.map((p, idx) => ({
      group_id: groupId,
      sort: idx + 1,
      q_hanzi: p.q,
      q_pinyin: getPinyin(p.q),
      q_vi: TRANSLATIONS[p.q] || p.q,
      a_hanzi: p.a,
      a_pinyin: getPinyin(p.a),
      a_vi: TRANSLATIONS[p.a] || p.a,
      note_vi: p.note || null
    }));

    // Xóa các cặp cũ của group để đảm bảo idempotent
    await fetch(`${SUPABASE_URL}/rest/v1/phrase_pairs?group_id=eq.${groupId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    const pairsRes = await fetch(`${SUPABASE_URL}/rest/v1/phrase_pairs`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(pairsPayload)
    });

    if (pairsRes.ok) {
      totalPairsInserted += pairsPayload.length;
    } else {
      console.error('Lỗi thêm pairs cho group:', group.slug);
    }
  }

  // Xuất file JSON cục bộ
  fs.writeFileSync(path.join(__dirname, 'phrases_daily.json'), JSON.stringify(DAILY_GROUPS, null, 2), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'phrases_workplace.json'), JSON.stringify(WORKPLACE_GROUPS, null, 2), 'utf8');

  console.log(`✅ Hoàn tất! Đã nạp thành công: ${totalGroupsInserted} nhóm và ${totalPairsInserted} cặp mẫu câu.`);
}

seed().catch(console.error);
