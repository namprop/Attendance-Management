import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

// POST /api/contract-templates/seed — Tạo mẫu hợp đồng Chấm công chuẩn
export async function POST() {
  try {
    const { db } = await connectToDatabase();

    // Kiểm tra đã có chưa để tránh duplicate
    const existing = await db.collection('contract_templates').findOne({
      templateName: { $regex: 'Chấm công', $options: 'i' }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Mẫu hợp đồng Chấm công đã tồn tại trong hệ thống',
      }, { status: 409 });
    }

    const templates = [
      {
        templateName: 'Hợp đồng Lao động Chấm công (Chính thức)',
        contractType: 'full_time',
        isActive: true,
        sections: [
          {
            title: 'Điều 1: Điều khoản chung',
            rawText:
              '1. Loại HĐLĐ: Có thời hạn\n' +
              '2. Thời hạn HĐLĐ: {{duration}}\n' +
              '3. Thời điểm từ: Ngày {{start_day}} tháng {{start_month}} năm {{start_year}} đến ngày {{end_day}} tháng {{end_month}} năm {{end_year}}\n' +
              '4. Địa điểm làm việc: Tại CÔNG TY TNHH CHẤM CÔNG - Hà Nội, Việt Nam\n' +
              '5. Bộ phận công tác: {{department}}\n' +
              ' Chức vụ: {{role}}\n' +
              '6. Nhiệm vụ công việc như sau:\n' +
              '- Thực hiện công việc theo đúng chức danh chuyên môn của mình dưới sự quản lý, điều hành của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).\n' +
              '- Phối hợp cùng với các bộ phận, phòng ban khác trong Công ty để phát huy tối đa hiệu quả công việc.\n' +
              '- Hoàn thành những công việc khác tùy thuộc theo yêu cầu kinh doanh của Công ty và theo quyết định của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).'
          },
          {
            title: 'Điều 2: Chế độ làm việc',
            rawText:
              '1. Thời gian làm việc:\n' +
              '- Trong ngày: Sáng từ 8 giờ -12 giờ, chiều từ 13 giờ 30 phút -17 giờ 30 phút\n' +
              '- Trong tuần: 6 ngày/tuần: Từ thứ 2 đến hết thứ 7 .\n' +
              '2. Thời gian nghỉ:\n' +
              '- Hàng tuần: Được nghỉ ngày Chủ nhật\n' +
              '- Nghỉ hàng năm, nghỉ lễ, tết, nghỉ việc riêng: Áp dụng theo Quy định của nhà nước và công ty.\n' +
              '3. Nhu cầu công việc:\n' +
              '- Do tính chất công việc, nhu cầu kinh doanh hay nhu cầu của tổ chức/bộ phận, Công ty có thể cho áp dụng thời gian làm việc linh hoạt. Những nhân viên được áp dụng thời gian làm việc linh hoạt có thể không tuân thủ lịch làm việc cố định bình thường mà làm theo ca kíp.\n' +
              '4. Thiết bị và công cụ làm việc\n' +
              '- Công ty cấp phát tùy theo nhu cầu của công việc.\n' +
              '5. Khối lượng công việc\n' +
              '- ÁP DỤNG THEO TÌNH HÌNH THỰC TẾ VÀ NĂNG LỰC'
          },
          {
            title: 'Điều 3: Trách nhiệm, nghĩa vụ và quyền lợi của người lao động',
            rawText:
              '1. Trách nhiệm:\n' +
              'a) Hoàn thành những công việc đã cam kết trong hợp đồng lao động.\n' +
              'b) Chấp hành nội quy, quy định kỷ luật lao động và an toàn lao động theo pháp luật\n' +
              'c) Hoàn thành chỉ tiêu, yêu cầu công việc bên A đề ra đúng tiến độ.\n' +
              'd) Bảo quản và quản lý tài sản, sản phẩm, thiết bị bên A cung cấp.\n' +
              'e) Có trách nhiệm trong công việc.\n' +
              'f) Không sử dụng sản phẩm, thiết bị, vật dụng tài sản của bên A và mục đích riêng như kiếm tiền khác.\n' +
              'g) Không gây mất trật tự an ninh nơi làm việc; không gây gổ xích mích trong công việc và không sử dụng các chất gây nghiện, cờ bạc, tụ tập; không sử dụng các chất kích thích khác.\n' +
              'h) Không ăn cắp, ăn trộm sản phẩm và các thiết bị, dụng cụ liên quan khác trong quá trình làm việc và không mang thiết bị, sản phẩm,ra khỏi nơi làm việc khi chưa có sự cho phép của bên A.\n' +
              '2. Nghĩa vụ:\n' +
              'a) Thực hiện công việc với sự tận tâm, tận lực và mẫn cán, đảm bảo hoàn thành công việc với hiệu quả cao nhất theo sự phân công, điều hành (bằng văn bản hoặc bằng lời nói) của Ban giám đốc trong Công ty (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).\n' +
              'b) Hoàn thành công việc được giao và sẵn sàng chấp nhận mọi sự điều động khi có nhu cầu.\n' +
              'c) Nắm rõ và chấp hành nghiêm túc kỷ luật lao động, an toàn lao động, PCCC, văn hóa công ty, nội quy lao động và các chủ trương, chính sách của Công ty.\n' +
              'd) Bồi thường vi phạm và vật chất theo quy chế, nội quy của Công ty và pháp luật Nhà nước quy định.\n' +
              'e) Tham dự đầy đủ, nhiệt tình các buổi huấn luyện, đào tạo, hội thảo do Bộ phận hoặc Công ty tổ chức.\n' +
              'f) Thực hiện đúng cam kết trong HĐLĐ và các thỏa thuận bằng văn bản khác với Công ty.\n' +
              'g) Đóng các loại bảo hiểm, các khoản thuế .v.v.. đầy đủ theo quy định của pháp luật.\n' +
              'h) Chế độ đào tạo: Theo quy định của Công ty và yêu cầu công việc. Trong trường hợp CBNV được cử đi đào tạo thì nhân viên phải hoàn thành khóa học đúng thời hạn, phải cam kết sẽ phục vụ lâu dài cho Công ty sau khi kết thúc khóa học và được hưởng nguyên lương, các quyền lợi khác được hưởng như người đi làm.\n' +
              '3. Quyền lợi:\n' +
              'a) Tiền lương và phụ cấp:\n' +
              '- Mức lương chính (cơ bản): {{base_salary}} VNĐ/tháng. Bằng chữ: {{base_salary_text}}\n' +
              '- Phụ cấp: {{allowance}} VNĐ/tháng. Bằng chữ: {{allowance_text}}\n' +
              '- Phụ cấp hiệu suất công việc: Theo đánh giá của quản lý.\n' +
              '- Lương hiệu quả: Theo quy định của phòng ban, Công ty.\n' +
              '- Công tác phí: Tùy từng vị trí, người lao động được hưởng theo quy định của công ty.\n' +
              '- Thời hạn trả lương: Ngày 15 hàng tháng.\n' +
              '- Hình thức trả lương: Chuyển khoản hoặc tiền mặt.\n' +
              'b) Các quyền lợi khác:\n' +
              '- Khen thưởng: Người lao động được khuyến khích bằng vật chất và tinh thần khi có thành tích trong công tác hoặc theo quy định của công ty.\n' +
              '- Chế độ nâng lương: Theo quy định của Nhà nước và quy chế tiền lương của Công ty. Người lao động hoàn thành tốt nhiệm vụ được giao, không vi phạm kỷ luật và không trong thời gian xử lý kỷ luật lao động và đủ điều kiện về thời gian theo quy chế lương thì được xét nâng lương.\n' +
              '- Hưởng tháng lương 13 căn cứ theo mức lương cơ bản theo hợp đồng và thời gian lao động, thời gian ký hợp đồng lao động.'
          },
          {
            title: 'Điều 4: Nghĩa vụ và quyền hạn của người sử dụng lao động:',
            rawText:
              '1. Nghĩa vụ:\n' +
              '- Thực hiện đầy đủ những điều kiện cần thiết đã cam kết trong Hợp đồng lao động để người lao động đạt hiệu quả công việc cao. Bảo đảm việc làm cho người lao động theo Hợp đồng đã ký.\n' +
              '- Thanh toán đầy đủ, đúng hạn các chế độ và quyền lợi cho người lao động theo HĐLĐ.\n' +
              '- Tăng lương, thưởng, chế độ đãi ngộ nếu bên B hoàn thành tốt công việc được giao.\n' +
              '2. Quyền hạn\n' +
              'a) Điều hành người lao động hoàn thành công việc theo Hợp đồng (bố trí, điều chuyển công việc cho người lao động theo đúng chức năng chuyên môn).\n' +
              'b) Có quyền chuyển tạm thời lao động, ngừng việc, thay đổi, tạm thời chấm dứt HĐLĐ và áp dụng các biện pháp kỷ luật theo quy định của Pháp luật hiện hành và theo nội quy của Công ty trong thời gian hợp đồng còn giá trị.\n' +
              'c) Tạm hoãn, chấm dứt hợp đồng, kỷ luật người lao động theo đúng quy định của Pháp luật, và nội quy lao động của Công ty.\n' +
              'd) Có quyền đòi hỏi bồi thường, khiếu nại với cơ quan liên đới để bảo vệ quyền lợi của mình nếu người lao động vi phạm Pháp luật hay các điều khoản của hợp đồng này.'
          },
          {
            title: 'Điều 5: Bồi thường vi phạm vật chất và tài sản đối với người lao động (BÊN B).',
            rawText:
              '- Người lao động nghỉ ngang bị cắt toàn bộ các khoản lương, thưởng (nếu có) bên B chưa nhận.\n' +
              '- Ăn cắp, ăn trộm sản phẩm và các thiết bị, dụng cụ tài sản công ty – Bên A phát hiện sẽ phải chịu hình phạt theo quy định của pháp luật và đền bù 200% giá trị tài sản, sản phẩm, bị chấm dứt hợp đồng và phạt lương do bên A đề xuất.\n' +
              '- Vi phạm pháp luật sẽ tự chịu trách nhiệm trước pháp luật.\n' +
              '- Sử dụng thiết bị, sản phẩm, tài sản của công ty, Bên A vào mục đích riêng; tư lợi khi không được sự cho phép của bên A sẽ bị phạt 90% lương chưa thanh toán.\n' +
              '- Gây hỏng hóc, mất mát; không bảo quản thiết bị, sản phẩm sẽ bồi thường theo thỏa thuận.\n' +
              '- Cung cấp sản phẩm, thiết bị, chia sẻ tài liệu bí mật của công ty (Bên A) cho công ty khác, đơn vị khác: Bên B sẽ phải bồi thường theo mức độ ảnh hưởng được tính không quá 90% lương chưa thanh toán.\n' +
              '- Mang thiết bị ra khỏi nơi làm việc khi chưa được sự cho phép của quản lý, khi mất, bị hỏng hoặc thất thoát sẽ phải bồi thường 100% giá trị thiết bị tính theo giá thị trường.'
          },
          {
            title: 'Điều 6: Đơn phương chấm dứt hợp đồng:',
            rawText:
              '1. Người sử dụng lao động\n' +
              'Theo quy định tại điều 38 Bộ luật Lao động thì người sử dụng lao động có quyền đơn phương chấm dứt hợp đồng lao động trong những trường hợp sau:\n' +
              'a) Người lao động thường xuyên không hoàn thành công việc theo hợp đồng;\n' +
              'b) Người lao động bị xử lý kỷ luật sa thải theo quy định tại điều 85 của Bộ luật Lao động;\n' +
              'c) Người lao động làm theo hợp đồng lao động không xác định thời hạn ốm đau đã điều trị 12 tháng liền, người lao động làm theo hợp đồng lao động xác định thời hạn ốm đau đã điều trị 06 tháng liền và người lao động làm theo hợp đồng lao động dưới 01 năm ốm đau đã điều trị quá nửa thời hạn hợp đồng, mà khả năng lao động chưa hồi phục. Khi sức khỏe của người lao động bình phục, thì được xem xét để giao kết tiếp hợp đồng lao động;\n' +
              'd) Do thiên tai, hỏa hoạn, hoặc những lý do bất khả kháng khác mà người sử dụng lao động đã tìm mọi biện pháp khác phục nhưng vẫn buộc phải thu hẹp sản xuất, giảm chỗ làm việc;\n' +
              'e) Doanh nghiệp, cơ quan, tổ chức chấm dứt hoạt động;\n' +
              'f) Người lao động vi phạm kỷ luật mức sa thải;\n' +
              'g) Người lao động có hành vi gây thiệt hại nghiêm trọng về tài sản và lợi ích của Công ty, chia bè phái gây kích động người khác, làm người khác buồn chán và nghỉ việc, bêu xấu công ty về các chế độ chính sách.\n' +
              'h) Người lao động đang thi hành kỷ luật mức chuyển công tác mà tái phạm.\n' +
              'i) Người lao động tự ý bỏ việc 3 ngày/1 tháng hoặc 20 ngày/1 năm\n' +
              'k) Người lao động vi phạm Pháp luật Nhà nước.\n' +
              'Trong thời hạn 30 ngày, kể từ ngày chấm dứt hợp đồng lao động, hai bên có trách nhiệm thanh toán đầy đủ các khoản có liên quan đến quyền lợi của mỗi bên, trường hợp đặc biệt, có thể kéo dài nhưng không quá 90 ngày.\n' +
              ' Trong trường hợp doanh nghiệp bị phá sản thì các khoản có liên quan đến quyền lợi của người lao động được thanh toán theo quy định của Luật Phá sản doanh nghiệp.\n' +
              '2. Người lao động\n' +
              'Khi người lao động đơn phương chấm dứt Hợp đồng lao động trước thời hạn phải dựa theo hợp đồng lao động và dựa trên các căn cứ sau:\n' +
              'a) Được sự đồng ý của Bên A\n' +
              'b) Thông báo nghỉ việc theo quy định: Người lao động có ý định thôi việc vì các lý do khác thì phải thông báo bằng văn bản cho người sử dụng lao động biết trước ít nhất là 30 ngày. Người lao động phải hoàn thành công việc trong 30 ngày sau khi báo cáo thôi việc hoặc chuyển công tác và bàn giao, tuyển dụng, sắp xếp, hướng dẫn công việc cho bộ phận hoặc cá nhân tiếp nhận công việc.\n' +
              '*Người lao động xin thôi việc, nghỉ việc chưa được sự đồng ý của người sử dụng lao động hoặc chưa đủ thời hạn báo trước và bàn giao công việc đầy đủ tự ý nghỉ việc sẽ được coi là vi phạm hợp đồng lao động.\n' +
              '(Lưu ý: Khi người lao động xin nghỉ việc, thì trong tháng viết đơn đó là tháng chốt BHXH, công ty không đóng bảo hiểm và người tham gia cũng không bị khấu trừ tiền đóng bảo hiểm).'
          },
          {
            title: 'Điều 7: Những thỏa thuận khác.',
            rawText:
              '- Trong quá trình thực hiện hợp đồng, nếu một bên có nhu cầu thay đổi nội dung trong hợp đồng phải báo cho bên kia ít nhất 20 ngày và ký kết bản Phụ lục hợp đồng theo quy định của Pháp luật. Trong thời gian tiến hành thỏa mãn hai bên vẫn tuân theo hợp đồng lao động đã ký kết.'
          },
          {
            title: 'Điều 8: Điều khoản thi hành.',
            rawText:
              'Một số vấn đề lao động không ghi trong hợp đồng này thì áp dụng quy định của thỏa ước tập thể, thỏa thuận hai bên thống nhất bằng phụ lục.\n' +
              'Hợp đồng lao động (tổng có 6 trang) được làm thành 02 bản có giá trị ngang nhau, mỗi bên giữ một bản và có hiệu lực từ ngày {{start_day}} tháng {{start_month}} năm {{start_year}} đến ngày {{end_day}} tháng {{end_month}} năm {{end_year}}. Nội dung phụ lục hợp đồng lao động cũng có giá trị như nội dung của hợp đồng lao động này.\n' +
              'Hợp đồng lao động có đính kèm nội quy lao động có giá trị như hợp đồng lao động này.\n' +
              'Người lao động vi phạm những Điều 1, Điều 2, Điều 3 và Điều 5 trong hợp đồng lao động sẽ phải chịu theo Điều 5: Bồi thường vi phạm vật chất và tài sản đối với người lao động.\n' +
              'Người lao động vi phạm hợp đồng lao động, vi phạm pháp luật tự chịu trách nhiệm trước pháp luật.\n' +
              'Hợp đồng này lập tại: Hà Nội, Tân Triều, Thanh Trì,Hà Nội ngày {{day}} tháng {{month}} năm {{year}}'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await db.collection('contract_templates').insertMany(templates);

    return NextResponse.json({
      success: true,
      message: `Đã tạo ${templates.length} mẫu hợp đồng Chấm công thành công`,
      data: templates.map(t => ({ templateName: t.templateName, contractType: t.contractType })),
    });

  } catch (error) {
    console.error('Lỗi seed contract templates:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
