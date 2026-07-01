import React from "react";
import { Form, AutoComplete } from "antd";
import type { FormInstance } from "antd";
import { InputBase } from "@/app/ui/base/input";
import { SelectMultipleBase } from "@/app/ui/base/select-multiple";
import { AsyncEmployeeSelect } from "@/app/(timekeeping)/shifts/components/AsyncEmployeeSelect";
import TabBase from "@/app/ui/base/tab";

export interface ShiftConfigFormValues {
  code: string;
  name: string;
  branchIds: string[];
  locationIds: string[];
  departmentGroupIds: string[];
  departmentIds: string[];
  assignedEmployeeCodes: string[];
  startTime: string;
  endTime: string;
  crossDayCount: string;
  breakStartTime: string;
  breakEndTime: string;
  totalMinutes: string;
  workUnit: string;
  validCheckInStart: string;
  validCheckInEnd: string;
  validCheckOutStart: string;
  validCheckOutEnd: string;
  noCheckOutMinutes: string;
  noCheckInMinutes: string;
  displayOrder: string;
  isActive: boolean;
}

interface ShiftConfigFormProps {
  form: FormInstance;
  onFinish: (values: ShiftConfigFormValues) => void;
  initialValues?: ShiftConfigFormValues;
  branchOptions?: { label: string; value: string }[];
  locationOptions?: { label: string; value: string }[];
  departmentGroupOptions?: { label: string; value: string }[];
  departmentOptions?: { label: string; value: string }[];
  selectedBranchIds?: string[];
  selectedLocationIds?: string[];
  selectedDepartmentGroupIds?: string[];
  selectedDepartmentIds?: string[];
  disabled?: boolean;
}

const tabItems = [
  { key: "1", label: "Khai báo chung" },
  // { key: "2", label: "Đi trễ, về sớm" },
  // { key: "3", label: "Thông số tăng ca" },
  // { key: "4", label: "Thông số khác" },
];

interface UnitInputProps {
  unit: string;
  children: React.ReactElement<StringInputProps>;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

function UnitInput({
  unit,
  children,
  value,
  onChange,
  onBlur,
  onFocus,
}: UnitInputProps) {
  return (
    <div className="flex items-center gap-2">
      {React.cloneElement(children, { value, onChange, onBlur, onFocus })}
      <span className="rounded-r-md bg-slate-100 px-3 py-[7px] text-xs font-semibold text-slate-500">
        {unit}
      </span>
    </div>
  );
}

interface StringInputProps {
  placeholder?: string;
  className?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  id?: string;
  name?: string;
  disabled?: boolean;
}
function StringInput({
  placeholder,
  className = "",
  ...props
}: StringInputProps) {
  return (
    <InputBase
      type="text"
      placeholder={placeholder}
      className={`h-8 max-w-[160px] text-center ${className}`}
      {...props}
    />
  );
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return { value: `${h}:${m}` };
});

function TimeInput({
  className = "",
  value,
  onChange,
  ...props
}: any) {
  const handleChange = (val: string) => {
    if (!val) {
      if (onChange) onChange(val);
      return;
    }

    let raw = val.replace(/[^\d]/g, "");
    if (raw.length > 4) raw = raw.slice(0, 4);

    let formatted = raw;
    if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}:${raw.slice(2)}`;
    }

    if (onChange) {
      onChange(formatted);
    }
  };

  return (
    <AutoComplete
      options={TIME_OPTIONS}
      value={value}
      onChange={handleChange}
      filterOption={(inputValue, option) =>
        option!.value.indexOf(inputValue) !== -1
      }
      style={{ width: 160 }}
    >
      <InputBase
        type="text"
        className={`h-8 w-full max-w-[160px] text-center ${className}`}
        maxLength={5}
        {...props}
      />
    </AutoComplete>
  );
}

export default function ShiftConfigForm({
  form,
  onFinish,
  initialValues,
  branchOptions = [],
  locationOptions = [],
  departmentGroupOptions = [],
  departmentOptions = [],
  selectedBranchIds = [],
  selectedLocationIds = [],
  selectedDepartmentGroupIds = [],
  selectedDepartmentIds = [],
  disabled = false,
}: ShiftConfigFormProps) {
  const [activeScopeTab, setActiveScopeTab] = React.useState<string>("branch");

  const formContent = (
    <div className="max-h-[590px] overflow-y-auto px-4 sm:px-7 py-4 sm:py-5 sm:pr-10">
      <div className="w-full max-w-[520px]">
        <Form.Item
          label="Mã ca làm việc"
          name="code"
          className="mb-3 sm:flex-nowrap"
          rules={[{ required: true, message: "Nhập mã ca" }]}
        >
          <StringInput placeholder="HC" className="w-full sm:max-w-[260px] max-w-full text-left" />
        </Form.Item>

        <Form.Item
          label="Tên ca làm việc"
          name="name"
          className="mb-3 sm:flex-nowrap"
          rules={[{ required: true, message: "Nhập tên ca" }]}
        >
          <StringInput
            placeholder="Ca hành chính"
            className="w-full sm:max-w-[260px] max-w-full text-left"
          />
        </Form.Item>

        <Form.Item
          label="Chi nhánh áp dụng"
          name="branchIds"
          className="mb-3 sm:flex-nowrap"
        >
          <SelectMultipleBase
            options={branchOptions}
            placeholder="Chọn chi nhánh"
            className="w-full sm:max-w-[360px]"
            optionFilterProp="label"
            showSearch
            onSelect={() => (document.activeElement as HTMLElement)?.blur()}
          />
        </Form.Item>

        <Form.Item
          label="Điểm chấm công áp dụng"
          name="locationIds"
          className="mb-3 sm:flex-nowrap"
        >
          <SelectMultipleBase
            options={locationOptions}
            placeholder="Chọn điểm chấm công"
            className="w-full sm:max-w-[360px]"
            optionFilterProp="label"
            showSearch
            onSelect={() => (document.activeElement as HTMLElement)?.blur()}
          />
        </Form.Item>

        <Form.Item
          label="Khối / Cụm áp dụng"
          name="departmentGroupIds"
          className="mb-3 sm:flex-nowrap"
        >
          <SelectMultipleBase
            options={departmentGroupOptions}
            placeholder="Chọn khối / cụm"
            className="w-full sm:max-w-[360px]"
            optionFilterProp="label"
            showSearch
            onSelect={() => (document.activeElement as HTMLElement)?.blur()}
          />
        </Form.Item>

        <Form.Item
          label="Phòng ban áp dụng"
          name="departmentIds"
          className="mb-3 sm:flex-nowrap"
        >
          <SelectMultipleBase
            options={departmentOptions}
            placeholder="Chọn phòng ban"
            className="w-full sm:max-w-[360px]"
            optionFilterProp="label"
            showSearch
            onSelect={() => (document.activeElement as HTMLElement)?.blur()}
          />
        </Form.Item>

        <Form.Item
          label="Nhân viên áp dụng"
          name="assignedEmployeeCodes"
          className="mb-3 sm:flex-nowrap"
        >
          <AsyncEmployeeSelect
            placeholder="Để trống nếu áp dụng tất cả"
            className="w-full sm:max-w-[360px]"
            selectedBranchIds={selectedBranchIds}
            selectedLocationIds={selectedLocationIds}
            selectedDepartmentGroupIds={selectedDepartmentGroupIds}
            selectedDepartmentIds={selectedDepartmentIds}
          />
        </Form.Item>

        <Form.Item label="Giờ vào làm việc" name="startTime" className="mb-3">
          <TimeInput placeholder="" />
        </Form.Item>

        <Form.Item
          label="Giờ kết thúc làm việc"
          name="endTime"
          className="mb-3 sm:flex-nowrap"
        >
          <TimeInput placeholder="" />
        </Form.Item>

        <Form.Item
          label="Giờ bắt đầu ăn trưa"
          name="breakStartTime"
          className="mb-3 sm:flex-nowrap"
        >
          <TimeInput placeholder="" />
        </Form.Item>

        <Form.Item
          label="Giờ kết thúc ăn trưa"
          name="breakEndTime"
          className="mb-3 sm:flex-nowrap"
        >
          <TimeInput placeholder="" />
        </Form.Item>

        <Form.Item label="Tổng giờ" name="totalMinutes" className="mb-3">
          <UnitInput unit="phút">
            <StringInput placeholder="" />
          </UnitInput>
        </Form.Item>

        <Form.Item label="Đếm công" name="workUnit" className="mb-3">
          <UnitInput unit="công">
            <StringInput placeholder="" />
          </UnitInput>
        </Form.Item>

        <Form.Item
          label="Giờ kết thúc ngày"
          name="validCheckOutEnd"
          className="mb-3 sm:flex-nowrap"
        >
          <UnitInput unit="giờ">
            <TimeInput placeholder="" />
          </UnitInput>
        </Form.Item>

        {/* <Form.Item label="Bắt đầu giờ vào để hiệu ca" name="validCheckInStart" className="mb-3">
          <TimeInput placeholder="" />
        </Form.Item>

        <Form.Item label="Kết thúc giờ vào để hiệu ca" name="validCheckInEnd" className="mb-3">
          <TimeInput placeholder="" />
        </Form.Item>

        
        <Form.Item
          label="Số lần chuyển ngày tự nhiên"
          name="crossDayCount"
          className="mb-3"
        >
          <StringInput placeholder="" />
        </Form.Item>

        
             <Form.Item
          label="Không có giờ ra thì tính tổng"
          name="noCheckOutMinutes"
          className="mb-3"
        >
          <UnitInput unit="phút">
            <StringInput placeholder="0" />
          </UnitInput>
        </Form.Item>

        <Form.Item
          label="Không có giờ vào thì tính tổng"
          name="noCheckInMinutes"
          className="mb-3"
        >
          <UnitInput unit="phút">
            <StringInput placeholder="0" />
          </UnitInput>
        </Form.Item>


        <Form.Item label="Bắt đầu giờ ra để hiệu ca" name="validCheckOutStart" className="mb-3">
          <TimeInput placeholder="" />
        </Form.Item>



        <Form.Item label="Vị trí trên báo biểu" name="displayOrder" className="mb-3">
          <StringInput placeholder="1" />
        </Form.Item> */}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <Form
        form={form}
        layout="horizontal"
        colon={false}
        labelCol={{
          sm: { flex: "235px" },
          xs: { span: 24 },
          className: "text-left font-medium text-slate-700 pb-1 sm:pb-0",
        }}
        wrapperCol={{ sm: { flex: "1" }, xs: { span: 24 } }}
        labelAlign="left"
        onFinish={onFinish}
        initialValues={initialValues}
        className="w-full flex-1"
        requiredMark={false}
        disabled={disabled}
      >
        <TabBase
          tabs={tabItems.map((tab) => ({
            keyTab: tab.key,
            label: tab.label,
            component:
              tab.key === "1" ? (
                formContent
              ) : (
                <div className="px-7 py-8 text-sm font-medium text-slate-400">
                  Chưa có nội dung cho phần {tab.label}
                </div>
              ),
          }))}
          activeTabKey="1"
          className="shift-config-tabs"
        />
      </Form>
    </div>
  );
}
