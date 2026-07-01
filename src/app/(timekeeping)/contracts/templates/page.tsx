'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Card, Table, Button, Modal, Form, Input, Switch,
  notification, Space, Popconfirm, Tooltip, Badge, Tag, Divider,
} from 'antd';
import {
  FileText, Plus, Edit2, Trash2, CheckCircle, XCircle,
  Printer, Eye, Copy, Zap, User, Building, FileSignature, CircleDollarSign
} from 'lucide-react';
import dayjs from 'dayjs';
import '../components/ckeditor-a4.css';

// Dynamic import CKEditor (SSR-safe)
const CKEditorWrapper = dynamic(
  () => import('../components/CKEditorWrapper'),
  { ssr: false, loading: () => (
    <div className="border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center" style={{ minHeight: 400 }}>
      <div className="text-slate-400 animate-pulse flex items-center gap-2">
        <FileText size={16} /> Đang tải trình soạn thảo...
      </div>
    </div>
  )}
);

// ── Types ────────────────────────────────────────────────────────────────────
export interface TemplateSection {
  title: string;
  rawText: string;
}

export interface ContractTemplate {
  _id: string;
  templateName: string;
  htmlContent?: string;
  sections?: TemplateSection[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── Biến gợi ý ──────────────────────────────────────────────────────────────
const VARIABLE_GROUPS = [
  {
    group: 'Nhân viên',
    icon: User,
    items: [
      { key: '{{full_name}}', label: 'Họ và tên' },
      { key: '{{employee_code}}', label: 'Mã nhân viên' },
      { key: '{{dob}}', label: 'Ngày sinh' },
      { key: '{{gender}}', label: 'Giới tính' },
      { key: '{{address}}', label: 'Địa chỉ thường trú' },
      { key: '{{identity_card}}', label: 'Số CMND/CCCD' },
      { key: '{{id_issue_date}}', label: 'Ngày cấp CCCD' },
      { key: '{{id_issue_place}}', label: 'Nơi cấp CCCD' },
      { key: '{{nationality}}', label: 'Quốc tịch' },
    ],
  },
  {
    group: 'Công ty',
    icon: Building,
    items: [
      { key: '{{company_name}}', label: 'Tên công ty' },
      { key: '{{company_short_name}}', label: 'Tên viết tắt' },
      { key: '{{company_address}}', label: 'Địa chỉ công ty' },
      { key: '{{company_tax_code}}', label: 'Mã số thuế' },
      { key: '{{company_representative}}', label: 'Người đại diện' },
      { key: '{{company_role}}', label: 'Chức vụ đại diện' },
      { key: '{{company_phone}}', label: 'Điện thoại' },
    ],
  },
  {
    group: 'Công việc',
    icon: Building,
    items: [
      { key: '{{department}}', label: 'Phòng ban' },
      { key: '{{role}}', label: 'Chức vụ' },
      { key: '{{work_location}}', label: 'Địa điểm làm việc' },
    ],
  },
  {
    group: 'Hợp đồng',
    icon: FileSignature,
    items: [
      { key: '{{contract_number}}', label: 'Số hợp đồng' },
      { key: '{{day}}', label: 'Ngày lập HĐ' },
      { key: '{{month}}', label: 'Tháng lập HĐ' },
      { key: '{{year}}', label: 'Năm lập HĐ' },
      { key: '{{start_date}}', label: 'Ngày bắt đầu' },
      { key: '{{end_date}}', label: 'Ngày kết thúc' },
      { key: '{{duration}}', label: 'Thời hạn HĐ' },
    ],
  },
  {
    group: 'Lương thưởng',
    icon: CircleDollarSign,
    items: [
      { key: '{{base_salary}}', label: 'Lương cơ bản' },
      { key: '{{base_salary_text}}', label: 'Lương CB (bằng chữ)' },
      { key: '{{allowance}}', label: 'Phụ cấp' },
      { key: '{{allowance_text}}', label: 'Phụ cấp (bằng chữ)' },
    ],
  },
];

const HUPUNA_CONTRACT_TEMPLATE = `<table style="width: 100%; border: none; border-collapse: collapse; font-family: 'Times New Roman', serif;">
  <tbody>
    <tr>
      <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0;">
        <p style="margin: 0; font-size: 16px;"><strong>{{company_name}}</strong></p>
        <hr style="width: 30%; border-top: 1px solid black; margin: 5px auto;">
        <p style="margin: 5px 0 0 0; font-size: 16px;">Số: {{contract_number}}/HDLD-HPN</p>
      </td>
      <td style="width: 55%; text-align: center; vertical-align: top; border: none; padding: 0;">
        <p style="margin: 0; font-size: 16px;"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
        <p style="margin: 0; font-size: 16px;"><strong>Độc lập - Tự do - Hạnh phúc</strong></p>
        <hr style="width: 35%; border-top: 1px solid black; margin: 5px auto;">
        <p style="margin: 5px 0 0 0; font-size: 16px;"><em>Hà Nội, ngày {{day}} tháng {{month}} năm {{year}}</em></p>
      </td>
    </tr>
  </tbody>
</table>

<p style="text-align: center; margin: 20px 0 0 0; font-family: 'Times New Roman', serif; font-size: 20px;"><strong>HỢP ĐỒNG LAO ĐỘNG</strong></p>
<p style="text-align: center; margin: 5px 0 20px 0; font-family: 'Times New Roman', serif; font-size: 16px;"><strong><em>(Số: {{contract_number}}/2024/HĐLĐ/{{company_name}})</em></strong></p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><em>- Căn cứ vào Bộ Luật Lao Động số 45/2019/QH14 ngày 20 tháng 11 năm 2019.</em></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><em>- Căn cứ vào Nghị định 145/2020/NĐ-CP ngày 14/12/2020 của Chính Phủ quy định chi tiết và hướng dẫn thi hành một số điều của Bộ luật lao động về điều kiện lao động và quan hệ lao động.</em></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><em>- Căn cứ Luật sở hữu trí tuệ số 07/VBHN-VPQH của Quốc Hội ban hành ngày 25 tháng 06 năm 2019 về Quyền sở hữu trí tuệ.</em></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;"><em>- Căn cứ nhu cầu và khả năng của các bên.</em></p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">Hôm nay, ngày {{day}} tháng {{month}} năm {{year}}, tại {{company_name}}, chúng tôi gồm:</p>

<table style="width: 100%; border: none; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 25%; border: none; padding: 0;">Bên A</td><td style="width: 75%; border: none; padding: 0;"><strong>: {{company_name}}</strong></td></tr>
    <tr><td style="border: none; padding: 0;">Tên viết tắt</td><td style="border: none; padding: 0;">: {{company_short_name}}</td></tr>
    <tr><td style="border: none; padding: 0;">Địa chỉ</td><td style="border: none; padding: 0;">: {{company_address}}</td></tr>
    <tr><td style="border: none; padding: 0;">Mã số thuế</td><td style="border: none; padding: 0;">: {{company_tax_code}}</td></tr>
    <tr><td style="border: none; padding: 0;">Đại diện</td><td style="border: none; padding: 0;">: {{company_representative}}</td></tr>
    <tr><td style="border: none; padding: 0;">Chức vụ</td><td style="border: none; padding: 0;">: {{company_role}}</td></tr>
    <tr><td style="border: none; padding: 0;">Điện thoại</td><td style="border: none; padding: 0;">: {{company_phone}}</td></tr>
  </tbody>
</table>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>Bên B:</strong></p>
<table style="width: 100%; border: none; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
  <tbody>
    <tr><td style="width: 60%; border: none; padding: 0;">Họ và tên: <strong>{{full_name}}</strong></td><td style="width: 40%; border: none; padding: 0;">Quốc tịch: {{nationality}}</td></tr>
    <tr><td colspan="2" style="border: none; padding: 0;">Ngày sinh: {{dob}}</td></tr>
    <tr><td colspan="2" style="border: none; padding: 0;">Nơi sinh: {{pob}}</td></tr>
    <tr><td colspan="2" style="border: none; padding: 0;">Địa chỉ thường trú: {{address}}</td></tr>
    <tr><td style="width: 60%; border: none; padding: 0;">Số CMND/CCCD: {{identity_card}}</td><td style="width: 40%; border: none; padding: 0;">Cấp ngày: {{id_issue_date}}</td></tr>
    <tr><td colspan="2" style="border: none; padding: 0;">Tại: {{id_issue_place}}</td></tr>
  </tbody>
</table>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;"><em>(*) Bên A: Người sử dụng lao động – Bên B: Người lao động</em></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">Sau khi trao đổi, hai bên thoả thuận thống nhất ký kết Hợp đồng lao động (HĐLĐ) và cam kết làm đúng những điều khoản sau đây:</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 1: Điều khoản chung</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>1. Loại HĐLĐ:</strong> Có thời hạn</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>2. Thời hạn HĐLĐ:</strong> 01 năm</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>3. Thời điểm từ:</strong> Ngày {{start_day}} tháng {{start_month}} năm {{start_year}} đến ngày {{end_day}} tháng {{end_month}} năm {{end_year}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>4. Địa điểm làm việc:</strong> Tại {{company_name}} - {{company_address}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>5. Bộ phận công tác:</strong> {{department}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 20px;"><strong>Chức vụ:</strong> {{role}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>6. Nhiệm vụ công việc như sau:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Thực hiện công việc theo đúng chức danh chuyên môn của mình dưới sự quản lý, điều hành của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Phối hợp cùng với các bộ phận, phòng ban khác trong Công ty để phát huy tối đa hiệu quả công việc.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">- Hoàn thành những công việc khác tùy thuộc theo yêu cầu kinh doanh của Công ty và theo quyết định của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 2: Chế độ làm việc</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>1. Thời gian làm việc:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Trong ngày: Sáng từ 8 giờ - 12 giờ, chiều từ 13 giờ 30 phút - 17 giờ 30 phút</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Trong tuần: 6 ngày/tuần: Từ thứ 2 đến hết thứ 7.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>2. Thời gian nghỉ:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Hàng tuần: Được nghỉ ngày Chủ nhật</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Nghỉ hàng năm, nghỉ lễ, tết, nghỉ việc riêng: Áp dụng theo Quy định của nhà nước và công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>3. Nhu cầu công việc:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Do tính chất công việc, nhu cầu kinh doanh hay nhu cầu của tổ chức/bộ phận, Công ty có thể cho áp dụng thời gian làm việc linh hoạt. Những nhân viên được áp dụng thời gian làm việc linh hoạt có thể không tuân thủ lịch làm việc cố định bình thường mà làm theo ca kíp.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>4. Thiết bị và công cụ làm việc</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Công ty cấp phát tùy theo nhu cầu của công việc.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>5. Khối lượng công việc</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">- ÁP DỤNG THEO TÌNH HÌNH THỰC TẾ VÀ NĂNG LỰC</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 3: Trách nhiệm, nghĩa vụ và quyền lợi của người lao động</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>1. Trách nhiệm:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">a) Hoàn thành những công việc đã cam kết trong hợp đồng lao động.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">b) Chấp hành nội quy, quy định kỷ luật lao động và an toàn lao động theo pháp luật.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">c) Hoàn thành chỉ tiêu, yêu cầu công việc bên A đề ra đúng tiến độ.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">d) Bảo quản và quản lý tài sản, sản phẩm, thiết bị bên A cung cấp.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">e) Có trách nhiệm trong công việc.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">f) Không sử dụng sản phẩm, thiết bị, vật dụng tài sản của bên A và mục đích riêng như kiếm tiền khác.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">g) Không gây mất trật tự an ninh nơi làm việc; không gây gổ xích mích trong công việc và không sử dụng các chất gây nghiện, cờ bạc, tụ tập; không sử dụng các chất kích thích khác.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">h) Không ăn cắp, ăn trộm sản phẩm và các thiết bị, dụng cụ liên quan khác trong quá trình làm việc và không mang thiết bị, sản phẩm, ra khỏi nơi làm việc khi chưa có sự cho phép của bên A.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>2. Nghĩa vụ:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">a) Thực hiện công việc với sự tận tâm, tận lực và mẫn cán, đảm bảo hoàn thành công việc với hiệu quả cao nhất theo sự phân công, điều hành (bằng văn bản hoặc bằng lời nói) của Ban giám đốc trong Công ty (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">b) Hoàn thành công việc được giao và sẵn sàng chấp nhận mọi sự điều động khi có nhu cầu.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">c) Nắm rõ và chấp hành nghiêm túc kỷ luật lao động, an toàn lao động, PCCC, văn hóa công ty, nội quy lao động và các chủ trương, chính sách của Công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">d) Bồi thường vi phạm và vật chất theo quy chế, nội quy của Công ty và pháp luật Nhà nước quy định.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">e) Tham dự đầy đủ, nhiệt tình các buổi huấn luyện, đào tạo, hội thảo do Bộ phận hoặc Công ty tổ chức.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">f) Thực hiện đúng cam kết trong HĐLĐ và các thỏa thuận bằng văn bản khác với Công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">g) Đóng các loại bảo hiểm, các khoản thuế .v.v.. đầy đủ theo quy định của pháp luật.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">h) Chế độ đào tạo: Theo quy định của Công ty và yêu cầu công việc. Trong trường hợp CBNV được cử đi đào tạo thì nhân viên phải hoàn thành khóa học đúng thời hạn, phải cam kết sẽ phục vụ lâu dài cho Công ty sau khi kết thúc khóa học và được hưởng nguyên lương, các quyền lợi khác được hưởng như người đi làm.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>3. Quyền lợi:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>a) Tiền lương và phụ cấp:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Mức lương chính (cơ bản): {{base_salary}} VNĐ/tháng. Bằng chữ: {{base_salary_text}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Phụ cấp: {{allowance}} VNĐ/tháng. Bằng chữ: {{allowance_text}}</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Phụ cấp hiệu suất công việc: Theo đánh giá của quản lý.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Lương hiệu quả: Theo quy định của phòng ban, Công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Công tác phí: Tùy từng vị trí, người lao động được hưởng theo quy định của công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Thời hạn trả lương: Ngày 15 hàng tháng.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">- Hình thức trả lương: Chuyển khoản hoặc tiền mặt.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>b) Các quyền lợi khác:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Khen thưởng: Người lao động được khuyến khích bằng vật chất và tinh thần khi có thành tích trong công tác hoặc theo quy định của công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Chế độ nâng lương: Theo quy định của Nhà nước và quy chế tiền lương của Công ty. Người lao động hoàn thành tốt nhiệm vụ được giao, không vi phạm kỷ luật và không trong thời gian xử lý kỷ luật lao động và đủ điều kiện về thời gian theo quy chế lương thì được xét nâng lương.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">- Hưởng tháng lương 13 căn cứ theo mức lương cơ bản theo hợp đồng và thời gian lao động, thời gian ký hợp đồng lao động.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 4: Nghĩa vụ và quyền hạn của người sử dụng lao động:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>1. Nghĩa vụ:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Thực hiện đầy đủ những điều kiện cần thiết đã cam kết trong Hợp đồng lao động để người lao động đạt hiệu quả công việc cao. Bảo đảm việc làm cho người lao động theo Hợp đồng đã ký.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Thanh toán đầy đủ, đúng hạn các chế độ và quyền lợi cho người lao động theo HĐLĐ.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">- Tăng lương, thưởng, chế độ đãi ngộ nếu bên B hoàn thành tốt công việc được giao.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>2. Quyền hạn</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">a) Điều hành người lao động hoàn thành công việc theo Hợp đồng (bố trí, điều chuyển công việc cho người lao động theo đúng chức năng chuyên môn).</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">b) Có quyền chuyển tạm thời lao động, ngừng việc, thay đổi, tạm thời chấm dứt HĐLĐ và áp dụng các biện pháp kỷ luật theo quy định của Pháp luật hiện hành và theo nội quy của Công ty trong thời gian hợp đồng còn giá trị.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">c) Tạm hoãn, chấm dứt hợp đồng, kỷ luật người lao động theo đúng quy định của Pháp luật, và nội quy lao động của Công ty.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">d) Có quyền đòi hỏi bồi thường, khiếu nại với cơ quan liên đới để bảo vệ quyền lợi của mình nếu người lao động vi phạm Pháp luật hay các điều khoản của hợp đồng này.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 5: Bồi thường vi phạm vật chất và tài sản đối với người lao động (BÊN B).</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Người lao động nghỉ ngang bị cắt toàn bộ các khoản lương, thưởng (nếu có) bên B chưa nhận.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Ăn cắp, ăn trộm sản phẩm và các thiết bị, dụng cụ tài sản công ty – Bên A phát hiện sẽ phải chịu hình phạt theo quy định của pháp luật và đền bù 200% giá trị tài sản, sản phẩm, bị chấm dứt hợp đồng và phạt lương do bên A đề xuất.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Vi phạm pháp luật sẽ tự chịu trách nhiệm trước pháp luật.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Sử dụng thiết bị, sản phẩm, tài sản của công ty, Bên A vào mục đích riêng; tư lợi khi không được sự cho phép của bên A sẽ bị phạt 90% lương chưa thanh toán.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Gây hỏng hóc, mất mát; không bảo quản thiết bị, sản phẩm sẽ bồi thường theo thỏa thuận.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">- Cung cấp sản phẩm, thiết bị, chia sẻ tài liệu bí mật của công ty (Bên A) cho công ty khác, đơn vị khác: Bên B sẽ phải bồi thường theo mức độ ảnh hưởng được tính không quá 90% lương chưa thanh toán.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">- Mang thiết bị ra khỏi nơi làm việc khi chưa được sự cho phép của quản lý, khi mất, bị hỏng hoặc thất thoát sẽ phải bồi thường 100% giá trị thiết bị tính theo giá thị trường.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 6: Đơn phương chấm dứt hợp đồng:</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>1. Người sử dụng lao động</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Theo quy định tại điều 38 Bộ luật Lao động thì người sử dụng lao động có quyền đơn phương chấm dứt hợp đồng lao động trong những trường hợp sau:</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">a) Người lao động thường xuyên không hoàn thành công việc theo hợp đồng;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">b) Người lao động bị xử lý kỷ luật sa thải theo quy định tại điều 85 của Bộ luật Lao động;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">c) Người lao động làm theo hợp đồng lao động không xác định thời hạn ốm đau đã điều trị 12 tháng liền, người lao động làm theo hợp đồng lao động xác định thời hạn ốm đau đã điều trị 06 tháng liền và người lao động làm theo hợp đồng lao động dưới 01 năm ốm đau đã điều trị quá nửa thời hạn hợp đồng, mà khả năng lao động chưa hồi phục. Khi sức khỏe của người lao động bình phục, thì được xem xét để giao kết tiếp hợp đồng lao động;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">d) Do thiên tai, hỏa hoạn, hoặc những lý do bất khả kháng khác mà người sử dụng lao động đã tìm mọi biện pháp khác phục nhưng vẫn buộc phải thu hẹp sản xuất, giảm chỗ làm việc;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">e) Doanh nghiệp, cơ quan, tổ chức chấm dứt hoạt động;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">f) Người lao động vi phạm kỷ luật mức sa thải;</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">g) Người lao động có hành vi gây thiệt hại nghiêm trọng về tài sản và lợi ích của Công ty, chia bè phái gây kích động người khác, làm người khác buồn chán và nghỉ việc, bêu xấu công ty về các chế độ chính sách.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">h) Người lao động đang thi hành kỷ luật mức chuyển công tác mà tái phạm.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">i) Người lao động tự ý bỏ việc 3 ngày/1 tháng hoặc 20 ngày/1 năm</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">k) Người lao động vi phạm Pháp luật Nhà nước.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Trong thời hạn 30 ngày, kể từ ngày chấm dứt hợp đồng lao động, hai bên có trách nhiệm thanh toán đầy đủ các khoản có liên quan đến quyền lợi của mỗi bên, trường hợp đặc biệt, có thể kéo dài nhưng không quá 90 ngày.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 10px 0;">Trong trường hợp doanh nghiệp bị phá sản thì các khoản có liên quan đến quyền lợi của người lao động được thanh toán theo quy định của Luật Phá sản doanh nghiệp.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;"><strong>2. Người lao động</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Khi người lao động đơn phương chấm dứt Hợp đồng lao động trước thời hạn phải dựa theo hợp đồng lao động và dựa trên các căn cứ sau:</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">a) Được sự đồng ý của Bên A</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">b) Thông báo nghỉ việc theo quy định: Người lao động có ý định thôi việc vì các lý do khác thì phải thông báo bằng văn bản cho người sử dụng lao động biết trước ít nhất là 30 ngày. Người lao động phải hoàn thành công việc trong 30 ngày sau khi báo cáo thôi việc hoặc chuyển công tác và bàn giao, tuyển dụng, sắp xếp, hướng dẫn công việc cho bộ phận hoặc cá nhân tiếp nhận công việc.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">* Người lao động xin thôi việc, nghỉ việc chưa được sự đồng ý của người sử dụng lao động hoặc chưa đủ thời hạn báo trước và bàn giao công việc đầy đủ tự ý nghỉ việc sẽ được coi là vi phạm hợp đồng lao động.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">(Lưu ý: Khi người lao động xin nghỉ việc, thì trong tháng viết đơn đó là tháng chốt BHXH, công ty không đóng bảo hiểm và người tham gia cũng không bị khấu trừ tiền đóng bảo hiểm).</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 7: Những thỏa thuận khác.</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">- Trong quá trình thực hiện hợp đồng, nếu một bên có nhu cầu thay đổi nội dung trong hợp đồng phải báo cho bên kia ít nhất 20 ngày và ký kết bản Phụ lục hợp đồng theo quy định của Pháp luật. Trong thời gian tiến hành thỏa mãn hai bên vẫn tuân theo hợp đồng lao động đã ký kết.</p>

<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 15px 0 5px 0;"><strong>Điều 8: Điều khoản thi hành.</strong></p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Một số vấn đề lao động không ghi trong hợp đồng này thì áp dụng quy định của thỏa ước tập thể, thỏa thuận hai bên thống nhất bằng phụ lục.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Hợp đồng lao động (tổng có 6 trang) được làm thành 02 bản có giá trị ngang nhau, mỗi bên giữ một bản và có hiệu lực từ ngày {{start_day}} tháng {{start_month}} năm {{start_year}} đến ngày {{end_day}} tháng {{end_month}} năm {{end_year}}. Nội dung phụ lục hợp đồng lao động cũng có giá trị như nội dung của hợp đồng lao động này.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Hợp đồng lao động có đính kèm nội quy lao động có giá trị như hợp đồng lao động này.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Người lao động vi phạm những Điều 1, Điều 2, Điều 3 và Điều 5 trong hợp đồng lao động sẽ phải chịu theo Điều 5: Bồi thường vi phạm vật chất và tài sản đối với người lao động.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 5px 0;">Người lao động vi phạm hợp đồng lao động, vi phạm pháp luật tự chịu trách nhiệm trước pháp luật.</p>
<p style="font-family: 'Times New Roman', serif; font-size: 16px; text-align: justify; margin: 0 0 15px 0;">Hợp đồng này lập tại: {{company_address}} ngày {{day}} tháng {{month}} năm {{year}}</p>

<br><br>
<table style="width: 100%; border: none; border-collapse: collapse; text-align: center; font-family: 'Times New Roman', serif; font-size: 16px;">
  <tbody>
    <tr>
      <td style="width: 50%; border: none; padding: 0;"><strong>NGƯỜI LAO ĐỘNG</strong><br><em>(Ký, ghi họ tên)</em></td>
      <td style="width: 50%; border: none; padding: 0;"><strong>ĐẠI DIỆN CỦA CÔNG TY</strong><br><em>(Ký, ghi họ tên và đóng dấu)</em></td>
    </tr>
  </tbody>
</table>
<br><br><br><br><br><br>`;;

// Chuyển sections cũ → HTML (backward compat)
function sectionsToHtml(sections: TemplateSection[]): string {
  return sections.map(sec => `<h3>${sec.title}</h3><p>${sec.rawText.replace(/\n/g, '<br>')}</p>`).join('\n');
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const htmlContentRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const [form] = Form.useForm();

  // Keep ref in sync
  useEffect(() => {
    htmlContentRef.current = htmlContent;
  }, [htmlContent]);

  // ── Fetch ──
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contract-templates');
      const json = await res.json();
      if (json.data) setTemplates(json.data);
    } catch {
      notification.error({ message: 'Lỗi tải danh sách mẫu hợp đồng' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initFetch() {
      try {
        const res = await fetch('/api/contract-templates');
        const json = await res.json();
        if (!ignore && json.data) setTemplates(json.data);
      } catch {
        if (!ignore) notification.error({ message: 'Lỗi tải danh sách mẫu hợp đồng' });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    initFetch();
    return () => { ignore = true; };
  }, []);

  // ── Open modal Tạo mới ──
  function openCreate() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setHtmlContent(HUPUNA_CONTRACT_TEMPLATE);
    setModalOpen(true);
  }

  // ── Open modal Sửa ──
  function openEdit(tpl: ContractTemplate) {
    setEditingId(tpl._id);
    form.setFieldsValue({
      templateName: tpl.templateName,
      isActive: tpl.isActive,
    });
    // Backward compat: nếu chỉ có sections cũ thì chuyển sang HTML
    const html = tpl.htmlContent
      ? tpl.htmlContent
      : tpl.sections && tpl.sections.length > 0
        ? sectionsToHtml(tpl.sections)
        : '';
    setHtmlContent(html);
    setModalOpen(true);
  }

  // ── Submit ──
  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      const content = htmlContentRef.current;

      if (!content || content.trim() === '' || content === '<p></p>' || content === '<p><br data-cke-filler="true"></p>') {
        notification.error({ message: 'Nội dung hợp đồng không được trống' });
        return;
      }

      setSubmitting(true);
      const payload = {
        action: editingId ? 'edit' : 'add',
        ...(editingId ? { _id: editingId } : {}),
        templateName: values.templateName,
        isActive: values.isActive,
        htmlContent: content,
      };

      const res = await fetch('/api/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        notification.success({ message: json.message });
        setModalOpen(false);
        fetchTemplates();
      } else {
        notification.error({ message: json.message || 'Lỗi lưu mẫu hợp đồng' });
      }
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    const res = await fetch('/api/contract-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', _id: id }),
    });
    const json = await res.json();
    if (json.success) {
      notification.success({ message: json.message });
      fetchTemplates();
    } else {
      notification.error({ message: json.message || 'Lỗi xóa' });
    }
  }

  // ── Toggle active ──
  async function handleToggle(tpl: ContractTemplate) {
    const res = await fetch('/api/contract-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', _id: tpl._id, isActive: tpl.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      notification.success({ message: json.message });
      fetchTemplates();
    } else {
      notification.error({ message: 'Lỗi thay đổi trạng thái' });
    }
  }

  // ── Insert/Copy variable ──
  function handleVariableClick(varKey: string) {
    if (editorInstance) {
      try {
        editorInstance.model.change((writer: any) => {
          const insertPosition = editorInstance.model.document.selection.getFirstPosition();
          writer.insertText(varKey, insertPosition);
        });
        editorInstance.editing.view.focus();
        return;
      } catch (err) {
        console.error("Lỗi chèn biến", err);
      }
    }
    navigator.clipboard.writeText(varKey).then(() => {
      notification.success({ message: `Đã copy ${varKey}`, duration: 1.5 });
    });
  }

  // ── Columns ──
  const columns = [
    {
      title: 'Tên mẫu hợp đồng',
      dataIndex: 'templateName',
      key: 'templateName',
      render: (name: string, record: ContractTemplate) => (
        <div>
          <div className="font-semibold text-slate-800">{name}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            {record.htmlContent ? (
              <><Zap size={11} className="text-emerald-500" /> CKEditor HTML</>
            ) : (
              <><FileText size={11} /> Định dạng cũ ({record.sections?.length || 0} điều khoản)</>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (active: boolean, record: ContractTemplate) => (
        <Tooltip title={active ? 'Đang kích hoạt — Click để tắt' : 'Đang tắt — Click để kích hoạt'}>
          <Switch
            checked={active}
            size="small"
            onChange={() => handleToggle(record)}
            checkedChildren={<CheckCircle size={12} />}
            unCheckedChildren={<XCircle size={12} />}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => d ? (
        <span className="text-xs text-slate-400">{dayjs(d).format('DD/MM/YYYY')}</span>
      ) : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: ContractTemplate) => (
        <Space size="small">
          <Tooltip title="Xem preview A4">
            <Button size="small" icon={<Eye size={14} />}
              className="border-slate-200 text-slate-600"
              onClick={() => { setPreviewTemplate(record); setPreviewOpen(true); }} />
          </Tooltip>
          <Tooltip title="Tạo hợp đồng nhanh (Live Fill)">
            <Button size="small" icon={<Printer size={14} />}
              className="border-emerald-200 text-emerald-600"
              onClick={() => {
                window.open(`/contracts/fill/${record._id}`, '_blank');
              }} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<Edit2 size={14} />}
              className="border-blue-200 text-blue-600"
              onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa mẫu hợp đồng này?"
            description="Thao tác này không thể hoàn tác."
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<Trash2 size={14} />} className="border-red-200" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-auto pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Mẫu Hợp đồng Lao động
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Soạn thảo mẫu hợp đồng bằng trình soạn thảo chuyên nghiệp — tự động điền dữ liệu nhân viên
          </p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}
          className="bg-blue-600 font-medium">
          Tạo mẫu hợp đồng
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Badge count={templates.filter(t => t.isActive).length} color="#2563eb" title="Đang kích hoạt">
            <span className="text-sm text-slate-500">
              Tổng: <strong className="text-slate-800">{templates.length}</strong> mẫu
            </span>
          </Badge>
        </div>
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
          rowClassName="hover:bg-slate-50/50 cursor-pointer"
        />
      </Card>

      {/* ── MODAL Tạo / Sửa ─────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>{editingId ? 'Chỉnh sửa mẫu hợp đồng' : 'Tạo mẫu hợp đồng mới'}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingId ? 'Lưu thay đổi' : 'Tạo mẫu'}
        cancelText="Hủy"
        confirmLoading={submitting}
        width="95vw"
        style={{ top: 20, maxWidth: 1400 }}
        styles={{ body: { padding: '16px', overflow: 'hidden' } }}
        destroyOnHidden
      >
        <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
          {/* ── Bên trái: Form + CKEditor ── */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 custom-scrollbar pb-4">
            <Form form={form} layout="vertical" className="shrink-0">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Form.Item name="templateName" label="Tên mẫu hợp đồng" rules={[{ required: true, message: 'Nhập tên mẫu' }]} className="mb-0">
                  <Input placeholder="VD: HĐ Lao động Hupuna (Chính thức)" />
                </Form.Item>
                <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" className="mb-0">
                  <Switch checkedChildren="Kích hoạt" unCheckedChildren="Tắt" />
                </Form.Item>
              </div>
            </Form>

            <Divider className="my-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Soạn thảo nội dung hợp đồng</span>
              <Button 
                size="small" 
                type="dashed" 
                icon={<FileText size={12} />} 
                className="ml-4 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                onClick={() => setHtmlContent(HUPUNA_CONTRACT_TEMPLATE)}
              >
                Tải Mẫu Hợp đồng chuẩn HUPUNA
              </Button>
            </Divider>

            <CKEditorWrapper
              value={htmlContent}
              onChange={(val) => setHtmlContent(val)}
              onReady={(editor) => setEditorInstance(editor)}
              placeholder="Bắt đầu soạn thảo hợp đồng. Gõ {{ để chèn biến tự động..."
              height={500}
            />
          </div>

          {/* ── Bên phải: Sidebar biến gợi ý ── */}
          <div className="w-72 shrink-0 flex flex-col h-full">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col h-full overflow-hidden">
              <div className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1.5 shrink-0">
                <Zap size={14} /> Biến tự động điền
              </div>
              <p className="text-xs text-blue-500 mb-3 shrink-0 leading-relaxed">
                Click trực tiếp vào biến để tự động chèn vào vị trí con trỏ trong hợp đồng.
              </p>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                {VARIABLE_GROUPS.map(group => {
                  const Icon = group.icon;
                  return (
                    <div key={group.group} className="mb-1">
                      <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Icon size={14} className="text-slate-400" /> {group.group}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map(item => (
                          <button
                            key={item.key}
                            onClick={() => handleVariableClick(item.key)}
                            className="flex items-center justify-between gap-2 text-left text-xs bg-white border border-blue-100 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm px-2.5 py-2 rounded-lg transition-all cursor-pointer group"
                          >
                            <div className="flex flex-col overflow-hidden gap-0.5">
                              <span className="text-slate-700 font-medium truncate">{item.label}</span>
                              <span className="text-blue-500 font-mono text-[10px] opacity-80 truncate">{item.key}</span>
                            </div>
                            <Copy size={12} className="text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 pt-3 border-t border-blue-100/50 pb-2">
                  <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span className="text-amber-500">💡</span> Gợi ý trường trống
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Dùng <code className="bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-700">..........</code> hoặc để trống để HR điền trực tiếp khi tạo hợp đồng.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL Preview A4 ─────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-slate-600" />
            <span>Preview: {previewTemplate?.templateName}</span>
          </div>
        }
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>Đóng</Button>,
          <Button key="fill" type="primary" icon={<Printer size={14} />}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            onClick={() => {
              if (previewTemplate) {
                window.open(`/contracts/fill/${previewTemplate._id}`, '_blank');
              }
            }}>
            Tạo hợp đồng nhanh (Live Fill)
          </Button>,
        ]}
        width={900}
        centered
        styles={{ body: { padding: '16px', maxHeight: '80vh', overflowY: 'auto', background: '#f0f0f0' } }}
      >
        {previewTemplate && (
          <div className="contract-a4-preview ck-content"
            dangerouslySetInnerHTML={{
              __html: previewTemplate.htmlContent ||
                (previewTemplate.sections ? sectionsToHtml(previewTemplate.sections) : '<p>Chưa có nội dung</p>')
            }}
          />
        )}
      </Modal>
    </div>
  );
}
