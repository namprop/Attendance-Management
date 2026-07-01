'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { use } from 'react';
import { Button, Form, Input, DatePicker, Select, Spin, Divider, notification, Modal, Tag } from 'antd';
import { Printer, ArrowLeft, RefreshCw, User, FileText, AlertCircle, PenTool, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import '../../components/ckeditor-a4.css';
import { useSignatureCanvas } from '@/app/hooks/useSignatureCanvas';

// ── Types ────────────────────────────────────────────────────────────────────
interface ContractTemplate {
  _id: string;
  templateName: string;
  htmlContent?: string;
  sections?: { title: string; rawText: string }[];
}

interface Employee {
  id: string;
  _id?: string;
  fullName: string;
  employeeCode: string;
  employeeType?: string;
  email?: string;
  phone?: string;
  role?: string;
  departmentId?: string;
  identityCard?: string;
  issueDate?: string;
  issuePlace?: string;
  dateOfBirth?: string;
  joinDate?: string;
  address?: string;
  nationality?: string;
  nativePlace?: string;
  gender?: string;
}

interface Department {
  _id: string;
  name: string;
}

// ── Extract biến từ HTML ─────────────────────────────────────────────────────
function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{([^}]+)\}\}/g) || [];
  const unique = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
  return unique;
}

// ── Biên dịch mẫu ban đầu ──
function compileInitialHtml(html: string, values: Record<string, string>) {
  return html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const val = values[trimmedKey] || '';
    // Thêm class 'contract-var' để nhận diện, dùng attribute data-var
    // Dùng Non-Breaking Space (&#160;) để giữ con trỏ không bị sập (collapse) khi span rỗng
    return `<span class="contract-var contract-blank ${!val.trim() ? 'empty-field' : ''}" data-var="${trimmedKey}">${val || '&#160;'}</span>`;
  });
}

// ── Label cho từng biến ──────────────────────────────────────────────────────
const VARIABLE_LABELS: Record<string, string> = {
  full_name: 'Họ và tên',
  employee_code: 'Mã nhân viên',
  dob: 'Ngày sinh',
  gender: 'Giới tính',
  address: 'Địa chỉ thường trú',
  identity_card: 'Số CMND/CCCD',
  id_issue_date: 'Ngày cấp CCCD',
  id_issue_place: 'Nơi cấp CCCD',
  nationality: 'Quốc tịch',
  department: 'Phòng ban',
  role: 'Chức vụ',
  work_location: 'Địa điểm làm việc',
  contract_number: 'Số hợp đồng',
  day: 'Ngày lập HĐ',
  month: 'Tháng lập HĐ',
  year: 'Năm lập HĐ',
  start_date: 'Ngày bắt đầu',
  end_date: 'Ngày kết thúc',
  duration: 'Thời hạn HĐ',
  base_salary: 'Lương cơ bản',
  base_salary_text: 'Lương CB (bằng chữ)',
  allowance: 'Phụ cấp',
  allowance_text: 'Phụ cấp (bằng chữ)',
  company_name: 'Tên công ty',
  company_short_name: 'Tên viết tắt',
  company_address: 'Địa chỉ công ty',
  company_tax_code: 'Mã số thuế',
  company_representative: 'Người đại diện',
  company_role: 'Chức vụ đại diện',
  company_phone: 'Điện thoại công ty',
};

// ── Sections → HTML backward compat ─────────────────────────────────────────
function sectionsToHtml(sections: { title: string; rawText: string }[]): string {
  return sections.map(s => `<h3>${s.title}</h3><p>${s.rawText.replace(/\n/g, '<br>')}</p>`).join('\n');
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContractFillPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params);

  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');
  const [isViewMode, setIsViewMode] = useState<boolean>(!!contractId);

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(searchParams.get('employeeId') || '');
  const isSupplementary = searchParams.get('supplementary') === 'true';
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Real contract tracking fields
  const [contractStartDate, setContractStartDate] = useState<dayjs.Dayjs | null>(null);
  const [contractEndDate, setContractEndDate] = useState<dayjs.Dayjs | null>(null);

  // Status & Signatures
  const [status, setStatus] = useState<string>('DRAFT');
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(null);
  const [managerSignature, setManagerSignature] = useState<string | null>(null);
  const [signModalOpen, setSignModalOpen] = useState<'EMPLOYEE' | 'MANAGER' | null>(null);
  const { canvasRef, startDraw, draw, stopDraw, clearCanvas, getDataUrl, isEmpty } = useSignatureCanvas();

  // Dùng ref để giữ HTML DOM
  const editorRef = useRef<HTMLDivElement>(null);
  const isEditingDomRef = useRef(false);
  const [initialCompiledHtml, setInitialCompiledHtml] = useState('');


  // ── Fetch dữ liệu ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi song song tất cả API cùng 1 lúc (kể cả contract nếu có)
      const [tplRes, empRes, deptRes, contractRes] = await Promise.all([
        fetch(`/api/contract-templates`),
        fetch('/api/v1/employees?pageSize=500'),
        fetch('/api/departments-timekeeping'),
        contractId ? fetch(`/api/v1/employee-contracts/${contractId}`) : Promise.resolve(null),
      ]);

      const [tplJson, empJson, deptJson] = await Promise.all([
        tplRes.json(),
        empRes.json(),
        deptRes.json(),
      ]);

      const found = (tplJson.data || []).find((t: ContractTemplate) => t._id === templateId);
      setTemplate(found || null);
      setEmployees(empJson.data || []);
      setDepartments(deptJson.data || []);

      // Parse dữ liệu hợp đồng cũ (nếu có)
      if (contractRes) {
        const contractJson = await contractRes.json();
        if (contractJson.success && contractJson.data) {
          const c = contractJson.data;
          setFieldValues(c.filledData || {});
          if (c.startDate) setContractStartDate(dayjs(c.startDate));
          if (c.endDate) setContractEndDate(dayjs(c.endDate));
          if (c.employeeSignature) setEmployeeSignature(c.employeeSignature);
          if (c.managerSignature) setManagerSignature(c.managerSignature);
          if (c.status) {
            setStatus(c.status);
            setIsViewMode(c.status !== 'DRAFT');
          }
        }
      }
    } catch {
      notification.error({ message: 'Lỗi tải dữ liệu' });
    } finally {
      setLoading(false);
    }
  }, [templateId, contractId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // ── Nếu có contractId: đã được tích hợp vào fetchData ở trên ──


  // ── Khi chọn nhân viên (chỉ auto-fill nếu KHÔNG có contractId) ──
  useEffect(() => {
    if (!selectedEmployeeId || contractId) return;
    const emp = employees.find(e => (e._id || e.id) === selectedEmployeeId);
    if (!emp) return;

    const dept = departments.find(d => d._id === emp.departmentId);
    const dob = emp.dateOfBirth ? dayjs(emp.dateOfBirth).format('DD/MM/YYYY') : '';
    const join = emp.joinDate ? dayjs(emp.joinDate) : null;

    const today = dayjs();

    setTimeout(() => {
      setFieldValues(prev => ({
        ...prev,
        // --- Employee Info ---
        full_name: emp.fullName || '',
        employee_code: emp.employeeCode || '',
        dob,
        gender: emp.gender || '',
        address: emp.address || '',
        identity_card: emp.identityCard || '',
        id_issue_date: emp.issueDate ? dayjs(emp.issueDate).format('DD/MM/YYYY') : '',
        id_issue_place: emp.issuePlace || '',
        pob: emp.nativePlace || '',
        nationality: emp.nationality || 'Việt Nam',
        department: dept?.name || '',
        role: emp.role || '',
        // --- Date Info ---
        day: today.format('DD'),
        month: today.format('MM'),
        year: today.format('YYYY'),
        start_day: join ? join.format('DD') : '',
        start_month: join ? join.format('MM') : '',
        start_year: join ? join.format('YYYY') : '',
        // --- Company Info Defaults ---
        company_name: 'CÔNG TY CỔ PHẦN HUPUNA GROUP',
        company_short_name: 'HUPUNA GROUP',
        company_address: '286 Nguyễn Xiển, Tân Triều, Thanh Trì, Hà Nội',
        company_tax_code: '0109746861',
        company_representative: 'NGUYỄN TIẾN HUY',
        company_role: 'Tổng giám đốc',
        company_phone: '0379669666',
      }));

      if (join && !contractStartDate) {
        setContractStartDate(join);
      }
    }, 0);
  }, [selectedEmployeeId, employees, departments]);

  // ── Lấy HTML gốc từ template ──
  const rawHtml = useMemo(() => {
    if (!template) return '';
    if (template.htmlContent) return template.htmlContent;
    if (template.sections && template.sections.length > 0) return sectionsToHtml(template.sections);
    return '';
  }, [template]);

  // ── Danh sách biến cần điền ──
  const variables = useMemo(() => extractVariables(rawHtml), [rawHtml]);

  // Nhóm các biến ngày tháng
  const hasContractDate = variables.includes('day') && variables.includes('month') && variables.includes('year');
  const hasStartDate = variables.includes('start_day') && variables.includes('start_month') && variables.includes('start_year');
  const hasEndDate = variables.includes('end_day') && variables.includes('end_month') && variables.includes('end_year');

  const groupedVars = [
    ...(hasContractDate ? ['day', 'month', 'year'] : []),
    ...(hasStartDate ? ['start_day', 'start_month', 'start_year'] : []),
    ...(hasEndDate ? ['end_day', 'end_month', 'end_year'] : []),
  ];

  const standardVars = variables.filter(v => !groupedVars.includes(v));

  // ── Sinh HTML ban đầu 1 lần ──
  useEffect(() => {
    if (rawHtml) {
      setTimeout(() => {
        setInitialCompiledHtml(compileInitialHtml(rawHtml, fieldValues));
      }, 0);
    }
    // Khởi tạo 1 lần hoặc khi đổi template (không phụ thuộc fieldValues để tránh re-render ghi đè DOM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawHtml]);

  useEffect(() => {
    if (!editorRef.current || isEditingDomRef.current) return;
    const spans = editorRef.current.querySelectorAll('.contract-var');
    spans.forEach((span: Element) => {
      const key = span.getAttribute('data-var');
      if (key) {
        const domVal = (span.textContent || '').replace(/\u00A0/g, '').trim();
        const stateVal = (fieldValues[key] || '').trim();

        // Chỉ ghi đè DOM nếu nội dung THỰC SỰ khác nhau
        if (domVal !== stateVal) {
          span.textContent = stateVal || '\u00A0';
        }

        if (!stateVal) {
          span.classList.add('empty-field');
        } else {
          span.classList.remove('empty-field');
        }
      }
    });
  }, [fieldValues]);

  // ── Sync: Từ DOM -> fieldValues (Khi user gõ trực tiếp vào A4) ──
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    isEditingDomRef.current = true;

    const spans = editorRef.current.querySelectorAll('.contract-var');
    const newValues: Record<string, string> = {};
    let changed = false;

    spans.forEach((span: Element) => {
      const key = span.getAttribute('data-var');
      if (key) {
        // Loại bỏ NBSP khi đọc ra
        const rawVal = span.textContent || '';
        const val = rawVal.replace(/\u00A0/g, '').trim();
        newValues[key] = val;

        const oldStateVal = (fieldValues[key] || '').trim();
        if (oldStateVal !== val) {
          changed = true;
        }

        if (!val) {
          if (!span.classList.contains('empty-field')) span.classList.add('empty-field');
        } else {
          if (span.classList.contains('empty-field')) span.classList.remove('empty-field');
        }
      }
    });

    if (changed) {
      setFieldValues(prev => ({ ...prev, ...newValues }));
    }

    // Đặt delay lâu hơn một chút để đảm bảo React render xong mới gỡ cờ
    setTimeout(() => {
      isEditingDomRef.current = false;
    }, 50);
  }, [fieldValues]);

  // ── Lưu hợp đồng ──
  const handleSaveContract = async () => {
    if (!selectedEmployeeId) {
      notification.warning({ message: 'Vui lòng chọn nhân viên' });
      return;
    }
    const emp = employees.find(e => (e._id || e.id) === selectedEmployeeId);

    setSaving(true);
    try {
      const url = contractId
        ? `/api/v1/employee-contracts/${contractId}`
        : '/api/v1/employee-contracts';
      const method = contractId ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        filledData: fieldValues,
        startDate: contractStartDate?.toISOString() || null,
        endDate: contractEndDate?.toISOString() || null,
        employeeSignature,
        managerSignature,
      };


      if (!contractId) {
        payload.employeeId = selectedEmployeeId;
        payload.templateId = templateId;
        payload.contractTypeId = emp?.employeeType;
        if (isSupplementary) {
          payload.supplementary = true;
        }
      } else {
        // Nếu đủ 2 chữ ký thì cập nhật status = ACTIVE
        if (employeeSignature && managerSignature) {
          payload.status = 'ACTIVE';
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        notification.success({ message: 'Lưu hợp đồng thành công!' });
        router.push('/members');
      } else {
        notification.error({ message: data.message || 'Lỗi lưu hợp đồng' });
      }
    } catch (error) {
      notification.error({ message: 'Lỗi khi lưu hợp đồng' });
    } finally {
      setSaving(false);
    }
  };

  // ── Chọn nhanh ngày kết thúc ──
  const handleQuickEnd = (value: number, unit: 'month' | 'year') => {
    if (!fieldValues.start_day || !fieldValues.start_month || !fieldValues.start_year) {
      notification.warning({ message: 'Vui lòng chọn ngày bắt đầu trước khi tính nhanh', placement: 'topRight' });
      return;
    }
    const start = dayjs(`${fieldValues.start_year}-${fieldValues.start_month}-${fieldValues.start_day}`);
    // Hợp đồng thường kết thúc trước 1 ngày của kỳ tiếp theo (VD: 01/01/2024 -> 31/12/2024)
    const end = start.add(value, unit).subtract(1, 'day');
    setFieldValues(prev => ({
      ...prev,
      end_day: end.format('DD'),
      end_month: end.format('MM'),
      end_year: end.format('YYYY'),
    }));
  };

  // ── In hợp đồng ──
  function handlePrint() {
    const el = document.getElementById('contract-print-area');
    if (!el) return;

    // Clone DOM to sanitize page breaks inside tables
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = el.innerHTML;

    // Remove any page-break divs that are descendants of a table element
    const invalidPageBreaks = tempDiv.querySelectorAll('table .page-break');
    invalidPageBreaks.forEach((item) => {
      item.remove();
    });

    const printContent = tempDiv.innerHTML;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${template?.templateName || 'Hợp đồng'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000; background: white; }
    
    @page { size: A4 portrait; margin: 2cm 2.5cm; }
    
    .ck-content { width: 100%; }
    h1 { font-size: 16pt; text-align: center; font-weight: bold; text-transform: uppercase; margin: 12pt 0; }
    h2 { font-size: 14pt; font-weight: bold; text-align: center; margin: 10pt 0; }
    h3 { font-size: 13pt; font-weight: bold; margin: 8pt 0; }
    h4 { font-size: 13pt; font-weight: bold; font-style: italic; margin: 6pt 0; }
    p { margin: 4pt 0; text-align: justify; }
    
    table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 13pt; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    td, th { border: 1px solid #000; padding: 4pt 8pt; vertical-align: top; }
    th { background: #f5f5f5; font-weight: bold; text-align: center; }
    
    .no-print { display: none !important; }
    
    .contract-blank { border-bottom: 1px dotted transparent; }
    .contract-blank.empty-field { display: inline-block; min-width: 80px; min-height: 1.2em; vertical-align: bottom; border-bottom: 1px dotted #000; }
    
    .contract-signatures { margin-top: 24pt; page-break-inside: avoid; }
    .contract-signatures table td { border: none !important; padding: 0; text-align: center; vertical-align: top; }
    .contract-signatures img { height: 80px; object-fit: contain; }
    
    .page-break { page-break-after: always; }
    ul, ol { padding-left: 20pt; margin: 4pt 0; }
    li { margin: 2pt 0; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    .text-center, [style*="text-align: center"] { text-align: center; }
    .text-right, [style*="text-align: right"] { text-align: right; }
  </style>
</head>
<body>
  <div class="ck-content">
    ${printContent}
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }

  // ── Xử lý nút quay lại ──
  const handleBack = () => {
    // Nếu mở ở tab mới (history chỉ có 1 hoặc 2 trang và document.referrer có thể rỗng)
    if (window.history.length <= 2) {
      window.close();
      // Đề phòng window.close() bị block bởi trình duyệt
      setTimeout(() => router.push('/contracts/templates'), 300);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spin size="large" description="Đang tải mẫu hợp đồng..." />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-600">Không tìm thấy mẫu hợp đồng</h2>
          <Button className="mt-4" onClick={() => window.close()}>Đóng trang</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Topbar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-3">
          <Button size="small" icon={<ArrowLeft size={14} />} onClick={handleBack}>
            Quay lại
          </Button>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Tạo hợp đồng nhanh
              {status === 'DRAFT' && <Tag color="orange" className="ml-2">Bản nháp</Tag>}
              {status === 'ACTIVE' && <Tag color="green" className="ml-2">Đang hiệu lực</Tag>}
              {status === 'SUPPLEMENTARY' && <Tag color="purple" className="ml-2">Hợp đồng bổ sung</Tag>}
              {status === 'EXPIRED' && <Tag color="default" className="ml-2">Hết hạn</Tag>}
              {status === 'CANCELLED' && <Tag color="red" className="ml-2">Đã hủy</Tag>}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              {template.templateName}
              {isSupplementary && (
                <Tag color="purple" className="m-0 text-[10px]">Phụ lục / Bổ sung</Tag>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isViewMode && (
            <>
              <Button icon={<PenTool size={14} />} onClick={() => setSignModalOpen('EMPLOYEE')} className={employeeSignature ? 'text-blue-600 border-blue-600' : ''}>
                {employeeSignature ? 'Nhân viên đã ký' : 'Nhân viên ký'}
              </Button>
              <Button icon={<PenTool size={14} />} onClick={() => setSignModalOpen('MANAGER')} className={managerSignature ? 'text-blue-600 border-blue-600' : ''}>
                {managerSignature ? 'Công ty đã ký' : 'Công ty ký'}
              </Button>
              <div className="w-px h-6 bg-slate-200 mx-2" />
            </>
          )}
          <Button icon={<RefreshCw size={14} />} onClick={fetchData} size="small">Làm mới</Button>
          <Button
            type="primary"
            icon={<Printer size={16} />}
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold"
          >
            In hợp đồng
          </Button>
          {isViewMode ? (
            <Button
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={handleBack}
            >
              Trở về
            </Button>
          ) : (
            <Button
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-700 border-0 shadow-md shadow-emerald-500/20"
              icon={<Check className="w-4 h-4" />}
              loading={saving}
              onClick={handleSaveContract}
            >
              Lưu Hợp đồng
            </Button>
          )}
        </div>
      </div>

      {/* ── Content: 2 cột ── */}
      <div className="flex gap-0 h-[calc(100vh-65px)]">

        {/* ── Cột trái: Form điền dữ liệu ── */}
        <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto no-print shrink-0">
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <User size={14} /> Thông tin hợp đồng
            </h3>

            {/* Chọn nhân viên */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Chọn nhân viên (auto-fill)</label>
              <Select
                showSearch
                placeholder="Tìm kiếm nhân viên..."
                className="w-full"
                value={selectedEmployeeId || undefined}
                onChange={(val) => setSelectedEmployeeId(val)}
                disabled={isViewMode}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={employees.map(emp => ({
                  value: emp._id || emp.id,
                  label: `${emp.fullName} (${emp.employeeCode})`,
                }))}
                allowClear
                onClear={() => setSelectedEmployeeId('')}
              />
              {selectedEmployeeId && (
                <div className="mt-1 text-xs text-emerald-600 font-medium">
                  ✓ Đã auto-fill dữ liệu từ hồ sơ nhân viên
                </div>
              )}
            </div>

            {/* Quản lý thời hạn (Nằm ngoài fieldValues) */}
            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="text-xs font-semibold text-slate-700 mb-2 block">Quản lý Thời hạn Hợp đồng</label>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Ngày bắt đầu hiệu lực</label>
                  <DatePicker
                    className="w-full" size="small" format="DD/MM/YYYY"
                    value={contractStartDate}
                    onChange={setContractStartDate}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-500">Ngày kết thúc (Để trống nếu vô thời hạn)</label>
                  </div>
                  {!isViewMode && (
                    <div className="flex gap-1 mb-1.5 flex-wrap">
                      {[
                        { label: '+3 tháng', value: 3, unit: 'month' as const },
                        { label: '+6 tháng', value: 6, unit: 'month' as const },
                        { label: '+1 năm', value: 1, unit: 'year' as const },
                      ].map(({ label, value, unit }) => (
                        <button
                          key={label}
                          type="button"
                          disabled={!contractStartDate}
                          onClick={() => {
                            if (!contractStartDate) return;
                            setContractEndDate(contractStartDate.add(value, unit).subtract(1, 'day'));
                          }}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors
                            ${contractStartDate
                              ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-400 cursor-pointer'
                              : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                      {contractEndDate && (
                        <button
                          type="button"
                          onClick={() => setContractEndDate(null)}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 cursor-pointer transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  )}
                  <DatePicker
                    className="w-full" size="small" format="DD/MM/YYYY"
                    value={contractEndDate}
                    onChange={setContractEndDate}
                    disabled={isViewMode}
                    placeholder="Để trống = vô thời hạn"
                  />
                </div>
              </div>
            </div>

            <Divider className="my-3" />

            {/* Form điền từng biến */}
            <div className="space-y-3">
              {variables.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">
                  Mẫu này không có biến cần điền
                </div>
              )}

              {/* Grouped Date Pickers */}
              {hasContractDate && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Ngày lập hợp đồng</label>
                  <DatePicker
                    className="w-full"
                    size="small"
                    format="DD/MM/YYYY"
                    value={fieldValues.day && fieldValues.month && fieldValues.year ? dayjs(`${fieldValues.year}-${fieldValues.month}-${fieldValues.day}`) : null}
                    onChange={(date) => {
                      setFieldValues(prev => ({
                        ...prev,
                        day: date ? date.format('DD') : '',
                        month: date ? date.format('MM') : '',
                        year: date ? date.format('YYYY') : '',
                      }));
                    }}
                    disabled={isViewMode}
                    placeholder="Chọn ngày lập..."
                  />
                </div>
              )}

              {hasStartDate && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Ngày bắt đầu</label>
                  <DatePicker
                    className="w-full"
                    size="small"
                    format="DD/MM/YYYY"
                    value={fieldValues.start_day && fieldValues.start_month && fieldValues.start_year ? dayjs(`${fieldValues.start_year}-${fieldValues.start_month}-${fieldValues.start_day}`) : null}
                    onChange={(date) => {
                      setFieldValues(prev => ({
                        ...prev,
                        start_day: date ? date.format('DD') : '',
                        start_month: date ? date.format('MM') : '',
                        start_year: date ? date.format('YYYY') : '',
                      }));
                    }}
                    disabled={isViewMode}
                    placeholder="Chọn ngày bắt đầu..."
                  />
                </div>
              )}

              {hasEndDate && (
                <div className="mb-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Ngày kết thúc</label>
                    {!isViewMode && (
                      <div className="flex gap-1 flex-wrap">
                        <Button size="small" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-0 shadow-sm" onClick={() => handleQuickEnd(6, 'month')}>+6 tháng</Button>
                        <Button size="small" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-0 shadow-sm" onClick={() => handleQuickEnd(1, 'year')}>+1 năm</Button>
                        <Button size="small" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-0 shadow-sm" onClick={() => handleQuickEnd(2, 'year')}>+2 năm</Button>
                        <Button size="small" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-0 shadow-sm" onClick={() => handleQuickEnd(3, 'year')}>+3 năm</Button>
                      </div>
                    )}
                  </div>
                  <DatePicker
                    className="w-full"
                    size="small"
                    format="DD/MM/YYYY"
                    value={fieldValues.end_day && fieldValues.end_month && fieldValues.end_year ? dayjs(`${fieldValues.end_year}-${fieldValues.end_month}-${fieldValues.end_day}`) : null}
                    onChange={(date) => {
                      setFieldValues(prev => ({
                        ...prev,
                        end_day: date ? date.format('DD') : '',
                        end_month: date ? date.format('MM') : '',
                        end_year: date ? date.format('YYYY') : '',
                      }));
                    }}
                    disabled={isViewMode}
                    placeholder="Chọn ngày kết thúc..."
                  />
                </div>
              )}

              {/* Standard Inputs */}
              {standardVars.map(varKey => {
                const label = VARIABLE_LABELS[varKey] || varKey;
                const isDate = ['dob', 'id_issue_date', 'start_date', 'end_date'].includes(varKey);

                return (
                  <div key={varKey}>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                      {label}
                      <span className="ml-1 text-slate-300 font-mono font-normal text-[10px]">{`{{${varKey}}}`}</span>
                    </label>

                    {isDate ? (
                      <DatePicker
                        className="w-full"
                        size="small"
                        format="DD/MM/YYYY"
                        value={fieldValues[varKey] ? dayjs(fieldValues[varKey], 'DD/MM/YYYY') : null}
                        onChange={(date) => {
                          setFieldValues(prev => ({
                            ...prev,
                            [varKey]: date ? date.format('DD/MM/YYYY') : '',
                          }));
                        }}
                        disabled={isViewMode}
                        placeholder={`Chọn ${label.toLowerCase()}...`}
                      />
                    ) : varKey === 'gender' ? (
                      <Select
                        className="w-full"
                        size="small"
                        value={fieldValues[varKey] || undefined}
                        onChange={(val) => setFieldValues(prev => ({ ...prev, [varKey]: val }))}
                        options={[
                          { label: 'Nam', value: 'Nam' },
                          { label: 'Nữ', value: 'Nữ' },
                          { label: 'Khác', value: 'Khác' },
                        ]}
                        placeholder="Chọn giới tính"
                        disabled={isViewMode}
                        allowClear
                      />
                    ) : (
                      <Input
                        size="small"
                        value={fieldValues[varKey] || ''}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [varKey]: e.target.value }))}
                        disabled={isViewMode}
                        placeholder={`Nhập ${label.toLowerCase()}...`}
                        className={fieldValues[varKey] ? 'border-emerald-300' : ''}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <Divider className="my-3" />
            <div className="text-xs text-slate-400 space-y-1">
              <div>Tổng biến: <strong>{variables.length}</strong></div>
              <div>Đã điền: <strong className="text-emerald-600">
                {variables.filter(v => fieldValues[v]?.trim()).length}
              </strong></div>
              <div>Còn trống: <strong className="text-amber-500">
                {variables.filter(v => !fieldValues[v]?.trim()).length}
              </strong></div>
            </div>
          </div>
        </div>

        {/* ── Cột phải: Preview A4 Live ── */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6">
          <div className="mb-2 flex items-center justify-end gap-2">
            <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded border border-amber-200 shadow-sm flex items-center gap-1">
              <AlertCircle size={14} />
              💡 Bạn có thể click trực tiếp vào văn bản hoặc các đường chấm để gõ tự do (dữ liệu sẽ đồng bộ hai chiều).
            </span>
          </div>
          <div id="contract-print-area" className={`contract-a4-preview transition-all rounded ${isViewMode ? 'view-mode' : ''}`}>
            <div
              ref={editorRef}
              className="ck-content focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              contentEditable={!isViewMode}
              suppressContentEditableWarning={true}
              dangerouslySetInnerHTML={{ __html: initialCompiledHtml }}
              onInput={handleEditorInput}
            />
            {/* Chữ ký chuẩn tách biệt */}
            <div className="contract-signatures mt-4 print-signatures break-inside-avoid" contentEditable={false}>
              <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13pt', fontWeight: 'bold', textAlign: 'center' }}>NGƯỜI LAO ĐỘNG</p>
                      <p style={{ margin: '0 0 16px 0', fontSize: '11pt', fontStyle: 'italic', textAlign: 'center' }}>(Ký, ghi họ tên)</p>
                      <div style={{ textAlign: 'center' }}>
                        {employeeSignature && <img src={employeeSignature} alt="Employee Signature" style={{ height: '96px', objectFit: 'contain', margin: '0 auto', display: 'inline-block' }} />}
                      </div>
                      {fieldValues['full_name'] && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '13pt', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
                          {fieldValues['full_name']}
                        </p>
                      )}
                    </td>
                    <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13pt', fontWeight: 'bold', textAlign: 'center' }}>ĐẠI DIỆN CỦA CÔNG TY</p>
                      <p style={{ margin: '0 0 16px 0', fontSize: '11pt', fontStyle: 'italic', textAlign: 'center' }}>(Ký, ghi họ tên và đóng dấu)</p>
                      <div style={{ textAlign: 'center' }}>
                        {managerSignature && <img src={managerSignature} alt="Manager Signature" style={{ height: '96px', objectFit: 'contain', margin: '0 auto', display: 'inline-block' }} />}
                      </div>
                      {fieldValues['company_representative'] && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '13pt', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
                          {fieldValues['company_representative']}
                        </p>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={signModalOpen === 'EMPLOYEE' ? 'Chữ ký của Nhân viên' : 'Chữ ký của Đại diện công ty'}
        open={!!signModalOpen}
        onCancel={() => { setSignModalOpen(null); clearCanvas(); }}
        onOk={() => {
          if (isEmpty()) {
            notification.warning({ message: 'Vui lòng vẽ chữ ký' });
            return;
          }
          if (signModalOpen === 'EMPLOYEE') setEmployeeSignature(getDataUrl());
          else setManagerSignature(getDataUrl());
          setSignModalOpen(null);
          clearCanvas();
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnHidden
      >
        <p className="text-sm text-gray-600 mb-2 font-medium">Vẽ chữ ký tay vào ô bên dưới:</p>
        <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="bg-white border shadow-sm touch-none cursor-crosshair rounded"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <div className="mt-2 text-right">
          <Button size="small" onClick={clearCanvas}>Xóa vẽ lại</Button>
        </div>
      </Modal>
    </div>
  );
}
