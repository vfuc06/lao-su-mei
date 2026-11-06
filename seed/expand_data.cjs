const fs = require('fs');
const path = require('path');

// 1. Dữ liệu HSK bổ sung
const additionalHsk = [
  // HSK 1
  {"hanzi": "早上", "pinyin": "zǎoshang", "vi": "Buổi sáng", "hsk_level": 1, "example_hanzi": "早上好，今天的天气真不错！", "example_pinyin": "Zǎoshang hǎo, jīntiān de tiānqì zhēn búcuò!", "example_vi": "Chào buổi sáng, thời tiết hôm nay thật đẹp!"},
  {"hanzi": "晚上", "pinyin": "wǎnshang", "vi": "Buổi tối", "hsk_level": 1, "example_hanzi": "你今天晚上有空一起吃火锅吗？", "example_pinyin": "Nǐ jīntiān wǎnshang yǒu kòng yìqǐ chī huǒguō ma?", "example_vi": "Tối nay bạn có rảnh đi ăn lẩu cùng nhau không?"},
  {"hanzi": "医生", "pinyin": "yīshēng", "vi": "Bác sĩ", "hsk_level": 1, "example_hanzi": "医生说我需要多喝温开水。", "example_pinyin": "Yīshēng shuō wǒ xūyào duō hē wēn kāishuǐ.", "example_vi": "Bác sĩ dặn tôi cần uống nhiều nước sôi để nguội."},
  {"hanzi": "老师", "pinyin": "lǎoshī", "vi": "Thầy cô giáo", "hsk_level": 1, "example_hanzi": "张老师教我们中文发音非常细心。", "example_pinyin": "Zhāng lǎoshī jiāo wǒmen zhōngwén fāyīn fēicháng xìxīn.", "example_vi": "Thầy Trương dạy phát âm tiếng Trung cho chúng tôi vô cùng tận tình."},
  {"hanzi": "学生", "pinyin": "xuésheng", "vi": "Học sinh, sinh viên", "hsk_level": 1, "example_hanzi": "我们学校有很多外国留学生。", "example_pinyin": "Wǒmen xuéxiào yǒu hěn duō wàiguó liúxuéshēng.", "example_vi": "Trường chúng tôi có rất nhiều du học sinh nước ngoài."},
  {"hanzi": "天气", "pinyin": "tiānqì", "vi": "Thời tiết", "hsk_level": 1, "example_hanzi": "河内今天的天气非常凉爽。", "example_pinyin": "Hénèi jīntiān de tiānqì fēicháng liángshuǎng.", "example_vi": "Thời tiết Hà Nội hôm nay rất mát mẻ."},
  {"hanzi": "出租车", "pinyin": "chūzūchē", "vi": "Xe taxi", "hsk_level": 1, "example_hanzi": "我们在路边招手叫一辆出租车吧。", "example_pinyin": "Wǒmen zài lùbiān zhāoshǒu jiào yí liàng chūzūchē ba.", "example_vi": "Chúng mình đứng bên đường vẫy một chiếc taxi nhé."},
  {"hanzi": "下雨", "pinyin": "xià yǔ", "vi": "Trời mưa", "hsk_level": 1, "example_hanzi": "外面下雨了，出门记得带雨伞。", "example_pinyin": "Wàimiàn xià yǔ le, chūmén jìde dài yǔsǎn.", "example_vi": "Bên ngoài trời mưa rồi, ra ngoài nhớ mang theo ô dù nhé."},

  // HSK 2
  {"hanzi": "机场", "pinyin": "jīchǎng", "vi": "Sân bay", "hsk_level": 2, "example_hanzi": "我明天要去内排国际机场接朋友。", "example_pinyin": "Wǒ míngtiān yào qù Nèipái guójì jīchǎng jiē péngyou.", "example_vi": "Ngày mai tôi phải đi sân bay quốc tế Nội Bài đón bạn."},
  {"hanzi": "宾馆", "pinyin": "bīnguǎn", "vi": "Khách sạn, nhà nghỉ", "hsk_level": 2, "example_hanzi": "这家宾馆的环境既安静又干净。", "example_pinyin": "Zhè jiā bīnguǎn de huánjìng jì ānjìng yòu gānjìng.", "example_vi": "Môi trường khách sạn này vừa yên tĩnh lại vừa sạch sẽ."},
  {"hanzi": "身体", "pinyin": "shēntǐ", "vi": "Sức khỏe, cơ thể", "hsk_level": 2, "example_hanzi": "天冷了，多穿衣服，注意身体健康。", "example_pinyin": "Tiān lěng le, duō chuān yīfu, zhùyì shēntǐ jiànkāng.", "example_vi": "Trời lạnh rồi, mặc thêm áo ấm và chú ý giữ gìn sức khỏe nhé."},
  {"hanzi": "旅游", "pinyin": "lǚyóu", "vi": "Du lịch, đi tham quan", "hsk_level": 2, "example_hanzi": "下个月我们全家打算去岘港旅游。", "example_pinyin": "Xià gè yuè wǒmen quánjiā dǎsuàn qù Xiàngǎng lǚyóu.", "example_vi": "Tháng sau cả nhà tôi dự định đi Đà Nẵng du lịch."},
  {"hanzi": "帮助", "pinyin": "bāngzhù", "vi": "Sự giúp đỡ, tương trợ", "hsk_level": 2, "example_hanzi": "非常感谢你在我困难时给予的帮助。", "example_pinyin": "Fēicháng gǎnxiè nǐ zài wǒ kùnnan shí jǐyǔ de bāngzhù.", "example_vi": "Vô cùng cảm ơn sự giúp đỡ của bạn khi tôi gặp khó khăn."},
  {"hanzi": "车站", "pinyin": "chēzhàn", "vi": "Bến xe, trạm ga", "hsk_level": 2, "example_hanzi": "公车站就在前面五十米的大树旁。", "example_pinyin": "Gōngchēzhàn jiù zài qiánmiàn wǔshí mǐ de dà shù páng.", "example_vi": "Trạm xe buýt nằm ngay cạnh cây to phía trước năm mươi mét."},

  // HSK 3
  {"hanzi": "检查", "pinyin": "jiǎnchá", "vi": "Kiểm tra, rà soát", "hsk_level": 3, "example_hanzi": "交卷之前请大家再仔细检查一遍。", "example_pinyin": "Jiāo juàn zhīqián qǐng dàjiā zài zǐxì jiǎnchá yí biàn.", "example_vi": "Trước khi nộp bài xin mọi người hãy kiểm tra lại kỹ một lần nữa."},
  {"hanzi": "了解", "pinyin": "liǎojiě", "vi": "Tìm hiểu, thấu hiểu", "hsk_level": 3, "example_hanzi": "我想深入了解一下中国茶文化。", "example_pinyin": "Wǒ xiǎng shēnrù liǎojiě yíxià Zhōngguó chá wénhuà.", "example_vi": "Tôi muốn tìm hiểu sâu hơn về văn hóa trà Trung Quốc."},
  {"hanzi": "努力", "pinyin": "nǔlì", "vi": "Nỗ lực, cố gắng", "hsk_level": 3, "example_hanzi": "只要每天努力练习，中文一定会进步。", "example_pinyin": "Zhǐyào měitiān nǔlì liànxí, zhōngwén yídìng huì jìnbù.", "example_vi": "Chỉ cần mỗi ngày nỗ lực luyện tập, tiếng Trung nhất định sẽ tiến bộ."},
  {"hanzi": "热情", "pinyin": "rèqíng", "vi": "Nhiệt tình, hiếu khách", "hsk_level": 3, "example_hanzi": "越南人民对国际游客非常热情友善。", "example_pinyin": "Yuènán rénmín duì guójì yóukè fēicháng rèqíng yǒushàn.", "example_vi": "Người dân Việt Nam rất nhiệt tình và thân thiện với du khách quốc tế."},
  {"hanzi": "愿意", "pinyin": "yuànyì", "vi": "Sẵn lòng, bằng lòng", "hsk_level": 3, "example_hanzi": "你愿意和我一起搭档练习口语吗？", "example_pinyin": "Nǐ yuànyì hé wǒ yìqǐ dādàng liànxí kǒuyǔ ma?", "example_vi": "Bạn có sẵn lòng cùng ghép cặp với tôi luyện khẩu ngữ không?"},
  {"hanzi": "环境", "pinyin": "huánjìng", "vi": "Môi trường, không gian", "hsk_level": 3, "example_hanzi": "这家咖啡馆的环境非常适合安静看书。", "example_pinyin": "Zhè jiā kāfēiguǎn de huánjìng fēicháng shìhé ānjìng kànshū.", "example_vi": "Không gian quán cà phê này rất thích hợp để yên tĩnh đọc sách."},

  // HSK 4
  {"hanzi": "坚持", "pinyin": "jiānchí", "vi": "Kiên trì", "hsk_level": 4, "example_hanzi": "学外语最重要的是每天坚持开口说。", "example_pinyin": "Xué wàiyǔ zuì zhòngyào de shì měitiān jiānchí kāikǒu shuō.", "example_vi": "Học ngoại ngữ điều quan trọng nhất là kiên trì mở miệng nói mỗi ngày."},
  {"hanzi": "放弃", "pinyin": "fàngqì", "vi": "Từ bỏ, bỏ cuộc", "hsk_level": 4, "example_hanzi": "面对困难，我们绝不能轻易放弃。", "example_pinyin": "Miànduì kùnnan, wǒmen jué bùnéng qīngyì fàngqì.", "example_vi": "Đối mặt với khó khăn, chúng ta tuyệt đối không được dễ dàng bỏ cuộc."},
  {"hanzi": "负责", "pinyin": "fùzé", "vi": "Chịu trách nhiệm, phụ trách", "hsk_level": 4, "example_hanzi": "他是这位项目的总负责人，做事很严谨。", "example_pinyin": "Tā shì zhè wèi xiàngmù de zǒng fùzérén, zuòshì hěn yánjǐn.", "example_vi": "Anh ấy là người phụ trách chính của dự án này, làm việc rất cẩn thận nghiêm túc."},
  {"hanzi": "保证", "pinyin": "bǎozhèng", "vi": "Bảo đảm, cam kết", "hsk_level": 4, "example_hanzi": "我向你保证，这批产品质量绝对过关。", "example_pinyin": "Wǒ xiàng nǐ bǎozhèng, zhè pī chǎnpǐn zhìliàng juéduì guòguān.", "example_vi": "Tôi cam kết với bạn chất lượng lô sản phẩm này tuyệt đối đạt chuẩn."},
  {"hanzi": "及时", "pinyin": "jíshí", "vi": "Kịp thời, đúng lúc", "hsk_level": 4, "example_hanzi": "谢谢你及时提醒我，差点忘了交表格。", "example_pinyin": "Xièxie nǐ jíshí tíxǐng wǒ, chàdiǎn wàng le jiāo biǎogé.", "example_vi": "Cảm ơn bạn đã nhắc nhở kịp thời, suýt nữa thì tôi quên nộp biểu mẫu."},
  {"hanzi": "仔细", "pinyin": "zǐxì", "vi": "Tỉ mỉ, cẩn thận", "hsk_level": 4, "example_hanzi": "签字前请仔细阅读每一条合同细则。", "example_pinyin": "Qiān zì qián qǐng zǐxì yuèdú měi yì tiáo hétong xìzé.", "example_vi": "Trước khi ký tên xin hãy đọc kỹ từng điều khoản chi tiết của hợp đồng."}
];

// 2. Dữ liệu Công Sở bổ sung
const additionalWp = [
  {"hanzi": "简历", "pinyin": "jiǎnlì", "vi": "Sơ yếu lý lịch, CV", "category": "office", "example_hanzi": "我已经把最新的个人中文简历发给您了。", "example_pinyin": "Wǒ yǐjīng bǎ zuìxīn de gèrén zhōngwén jiǎnlì fā gěi nín le.", "example_vi": "Em đã gửi bản CV tiếng Trung mới nhất của mình cho anh/chị rồi ạ."},
  {"hanzi": "面试", "pinyin": "miànshì", "vi": "Phỏng vấn xin việc", "category": "office", "example_hanzi": "明天下午两点我有一场重要的外企面试。", "example_pinyin": "Míngtiān xiàwǔ liǎng diǎn wǒ yǒu yì chǎng zhòngyào de wàiqǐ miànshì.", "example_vi": "Chiều mai lúc hai giờ tôi có một buổi phỏng vấn quan trọng vào doanh nghiệp nước ngoài."},
  {"hanzi": "薪水", "pinyin": "xīnshuǐ", "vi": "Tiền lương, thu nhập", "category": "office", "example_hanzi": "我们公司的薪水每月十号准时发放到银行卡。", "example_pinyin": "Wǒmen gōngsī de xīnshuǐ měi yuè shí hào zhǔnshí fāfàng dào yínhángkǎ.", "example_vi": "Tiền lương của công ty chúng tôi được trả đúng ngày 10 hàng tháng qua thẻ ngân hàng."},
  {"hanzi": "培训", "pinyin": "péixùn", "vi": "Đào tạo, tập huấn", "category": "office", "example_hanzi": "新员工入职第一周都要参加业务培训。", "example_pinyin": "Xīn yuángōng rùzhí dì yī zhōu dōu yào cānjiā yèwù péixùn.", "example_vi": "Nhân viên mới tuần đầu tiên đều phải tham gia đào tạo nghiệp vụ."},
  {"hanzi": "审批", "pinyin": "shēnpī", "vi": "Phê duyệt, duyệt đơn", "category": "office", "example_hanzi": "这份采购申请已经在OA系统里流转审批了。", "example_pinyin": "Zhè fèn cǎigòu shēnqǐng yǐjīng zài OA xìtǒng lǐ liúzhuǎn shēnpī le.", "example_vi": "Đơn xin mua sắm này đã được chuyển lên hệ thống nội bộ để chờ duyệt rồi."},
  {"hanzi": "签字", "pinyin": "qiān zì", "vi": "Ký tên xác nhận", "category": "office", "example_hanzi": "请您在协议确认书的最后一页右下角签字。", "example_pinyin": "Qǐng nín zài xiéyì quèrènshū de zuìhòu yí yè yòuxiàjiǎo qiān zì.", "example_vi": "Xin mời anh/chị ký tên ở góc dưới bên phải trang cuối cùng của biên bản thỏa thuận."},
  {"hanzi": "预算", "pinyin": "yùsuàn", "vi": "Ngân sách tài chính", "category": "report", "example_hanzi": "第四季度的市场营销预算已经获批。", "example_pinyin": "Dì sì jīdù de shìchǎng yíngxiāo yùsuàn yǐjīng huò pī.", "example_vi": "Ngân sách marketing quý 4 đã chính thức được phê duyệt."},
  {"hanzi": "成本", "pinyin": "chéngběn", "vi": "Giá vốn, chi phí sản xuất", "category": "report", "example_hanzi": "优化供应链可以有效降低产品生产成本。", "example_pinyin": "Yōuhuà gōngyìngliàn kěyǐ yǒuxiào jiàngdī chǎnpǐn shēngchǎn chéngběn.", "example_vi": "Tối ưu hóa chuỗi cung ứng có thể giảm thiểu chi phí sản xuất sản phẩm một cách hiệu quả."},
  {"hanzi": "利润", "pinyin": "lìrùn", "vi": "Lợi nhuận", "category": "report", "example_hanzi": "今年上半年公司的净利润同比增长了百分之十五。", "example_pinyin": "Jīnnián shàngbànnián gōngsī de jìnglìrùn tóngbǐ zēngzhǎng le bǎifēnzhī shíwǔ.", "example_vi": "Sáu tháng đầu năm nay lợi nhuận ròng của công ty tăng trưởng 15% so với cùng kỳ."},
  {"hanzi": "交付", "pinyin": "jiāofù", "vi": "Bàn giao, giao hàng", "category": "client", "example_hanzi": "我们承诺在月底前完成第二批货物的交付。", "example_pinyin": "Wǒmen chéngnuò zài yuèdǐ qián wánchéng dì èr pī huòwù de jiāofù.", "example_vi": "Chúng tôi cam kết hoàn thành bàn giao lô hàng thứ hai trước cuối tháng."},
  {"hanzi": "发票", "pinyin": "fāpiào", "vi": "Hóa đơn VAT, chứng từ thuế", "category": "client", "example_hanzi": "付款完成后财务会为您开具电子增值税发票。", "example_pinyin": "Fùkuǎn wánchéng hòu cáiwù huì wèi nín kāijù diànzǐ zēngzhíshuì fāpiào.", "example_vi": "Sau khi thanh toán hoàn tất bộ phận kế toán sẽ xuất hóa đơn GTGT điện tử cho quý khách."},
  {"hanzi": "辞职", "pinyin": "cízhí", "vi": "Nghỉ việc, từ chức", "category": "office", "example_hanzi": "按照规定，员工辞职需要提前三十天书面通知。", "example_pinyin": "Ànzhào guīdìng, yuángōng cízhí xūyào tíqián sānshí tiān shūmiàn tōngzhī.", "example_vi": "Theo quy định, nhân viên xin nghỉ việc cần thông báo bằng văn bản trước ba mươi ngày."}
];

// Nối và lọc trùng theo hanzi
function mergeData(filePath, additional) {
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const existingHanzi = new Set(current.map(i => i.hanzi));
  let added = 0;
  for (const item of additional) {
    if (!existingHanzi.has(item.hanzi)) {
      current.push(item);
      existingHanzi.add(item.hanzi);
      added++;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
  console.log(`Đã thêm ${added} mục mới vào ${path.basename(filePath)} (tổng: ${current.length})`);
}

mergeData(path.join(__dirname, 'vocab_hsk.json'), additionalHsk);
mergeData(path.join(__dirname, 'vocab_workplace.json'), additionalWp);
console.log('✅ Đã cập nhật xong bộ từ vựng mở rộng!');

