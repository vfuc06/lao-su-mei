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

// 8 Nhóm Đời Sống (60 cặp)
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
      { q: '周末过得怎么样？', a: '挺好的，我和朋友去看了电影。', note: 'Hỏi thăm tình hình kỳ nghỉ cuối tuần' },
      { q: '辛苦了！', a: '不辛苦，大家一起努力！', note: 'Động viên sau khi xong việc' },
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
      { q: '你的爱好是什么？', a: '我平时喜欢听音乐和学中文。', note: 'Hỏi về sở thích cá nhân' },
      { q: '你在哪所大学毕业的？', a: '我毕业于河内国家大学。', note: 'Hỏi về trường đại học đã tốt nghiệp' },
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
      { q: '请问有素食吗？我不吃肉。', a: '有的，我们有素炒青菜和素春卷。', note: 'Hỏi món chay cho người ăn chay' },
      { q: '这个汤可以再加点热水吗？', a: '好的，请稍等，马上帮您加汤。', note: 'Xin thêm nước dùng vào bát/nồi' },
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
      { q: '这个有别的颜色吗？', a: '还有黑色和白色的，您想看哪种？', note: 'Hỏi về màu sắc khác' },
      { q: '质量有问题可以退换吗？', a: '凭小票七天之内都可以无理由退换。', note: 'Hỏi chính sách đổi trả hàng' },
      { q: '可以开发票吗？', a: '可以的，请留下您的开票信息。', note: 'Hỏi xuất hóa đơn khi mua đồ' },
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
      { q: '师傅，车上有空调吗？有点热。', a: '好的，我马上把空调温度调低一点。', note: 'Nhờ tài xế chỉnh điều hòa' },
      { q: '去那个商场坐哪一路公交车？', a: '过马路坐八路车，坐三站就到了。', note: 'Hỏi tuyến xe buýt công cộng' },
      { q: '这条路容易堵车吗？', a: '上下班高峰期会比较堵，现在还好。', note: 'Hỏi về tình trạng kẹt xe' },
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
      { q: '请问退房时间是几点？', a: '中午十二点之前退房，如果需要延迟请提前告知。', note: 'Hỏi quy định giờ trả phòng' },
      { q: '房间里的热水壶坏了，能换一个吗？', a: '十分抱歉，我马上派服务生送一个新水壶过去。', note: 'Báo đồ đạc trong phòng bị hỏng' },
      { q: '请帮我叫一辆去机场的计程车。', a: '没问题，请问您几点出发？', note: 'Nhờ lễ tân đặt xe ra sân bay' },
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
      { q: '我有点胃疼，吃了生冷的东西。', a: '先给您开点止疼药，这两天吃清淡一点。', note: 'Khám đau dạ dày/tiêu hóa' },
      { q: '这个感冒药吃了会困吗？', a: '里面含有抗过敏成分，吃完可能会有点犯困。', note: 'Hỏi tác dụng phụ buồn ngủ của thuốc' },
      { q: '您对什么药物过敏吗？', a: '我对青霉素过敏，其他都可以。', note: 'Hỏi tiền sử dị ứng thuốc' },
      { q: '我需要打针还是只吃药？', a: '病情不算严重，按时吃药多休息就可以。', note: 'Hỏi xem có cần tiêm thuốc không' },
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
      { q: '真不好意思，给您添麻烦了。', a: '您太客气了，这本来就是我们该做的。', note: 'Lời xin lỗi khi làm phiền người khác' },
      { q: '多亏了你的提醒，太感谢了！', a: '互相帮助是应该的，不用放在心上。', note: 'Cảm ơn vì lời nhắc nhở quý giá' },
      { q: '周末能帮我搬家吗？', a: '实在不好意思，我周末已经约了客户，帮不上忙。', note: 'Từ chối lời nhờ vả một cách lịch sự' },
    ]
  }
];

// 6 Nhóm Công Sở (42 cặp)
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
      { q: '请大家把手机调成静音模式。', a: '好的，我已经设置好了。', note: 'Quy định giữ trật tự trước giờ họp' },
      { q: '关于这个方案，大家举手表决一下。', a: '全票赞成，方案正式通过。', note: 'Biểu quyết thông qua ý kiến' },
      { q: '谁来负责记录今天的会议要点？', a: '今天由我来整理会议纪要。', note: 'Phân công ghi chép biên bản' },
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
      { q: '这个季度的销售额达到预期了吗？', a: '不仅达到了，还比原定目标超额完成了百分之十。', note: 'Báo cáo chỉ tiêu doanh thu quý' },
      { q: '如果遇到技术难题，你们打算怎么解决？', a: '我们正在联系技术专家进行联合攻关。', note: 'Báo cáo phương án gỡ rối kỹ thuật' },
      { q: '报告中的财务数据经过审计了吗？', a: '已经由财务总监复核并确认无误。', note: 'Xác nhận tính chính xác của số liệu' },
      { q: '下周一能提交最终版的报告吗？', a: '没问题，周末我们会做好最终校对。', note: 'Cam kết thời hạn hoàn tất báo cáo' },
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
      { q: '我的年假还剩下多少天？', a: '系统显示您今年还剩五天带薪年假。', note: 'Kiểm tra số ngày nghỉ phép năm còn lại' },
      { q: '我想申请下周五休年假回老家。', a: '可以，先把手头的工作交接好就行。', note: 'Xin nghỉ phép năm về quê' },
      { q: '今天家里有突发情况，我可以早走半小时吗？', a: '可以的，下班前记得在系统上补卡。', note: 'Xin về sớm vì việc đột xuất' },
      { q: '连续加班两天可以申请调休吗？', a: '可以，主管签字同意后就可以在系统里调休。', note: 'Hỏi quy định nghỉ bù sau khi tăng ca' },
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
      { q: '不好意思，信号不太好，您可以再说一遍吗？', a: '没问题，我说的是我们明天上午十点见面。', note: 'Xử lý khi đường truyền cuộc gọi chập chờn' },
      { q: '请问陈总现在接电话方便吗？', a: '稍等，我帮您转进他的办公室分机。', note: 'Kiểm tra tính khả dụng của máy nhánh' },
      { q: '请问您的邮箱是多少？我把资料发过去。', a: '我的邮箱是info@company.com。', note: 'Hỏi địa chỉ email qua điện thoại' },
      { q: '非常感谢您的耐心解答，再见！', a: '不客气，祝您工作顺利，再见！', note: 'Kết thúc cuộc gọi công việc lịch thiệp' },
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
      { q: '你在公司主要负责哪个模块的工作？', a: '我主要负责前端页面的开发与优化。', note: 'Trao đổi phân công nhiệm vụ chuyên môn' },
      { q: '公司附近有什么好喝的咖啡店推荐吗？', a: '楼下拐角那家手冲咖啡很不错，下午一起去吧。', note: 'Giao lưu trò chuyện giải lao' },
      { q: '这份文件需要找谁盖章签字？', a: '先找人事部张姐签字，再去行政处盖公章。', note: 'Hỏi quy trình hành chính trong công ty' },
      { q: '今晚部门有迎新聚餐，你能来吗？', a: '太棒了，我一定准时参加！', note: 'Mời đồng nghiệp mới đi ăn liên hoan' },
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
      { q: '贵公司的售后服务政策是怎样的？', a: '我们提供一年免费保修和全天候在线技术支持。', note: 'Hỏi chính sách bảo hành hậu mãi' },
      { q: '货款的付款方式支持分期支付吗？', a: '预付百分之三十定金，验收合格后再付余款。', note: 'Thương lượng hình thức thanh toán theo đợt' },
      { q: '下个月有空来我们工厂实地考察吗？', a: '非常荣幸，我们会提前把考察行程发给您。', note: 'Mời đối tác tới thăm quan nhà máy' },
      { q: '预祝我们的项目早日取得圆满成功！', a: '合作愉快！携手共创辉煌。', note: 'Nâng ly chúc mừng hoặc chốt hợp tác thành công' },
    ]
  }
];

// Bản đồ dịch tiếng Việt phong phú
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
  '周末过得怎么样？': 'Kỳ nghỉ cuối tuần của bạn thế nào rồi?',
  '挺好的，我和朋友去看了电影。': 'Rất vui, tôi và bạn bè đã đi xem phim.',
  '辛苦了！': 'Vất vả cho bạn quá!',
  '不辛苦，大家一起努力！': 'Không vất vả đâu, mọi người cùng cố gắng mà!',

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
  '你的爱好是什么？': 'Sở thích của bạn là gì?',
  '我平时喜欢听音乐和学中文。': 'Tôi thường ngày thích nghe nhạc và học tiếng Trung.',
  '你在哪所大学毕业的？': 'Bạn tốt nghiệp trường đại học nào?',
  '我毕业于河内国家大学。': 'Tôi tốt nghiệp Đại học Quốc gia Hà Nội.',

  // Ăn uống
  '服务员，请问有菜单吗？': 'Phục vụ ơi, cho tôi xin thực đơn với?',
  '有的，这是菜单，请问几位？': 'Có ạ, đây là thực đơn, xin hỏi quý khách đi mấy người?',
  '这个菜辣不辣？': 'Món ăn này có cay không?',
  '这个菜有点儿辣，微辣可以吗？': 'Món này hơi cay một chút, cay nhẹ được không ạ?',
  '我要一杯冰奶茶，少糖。': 'Cho tôi một ly trà sữa đá, ít đường.',
  '好的，一杯冰奶茶，七分甜，请稍等。': 'Dạ vâng, một trà sữa đá 70% ngọt, xin đợi chút.',
  '这里的招牌菜是什么？': 'Món đặc sản/bán chạy nhất ở đây là gì?',
  '我们的烤鸭和麻婆豆腐很有名。': 'Món vịt quay và đậu phụ Tứ Xuyên của quán chúng tôi rất nổi tiếng.',
  '服务员，买单！一共多少钱？': 'Phục vụ ơi, tính tiền! Tổng cộng hết bao nhiêu?',
  '一共一百二十块钱，微信还是支付宝？': 'Tổng cộng hết 120 tệ, anh/chị trả bằng WeChat hay Alipay ạ?',
  '可以帮我打包吗？': 'Có thể đóng gói mang về giúp tôi được không?',
  '没问题，请稍等我拿打包盒。': 'Dạ được, xin đợi một chút tôi lấy hộp mang về.',
  '请问有素食吗？我不吃肉。': 'Xin hỏi có món chay không? Tôi không ăn thịt.',
  '有的，我们有素炒青菜和素春卷。': 'Dạ có, chúng tôi có rau xào chay và nem rán chay.',
  '这个汤可以再加点热水吗？': 'Canh này có thể thêm chút nước nóng được không?',
  '好的，请稍等，马上帮您加汤。': 'Dạ được, xin đợi chút, em châm thêm nước canh ngay ạ.',

  // Mua sắm
  '这个多少钱一件？': 'Cái này bao nhiêu tiền một chiếc?',
  '这个八十块钱一件。': 'Cái này tám mươi tệ một chiếc.',
  '太贵了，可以便宜一点儿吗？': 'Đắt quá, có thể rẻ hơn một chút được không?',
  '如果你买两件，给你打八折。': 'Nếu bạn mua hai cái, tôi giảm giá 20% cho bạn.',
  '请问有大一号的吗？': 'Xin hỏi có cái nào cỡ lớn hơn một size không?',
  '有的，请稍等我进库房拿给你。': 'Có ạ, xin đợi một chút tôi vào kho lấy cho bạn.',
  '我可以试穿一下吗？': 'Tôi có thể mặc thử một chút được không?',
  '可以的，试衣间在那边。': 'Được chứ, phòng thay đồ ở phía bên kia.',
  '这个能刷信用卡吗？': 'Cái này có quẹt thẻ tín dụng được không?',
  '可以刷卡，也可以扫码支付。': 'Có thể quẹt thẻ, cũng có thể quét mã thanh toán.',
  '这个有别的颜色吗？': 'Mẫu này có màu sắc khác không?',
  '还有黑色和白色的，您想看哪种？': 'Còn màu đen và màu trắng, bạn muốn xem màu nào?',
  '质量有问题可以退换吗？': 'Chất lượng có vấn đề thì có được đổi trả không?',
  '凭小票七天之内都可以无理由退换。': 'Kèm theo hóa đơn trong vòng 7 ngày đều được đổi trả miễn phí.',
  '可以开发票吗？': 'Có xuất hóa đơn được không ạ?',
  '可以的，请留下您的开票信息。': 'Dạ được, xin vui lòng để lại thông tin xuất hóa đơn.',

  // Taxi & đường đi
  '师傅，去机场要多少钱？': 'Bác tài, đi sân bay hết bao nhiêu tiền?',
  '打表大概六十块钱左右。': 'Bấm đồng hồ tính tiền thì khoảng chừng sáu mươi tệ.',
  '请问去地铁站怎么走？': 'Xin hỏi đi đến trạm tàu điện ngầm đi đường nào?',
  '一直往前走，在第二个路口向右拐。': 'Đi thẳng về phía trước, ở ngã rẽ thứ hai thì rẽ phải.',
  '师傅，请在前面的路口停一下。': 'Bác tài ơi, xin dừng xe ở ngã rẽ phía trước một chút.',
  '好的，请带好随身物品。': 'Được rồi, xin quý khách nhớ mang theo đồ đạc cá nhân.',
  '到火车站还要多长时间？': 'Đến ga tàu hỏa còn mất bao lâu nữa?',
  '大概二十分钟，前面稍微有点堵车。': 'Khoảng hai mươi phút nữa, phía trước hơi kẹt xe một chút.',
  '师傅，车上有空调吗？有点热。': 'Bác tài, trên xe có bật điều hòa không? Hơi nóng ạ.',
  '好的，我马上把空调温度调低一点。': 'Được rồi, tôi hạ nhiệt độ điều hòa xuống một chút ngay.',
  '去那个商场坐哪一路公交车？': 'Đến trung tâm thương mại đó đi tuyến xe buýt số mấy?',
  '过马路坐八路车，坐三站就到了。': 'Qua đường bắt xe buýt số 8, đi 3 trạm là tới.',
  '这条路容易堵车吗？': 'Tuyến đường này có hay bị tắc xe không?',
  '上下班高峰期会比较堵，现在还好。': 'Giờ cao điểm đi làm tan tầm thì khá tắc, giờ này thì ổn.',

  // Khách sạn
  '你好，我预订了一间大床房。': 'Xin chào, tôi đã đặt trước một phòng giường đôi lớn.',
  '请出示您的护照，我帮您查一下。': 'Xin xuất trình hộ chiếu, tôi kiểm tra thông tin cho bạn.',
  '请问无线网密码是多少？': 'Xin hỏi mật khẩu Wifi là bao nhiêu?',
  '密码在房卡背面，全小写字母。': 'Mật khẩu ở mặt sau thẻ phòng, toàn bộ là chữ thường.',
  '早餐是几点到几点？': 'Bữa sáng phục vụ từ mấy giờ đến mấy giờ?',
  '早餐在二楼餐厅，早上七点到九点半。': 'Bữa sáng tại nhà hàng tầng 2, từ 7 giờ đến 9 giờ rưỡi sáng.',
  '我可以把行李寄存在这里吗？': 'Tôi có thể gửi nhờ hành lý ở đây được không?',
  '当然可以，退房后免费寄存到下午六点。': 'Đương nhiên được, sau khi trả phòng gửi miễn phí đến 6 giờ chiều.',
  '请问退房时间是几点？': 'Xin hỏi giờ trả phòng (check-out) là mấy giờ?',
  '中午十二点之前退房，如果需要延迟请提前告知。': 'Trước 12 giờ trưa, nếu cần trả muộn xin báo trước.',
  '房间里的热水壶坏了，能换一个吗？': 'Ấm đun nước trong phòng bị hỏng rồi, có thể đổi cái khác không?',
  '十分抱歉，我马上派服务生送一个新水壶过去。': 'Rất xin lỗi bạn, tôi sẽ cử nhân viên mang ấm mới lên ngay.',
  '请帮我叫一辆去机场的计程车。': 'Làm ơn giúp tôi gọi một chiếc taxi đi sân bay.',
  '没问题，请问您几点出发？': 'Dạ được, xin hỏi mấy giờ quý khách xuất phát ạ?',

  // Sức khỏe
  '你哪里不舒服？': 'Bạn cảm thấy khó chịu ở chỗ nào?',
  '我头疼，还有点儿发烧。': 'Tôi bị đau đầu, lại còn hơi sốt nữa.',
  '这个药一天吃几次？': 'Thuốc này uống mỗi ngày mấy lần?',
  '一天吃三次，每次饭后吃两片。': 'Một ngày uống ba lần, mỗi lần hai viên sau bữa ăn.',
  '请问附近有医院吗？': 'Xin hỏi gần đây có bệnh viện không?',
  '出门向左走两百米就有一家人民医院。': 'Ra khỏi cửa rẽ trái hai trăm mét là có một bệnh viện Nhân Dân.',
  '我有点胃疼，吃了生冷的东西。': 'Tôi hơi đau dạ dày, do ăn phải đồ sống lạnh.',
  '先给您开点止疼药，这两天吃清淡一点。': 'Kê cho bạn thuốc giảm đau trước, hai ngày này hãy ăn thanh đạm.',
  '这个感冒药吃了会困吗？': 'Thuốc cảm này uống vào có bị buồn ngủ không?',
  '里面含有抗过敏成分，吃完可能会有点犯困。': 'Trong thuốc có thành phần kháng dị ứng, uống xong có thể hơi buồn ngủ.',
  '您对什么药物过敏吗？': 'Bạn có bị dị ứng với loại thuốc nào không?',
  '我对青霉素过敏，其他都可以。': 'Tôi bị dị ứng với penicillin, các loại khác đều bình thường.',
  '我需要打针还是只吃药？': 'Tôi cần phải tiêm hay là chỉ cần uống thuốc?',
  '病情不算严重，按时吃药多休息就可以。': 'Bệnh tình không quá nghiêm trọng, uống thuốc đúng giờ và nghỉ ngơi là ổn.',

  // Lịch sự
  '谢谢你的帮忙！': 'Cảm ơn sự giúp đỡ của bạn nhé!',
  '不客气，不用谢！举手之劳。': 'Không có gì đâu! Chỉ là việc tiện tay thôi mà.',
  '对不起，我来晚了。': 'Xin lỗi, tôi tới muộn mất rồi.',
  '没关系，我也刚到不久。': 'Không sao đâu, tôi cũng vừa mới đến thôi.',
  '今晚一起去唱歌好吗？': 'Tối nay cùng đi hát karaoke nhé?',
  '不好意思，我今晚有点急事，下次吧。': 'Ngại quá, tối nay tôi có việc bận mất rồi, hẹn lần sau nhé.',
  '打扰一下，请问洗手间在哪儿？': 'Làm phiền một chút, xin hỏi nhà vệ sinh ở đâu?',
  '顺着走廊直走，左手边就是。': 'Đi thẳng dọc theo hành lang, phía bên tay trái là tới.',
  '真不好意思，给您添麻烦了。': 'Thật ngại quá, đã làm phiền quý khách rồi.',
  '您太客气了，这本来就是我们该做的。': 'Bạn khách sáo quá, đây vốn là phận sự của chúng tôi mà.',
  '多亏了你的提醒，太感谢了！': 'May nhờ có bạn nhắc nhở, cảm ơn bạn rất nhiều!',
  '互相帮助是应该的，不用放在心上。': 'Tương trợ lẫn nhau là điều nên làm, đừng bận tâm nhé.',
  '周末能帮我搬家吗？': 'Cuối tuần có thể giúp tôi chuyển nhà được không?',
  '实在不好意思，我周末已经约了客户，帮不上忙。': 'Thực sự áy náy, cuối tuần tôi đã hẹn đối tác rồi, không giúp được bạn.',

  // Họp hành công sở
  '今天的会议主要讨论什么？': 'Cuộc họp hôm nay chủ yếu thảo luận về vấn đề gì?',
  '主要讨论下个季度的产品推广方案。': 'Chủ yếu bàn bạc về phương án quảng bá sản phẩm quý tới.',
  '各位对这个方案有什么意见吗？': 'Mọi người có ý kiến gì đối với phương án này không?',
  '我觉得整体不错，但是预算可能需要调整。': 'Tôi thấy tổng thể rất ổn, nhưng ngân sách có lẽ cần điều chỉnh.',
  '请问会议几点开始？': 'Xin hỏi cuộc họp bắt đầu lúc mấy giờ?',
  '下午两点半在三号会议室准时开始。': 'Đúng hai giờ rưỡi chiều tại phòng họp số ba.',
  '这个项目的截止日期是哪天？': 'Hạn chót (deadline) của dự án này là ngày nào?',
  '预计在下周五之前必须交付初稿。': 'Dự kiến trước thứ sáu tuần sau nhất định phải nộp bản thảo.',
  '请大家把手机调成静音模式。': 'Xin mời mọi người chuyển điện thoại sang chế độ im lặng.',
  '好的，我已经设置好了。': 'Vâng, tôi đã cài đặt xong rồi.',
  '关于这个方案，大家举手表决一下。': 'Về phương án này, xin mọi người giơ tay biểu quyết.',
  '全票赞成，方案正式通过。': 'Toàn thể tán thành, phương án chính thức được thông qua.',
  '谁来负责记录今天的会议要点？': 'Ai sẽ phụ trách ghi chép lại các điểm cốt lõi của cuộc họp hôm nay?',
  '今天由我来整理会议纪要。': 'Hôm nay để tôi tổng hợp biên bản cuộc họp.',

  // Báo cáo sếp
  '李总，这是本周的工作汇报，请您过目。': 'Thưa tổng giám đốc Lý, đây là báo cáo tuần, xin mời anh xem qua.',
  '好的，放我桌上吧，我下午看完给你反馈。': 'Được rồi, để lên bàn tôi nhé, chiều xem xong tôi sẽ phản hồi lại.',
  '项目进展顺利吗？有没有遇到困难？': 'Tiến độ dự án có thuận lợi không? Có gặp trở ngại gì không?',
  '目前按计划进行，客户那边已经确认了需求。': 'Hiện tại theo đúng tiến độ, phía khách hàng đã chốt xong yêu cầu.',
  '请问您对这份报告有什么修改意见吗？': 'Xin hỏi anh/chị có ý kiến chỉnh sửa gì cho bản báo cáo này không?',
  '第三部分的图表数据需要再核实一下。': 'Số liệu biểu đồ ở phần thứ ba cần kiểm tra lại một chút.',
  '这个季度的销售额达到预期了吗？': 'Doanh số bán hàng quý này đã đạt mục tiêu kỳ vọng chưa?',
  '不仅达到了，还比原定目标超额完成了百分之十。': 'Không những đạt mà còn vượt mức kế hoạch ban đầu 10%.',
  '如果遇到技术难题，你们打算怎么解决？': 'Nếu gặp khó khăn về mặt kỹ thuật, các bạn định xử lý ra sao?',
  '我们正在联系技术专家进行联合攻关。': 'Chúng tôi đang liên hệ với chuyên gia kỹ thuật để cùng tháo gỡ.',
  '报告中的财务数据经过审计了吗？': 'Số liệu tài chính trong báo cáo đã được kiểm toán chưa?',
  '已经由财务总监复核并确认无误。': 'Đã được giám đốc tài chính đối soát và xác nhận chuẩn xác.',
  '下周一能提交最终版的报告吗？': 'Thứ hai tuần tới có thể nộp bản báo cáo cuối cùng không?',
  '没问题，周末我们会做好最终校对。': 'Dạ được ạ, cuối tuần chúng em sẽ làm xong khâu rà soát cuối cùng.',

  // Xin nghỉ phép / đổi ca
  '张经理，我明天家里有急事，想请一天事假。': 'Quản lý Trương, ngày mai nhà em có việc gấp, em muốn xin nghỉ phép một ngày.',
  '好的，请在系统里提交一下请假单。': 'Được rồi, em lên hệ thống gửi đơn xin nghỉ phép nhé.',
  '路上堵车很严重，我可能会迟到十五分钟。': 'Đường tắc rất nghiêm trọng, em có thể đến muộn mười lăm phút.',
  '收到，路上注意安全，到了先打卡。': 'Đã nhận, đi đường chú ý an toàn, đến nơi nhớ chấm công trước.',
  '请问我可以和周师傅换一下周末的班吗？': 'Xin hỏi em có thể đổi ca trực cuối tuần với thầy Chu được không?',
  '你们两位沟通好并且签个字就可以。': 'Hai người trao đổi thống nhất và ký vào giấy là được.',
  '我的年假还剩下多少天？': 'Số ngày nghỉ phép năm của em còn lại bao nhiêu ngày?',
  '系统显示您今年还剩五天带薪年假。': 'Hệ thống hiển thị anh/chị năm nay còn lại 5 ngày phép hưởng lương.',
  '我想申请下周五休年假回老家。': 'Em muốn làm đơn xin nghỉ phép năm vào thứ sáu tuần tới để về quê.',
  '可以，先把手头的工作交接好就行。': 'Được, trước tiên hãy bàn giao công việc đang làm là được.',
  '今天家里有突发情况，我可以早走半小时吗？': 'Hôm nay nhà có việc đột xuất, em có thể xin về sớm nửa tiếng được không?',
  '可以的，下班前记得在系统上补卡。': 'Được, trước khi về nhớ gửi bổ sung chấm công trên hệ thống nhé.',
  '连续加班两天可以申请调休吗？': 'Tăng ca liên tục hai ngày có được xin nghỉ bù không?',
  '可以，主管签字同意后就可以在系统里调休。': 'Được, sau khi quản lý trực tiếp ký duyệt là có thể xin nghỉ bù.',

  // Nghe điện thoại
  '您好，这里是华星科技，请问有什么可以帮您？': 'Xin chào, đây là công ty Hoa Tinh, tôi có thể giúp gì cho quý khách?',
  '您好，请帮我转接一下销售部王经理。': 'Chào bạn, làm ơn chuyển máy giúp tôi tới quản lý Vương phòng kinh doanh.',
  '王经理现在在开会，需要我帮您留言吗？': 'Quản lý Vương đang họp, bạn có cần tôi ghi lại lời nhắn không?',
  '好的，请让他开完会给我回个电话。': 'Được, phiền bạn nhắn anh ấy họp xong thì gọi lại cho tôi nhé.',
  '请问您怎么称呼？您的电话号码是多少？': 'Xin hỏi xưng hô với bạn thế nào? Số điện thoại của bạn là bao nhiêu?',
  '我姓陈，电话是13800138000。': 'Tôi họ Trần, số điện thoại là 13800138000.',
  '不好意思，信号不太好，您可以再说一遍吗？': 'Xin lỗi, sóng hơi chập chờn, bạn có thể nhắc lại một lần nữa không?',
  '没问题，我说的是我们明天上午十点见面。': 'Không sao, tôi nói là chúng ta hẹn gặp nhau lúc mười giờ sáng mai.',
  '请问陈总现在接电话方便吗？': 'Xin hỏi tổng giám đốc Trần bây giờ có tiện nghe máy không?',
  '稍等，我帮您转进他的办公室分机。': 'Xin đợi chút, tôi nối máy vào máy lẻ phòng làm việc của anh ấy.',
  '请问您的邮箱是多少？我把资料发过去。': 'Xin hỏi địa chỉ email của bạn là gì? Tôi gửi tài liệu qua.',
  '我的邮箱是info@company.com。': 'Email của tôi là info@company.com.',
  '非常感谢您的耐心解答，再见！': 'Vô cùng cảm ơn sự giải đáp tận tình của bạn, tạm biệt nhé!',
  '不客气，祝您工作顺利，再见！': 'Không có chi, chúc bạn công việc thuận lợi, tạm biệt!',

  // Đồng nghiệp
  '大家好，我是今天新入职的阮文明。': 'Chào mọi người, tôi là Nguyễn Văn Minh, nhân viên mới nhận việc hôm nay.',
  '欢迎加入我们团队！以后多多关照。': 'Chào mừng bạn gia nhập đội ngũ! Sau này cùng giúp đỡ nhau nhé.',
  '中午要不要一起去楼下吃快餐？': 'Trưa nay có muốn cùng xuống dưới sảnh ăn cơm nhanh không?',
  '太好了，我正好不知道附近有什么好吃的。': 'Tuyệt quá, tôi cũng đang chưa biết quanh đây có món gì ngon.',
  '这个打印机怎么用？能教我一下吗？': 'Máy in này dùng thế nào? Bạn chỉ cho tôi một chút được không?',
  '没问题，先按这个绿色的启动键。': 'Không vấn đề, trước tiên bạn nhấn nút khởi động màu xanh này.',
  '你在公司主要负责哪个模块的工作？': 'Ở công ty bạn chủ yếu phụ trách mảng công việc nào?',
  '我主要负责前端页面的开发与优化。': 'Tôi chủ yếu phụ trách phát triển và tối ưu hóa giao diện người dùng.',
  '公司附近有什么好喝的咖啡店推荐吗？': 'Quanh công ty có quán cà phê nào ngon giới thiệu cho mình với?',
  '楼下拐角那家手冲咖啡很不错，下午一起去吧。': 'Quán cà phê phin ở góc đường tầng dưới rất ngon, chiều cùng đi nhé.',
  '这份文件需要找谁盖章签字？': 'Tài liệu này cần tìm ai để ký tên đóng dấu vậy?',
  '先找人事部张姐签字，再去行政处盖公章。': 'Trước tiên tìm chị Trương phòng nhân sự ký, sau đó qua phòng hành chính đóng dấu.',
  '今晚部门有迎新聚餐，你能来吗？': 'Tối nay phòng có buổi tiệc chào đón thành viên mới, bạn đi được chứ?',
  '太棒了，我一定准时参加！': 'Tuyệt vời, tôi nhất định sẽ có mặt đúng giờ!',

  // Đối tác
  '王总，很荣幸能与贵公司合作。': 'Tổng giám đốc Vương, rất vinh hạnh khi được hợp tác cùng quý công ty.',
  '我们也非常期待这次的双赢合作。': 'Chúng tôi cũng hết sức kỳ vọng vào sự hợp tác đôi bên cùng có lợi lần này.',
  '请问最快什么时候可以交货？': 'Xin hỏi thời gian giao hàng sớm nhất là khi nào?',
  '合同签订并收到预付款后十五天内发货。': 'Sau khi ký hợp đồng và nhận tiền đặt cọc trong vòng 15 ngày sẽ xuất hàng.',
  '我们希望能在价格上再给一点优惠。': 'Chúng tôi mong quý công ty có thể ưu đãi thêm một chút về giá cả.',
  '如果订购数量超过一千件，我们可以给九折。': 'Nếu số lượng đặt hàng vượt quá 1000 chiếc, chúng tôi có thể chiết khấu 10%.',
  '贵公司的售后服务政策是怎样的？': 'Chính sách dịch vụ hậu mãi của quý công ty như thế nào?',
  '我们提供一年免费保修和全天候在线技术支持。': 'Chúng tôi bảo hành miễn phí 1 năm và hỗ trợ kỹ thuật trực tuyến 24/7.',
  '货款的付款方式支持分期支付吗？': 'Phương thức thanh toán tiền hàng có hỗ trợ chia theo đợt không?',
  '预付百分之三十定金，验收合格后再付余款。': 'Tạm ứng trước 30% tiền cọc, sau khi nghiệm thu đạt chuẩn sẽ thanh toán nốt.',
  '下个月有空来我们工厂实地考察吗？': 'Tháng tới anh/chị có thời gian đến thăm quan thực tế nhà máy chúng tôi không?',
  '非常荣幸，我们会提前把考察行程发给您。': 'Rất vinh dự, chúng tôi sẽ gửi trước lịch trình khảo sát cho quý công ty.',
  '预祝我们的项目早日取得圆满成功！': 'Chúc cho dự án của chúng ta sớm gặt hái thành công trọn vẹn!',
  '合作愉快！携手共创辉煌。': 'Hợp tác vui vẻ! Cùng chung tay tạo nên thành công rực rỡ.'
};

async function seed() {
  console.log('🚀 Bắt đầu nạp dữ liệu Mẫu câu mở rộng vào Supabase...');

  const allGroups = [
    ...DAILY_GROUPS.map(g => ({ ...g, kind: 'daily' })),
    ...WORKPLACE_GROUPS.map(g => ({ ...g, kind: 'workplace' }))
  ];
  let totalGroupsInserted = 0;
  let totalPairsInserted = 0;

  for (const group of allGroups) {
    // 1. Thêm hoặc cập nhật group
    const groupPayload = {
      slug: group.slug,
      kind: group.kind,
      emoji: group.emoji,
      title_vi: group.titleVi,
      sort: group.sort
    };

    // 1. Kiểm tra xem group đã tồn tại chưa
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/phrase_groups?slug=eq.${group.slug}`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    const checkData = await checkRes.json();
    let groupId;

    if (checkData && checkData.length > 0) {
      groupId = checkData[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/phrase_groups?id=eq.${groupId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupPayload)
      });
    } else {
      const groupRes = await fetch(`${SUPABASE_URL}/rest/v1/phrase_groups`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(groupPayload)
      });
      const groupData = await groupRes.json();
      if (!groupRes.ok || !groupData[0]) {
        console.error('Lỗi thêm group:', group.slug, groupData);
        continue;
      }
      groupId = groupData[0].id;
    }
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
