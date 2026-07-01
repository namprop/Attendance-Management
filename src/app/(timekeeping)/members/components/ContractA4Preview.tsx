import React from 'react';
import dayjs from 'dayjs';
import { Employee } from '../types';

export interface TemplateSection {
  title: string;
  rawText: string;
}

export interface ContractTemplate {
  _id: string;
  templateName: string;
  contractType?: string;
  htmlContent?: string;
  sections?: TemplateSection[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── Render sections cũ (backward compat) ────────────────────────────────────
const renderTemplateText = (text: string, employee?: Employee): React.ReactNode => {
  if (!text) return text;
  const parts = text.split(/(\{\{.*?\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const varName = part.replace(/[{}]/g, '').trim();

      if (employee) {
        if (varName === 'full_name' && employee.fullName) return <span key={i}>{employee.fullName}</span>;
        if (varName === 'dob' && employee.dateOfBirth) return <span key={i}>{dayjs(employee.dateOfBirth).format('DD/MM/YYYY')}</span>;
        if (varName === 'pob' && employee.nativePlace) return <span key={i}>{employee.nativePlace}</span>;
        if (varName === 'address' && employee.address) return <span key={i}>{employee.address}</span>;
        if (varName === 'identity_card' && employee.identityCard) return <span key={i}>{employee.identityCard}</span>;
        if (varName === 'id_issue_date' && employee.issueDate) return <span key={i}>{dayjs(employee.issueDate).format('DD/MM/YYYY')}</span>;
        if (varName === 'id_issue_place' && employee.issuePlace) return <span key={i}>{employee.issuePlace}</span>;
        if (varName === 'role' && employee.role) return <span key={i}>{employee.role}</span>;
        if (varName === 'nationality' && employee.nationality) return <span key={i}>{employee.nationality}</span>;
      }

      if (varName === 'day') return <span key={i}>{String(dayjs().date()).padStart(2, '0')}</span>;
      if (varName === 'month') return <span key={i}>{String(dayjs().month() + 1).padStart(2, '0')}</span>;
      if (varName === 'year') return <span key={i}>{String(dayjs().year())}</span>;

      const shortVars = ['day', 'month', 'year', 'start_day', 'start_month', 'start_year', 'end_day', 'end_month', 'end_year', 'contract_number'];
      const dots = shortVars.includes(varName) ? '...' : '..........................................';
      return <span key={i} style={{ letterSpacing: '1px' }}>{dots}</span>;
    }
    return <span key={i}>{part}</span>;
  });
};

// ── Compile htmlContent (thay thế biến → dữ liệu / dấu chấm) ──────────────
const compileHtmlContent = (html: string, employee?: Employee): string => {
  return html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const varName = key.trim();

    if (employee) {
      if (varName === 'full_name' && employee.fullName) return employee.fullName;
      if (varName === 'dob' && employee.dateOfBirth) return dayjs(employee.dateOfBirth).format('DD/MM/YYYY');
      if (varName === 'pob' && employee.nativePlace) return employee.nativePlace;
      if (varName === 'address' && employee.address) return employee.address;
      if (varName === 'identity_card' && employee.identityCard) return employee.identityCard;
      if (varName === 'id_issue_date' && employee.issueDate) return dayjs(employee.issueDate).format('DD/MM/YYYY');
      if (varName === 'id_issue_place' && employee.issuePlace) return employee.issuePlace;
      if (varName === 'role' && employee.role) return employee.role;
      if (varName === 'nationality' && employee.nationality) return employee.nationality;
    }

    if (varName === 'day') return String(dayjs().date()).padStart(2, '0');
    if (varName === 'month') return String(dayjs().month() + 1).padStart(2, '0');
    if (varName === 'year') return String(dayjs().year());

    // Biến ngắn (ngày tháng, số HĐ) dùng dấu chấm ngắn
    const shortVars = ['day', 'month', 'year', 'start_day', 'start_month', 'start_year', 'end_day', 'end_month', 'end_year', 'contract_number'];
    return shortVars.includes(varName) ? '.....' : '..........................';
  });
};

// ── Sections cũ → HTML string ────────────────────────────────────────────────
function sectionsToHtml(sections: TemplateSection[]): string {
  return sections.map(sec =>
    `<h3>${sec.title}</h3><p>${sec.rawText.replace(/\n/g, '<br>')}</p>`
  ).join('\n');
}

// ── ContractA4Preview ─────────────────────────────────────────────────────────
export const ContractA4Preview = ({
  template,
  id,
  employee,
}: {
  template: ContractTemplate;
  id?: string;
  employee?: Employee;
}) => {
  // Ưu tiên htmlContent mới (CKEditor), fallback về sections cũ
  const hasHtml = template.htmlContent && template.htmlContent.trim().length > 0;
  const hasSections = template.sections && template.sections.length > 0;

  if (hasHtml) {
    // ── Render CKEditor HTML ──
    const compiled = compileHtmlContent(template.htmlContent!, employee);
    return (
      <div className="flex justify-center p-6" style={{ background: '#e5e7eb', minHeight: '100%' }}>
        <div
          id={id}
          className="ck-content"
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: 'white',
            padding: '20mm 15mm 20mm 20mm',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '14pt',
            lineHeight: '1.6',
            color: '#000',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
          dangerouslySetInnerHTML={{ __html: compiled }}
        />
      </div>
    );
  }

  // ── Fallback: Render sections cũ (định dạng cứng Hupuna) ──────────────────
  return (
    <div className="flex justify-center p-6" style={{ background: '#e5e7eb', minHeight: '100%' }}>
      <div
        id={id}
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: 'white',
          padding: '20mm 15mm 20mm 20mm',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '13pt',
          lineHeight: '1.5',
          color: '#000',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        {/* QUỐC HIỆU TIÊU NGỮ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '12pt' }}>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <p style={{ fontWeight: 'bold', margin: '0' }}>CÔNG TY CỔ PHẦN</p>
            <p style={{ fontWeight: 'bold', margin: '0' }}>HUPUNA GROUP</p>
            <p style={{ margin: '0' }}>Số: {renderTemplateText('{{contract_number}}', employee)} /HDLD-HPN</p>
          </div>
          <div style={{ textAlign: 'center', width: '60%' }}>
            <p style={{ fontWeight: 'bold', margin: '0' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style={{ fontWeight: 'bold', margin: '0' }}>Độc lập - Tự do - Hạnh phúc</p>
            <p style={{ fontStyle: 'italic', margin: '4px 0 0' }}>
              Hà Nội, ngày {renderTemplateText('{{day}}', employee)} tháng {renderTemplateText('{{month}}', employee)} năm {renderTemplateText('{{year}}', employee)}
            </p>
          </div>
        </div>

        {/* TIÊU ĐỀ */}
        <div style={{ textAlign: 'center', margin: '16px 0 20px' }}>
          <p style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0' }}>HỢP ĐỒNG LAO ĐỘNG</p>
          <p style={{ fontSize: '12pt', margin: '0', fontStyle: 'italic' }}>
            (Số: {renderTemplateText('{{contract_number}}', employee)}/{renderTemplateText('{{year}}', employee)}/HĐLĐ/CÔNG TY CỔ PHẦN HUPUNA GROUP)
          </p>
        </div>

        {/* CĂN CỨ PHÁP LÝ */}
        <div style={{ marginBottom: '16px', fontSize: '12pt', textAlign: 'justify' }}>
          <p style={{ margin: '4px 0' }}>- Căn cứ vào Bộ Luật Lao Động số 45/2019/QH14 ngày 20 tháng 11 năm 2019.</p>
          <p style={{ margin: '4px 0' }}>- Căn cứ vào Nghị định 145/2020/NĐ-CP ngày 14/12/2020 của Chính Phủ.</p>
          <p style={{ margin: '4px 0' }}>- Căn cứ nhu cầu và khả năng của các bên.</p>
        </div>

        {/* THÔNG TIN HAI BÊN */}
        <div style={{ marginBottom: '16px', fontSize: '12pt', textAlign: 'justify' }}>
          <p style={{ margin: '4px 0' }}>
            Hôm nay, ngày {renderTemplateText('{{day}}', employee)} tháng {renderTemplateText('{{month}}', employee)} năm {renderTemplateText('{{year}}', employee)}, tại CÔNG TY CỔ PHẦN HUPUNA GROUP, chúng tôi gồm:
          </p>
          <div style={{ marginTop: '8px' }}>
            <p><strong>Bên A:</strong> CÔNG TY CỔ PHẦN HUPUNA GROUP</p>
            <p><strong>Bên B:</strong> {renderTemplateText('{{full_name}}', employee)}</p>
            <p>Ngày sinh: {renderTemplateText('{{dob}}', employee)}</p>
            <p>Địa chỉ: {renderTemplateText('{{address}}', employee)}</p>
            <p>CMND/CCCD: {renderTemplateText('{{identity_card}}', employee)} — Cấp ngày: {renderTemplateText('{{id_issue_date}}', employee)}</p>
          </div>
        </div>

        <p style={{ fontSize: '12pt', marginBottom: '16px', textAlign: 'justify' }}>
          Sau khi trao đổi, hai bên thoả thuận thống nhất ký kết Hợp đồng lao động (HĐLĐ) và cam kết làm đúng những điều khoản sau đây:
        </p>

        {/* CÁC ĐIỀU KHOẢN */}
        {hasSections && template.sections!.map((sec, i) => (
          <div key={i} style={{ marginBottom: '14px', textAlign: 'justify' }}>
            <p style={{ fontWeight: 'bold', fontSize: '12pt', margin: '0 0 4px' }}>{sec.title}</p>
            <p style={{ whiteSpace: 'pre-line', margin: '0', fontSize: '12pt' }}>
              {renderTemplateText(sec.rawText, employee)}
            </p>
          </div>
        ))}

        {/* KÝ TÊN */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', marginTop: '40px', fontWeight: 'bold', fontSize: '12pt' }}>
          <div>
            <p style={{ margin: '0' }}>NGƯỜI LAO ĐỘNG</p>
            <p style={{ fontStyle: 'italic', fontWeight: 'normal', fontSize: '11pt', margin: '2px 0' }}>(Ký, ghi họ tên)</p>
            <div style={{ height: '80px' }}></div>
            <p style={{ margin: '0' }}>{renderTemplateText('{{full_name}}', employee)}</p>
          </div>
          <div>
            <p style={{ margin: '0' }}>ĐẠI DIỆN CỦA CÔNG TY</p>
            <p style={{ fontStyle: 'italic', fontWeight: 'normal', fontSize: '11pt', margin: '2px 0' }}>(Ký, ghi họ tên và đóng dấu)</p>
            <div style={{ height: '80px' }}></div>
            <p style={{ margin: '0' }}>NGUYỄN TIẾN HUY</p>
          </div>
        </div>
      </div>
    </div>
  );
};
