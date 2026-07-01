import React, { useMemo } from "react";
import type { DefaultOptionType } from "antd/es/select";

// --- Base Components ---
import { InputBase } from "@/app/ui/base/input";
import { ModalBase } from "@/app/ui/base/modal";
import { SelectBase } from "@/app/ui/base/select";

// --- Components ---
// import EditCustomerForm from "@/app/customer/create/createEditCustomer";
import { WithPermission } from "@/app/service/permissions/permission-gate";

// --- Types ---
import { FileRecord } from "@/app/data/interface/file";
import { User } from "@/app/data/dataUser";
import { Customer } from "@/app/data/interface/customer";
import {
  areaOptions,
  fakeTypeProductsFile,
  optionTypeBox,
  typeOptions,
} from "@/app/data/dataTypeProducfile";

const Label = ({ text, required = false }: { text: string; required?: boolean }) => (
  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
    {text}
    {required && <span className="text-red-500">*</span>}
  </label>
);
// ------------------- Constants -------------------
// FIX: Đổi value thành String để khớp với logic xử lý
const PRODUCTION_OPTIONS: DefaultOptionType[] = [
  { value: "1", label: "Sản xuất theo yêu cầu" },
  { value: "2", label: "Hàng có sẵn" },
];

// ------------------- Interfaces -------------------
interface GroupedSelectOption {
  label: React.ReactNode;
  options: DefaultOptionType[];
}

interface FileTopSectionProps {
  formData: FileRecord;
  setFormData: React.Dispatch<React.SetStateAction<FileRecord>>;
  isViewOnly?: boolean;
  user_info?: User;
  ids?: string;
  groupCustomers: GroupedSelectOption[];
  hasSalesPermission: boolean;
  hasDesignPermission: boolean;
  handleCustomerChange: (value: string) => void;
  handleCreateCustomer: (record: Customer) => void;
  handleSelectChange: (
    value: string | number | boolean | null,
    option: DefaultOptionType | DefaultOptionType[] | undefined,
    field: keyof FileRecord
  ) => void;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement> | { text: string },
    field: keyof FileRecord
  ) => void;
}

// ------------------- Component -------------------
const FileTopSection: React.FC<FileTopSectionProps> = ({
  formData,
  isViewOnly,
  user_info,
  ids,
  groupCustomers,
  hasSalesPermission,
  hasDesignPermission,
  handleCustomerChange,
  handleCreateCustomer,
  handleSelectChange,
  handleInputChange,
}) => {

  // Memoize options sản xuất
  const filteredProductionOptions = useMemo(() => {
    // FIX: So sánh với String
    if (hasSalesPermission && !hasDesignPermission) {
      return PRODUCTION_OPTIONS.filter((opt) => opt.value === "1");
    }
    if (hasDesignPermission && !hasSalesPermission) {
      return PRODUCTION_OPTIONS.filter((opt) => opt.value === "2");
    }
    return PRODUCTION_OPTIONS;
  }, [hasSalesPermission, hasDesignPermission]);



  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* --- Cột 1: Thông tin Khách hàng --- */}
        <WithPermission roleId={Number(user_info?.role)} permission="Sales">
          <div className="flex flex-col">
            <Label text="Khách hàng:" />
            <div className="flex items-center gap-2">
              <SelectBase
                showSearch
                placeholder="Chọn khách hàng"
                value={formData.idcustomer || undefined}
                options={groupCustomers}
                onChange={handleCustomerChange}
                disabled={isViewOnly}
                className="h-9! flex-1"
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
              {!ids && (
                <ModalBase
                  title="Thêm khách hàng mới"
                  contentBtn="+"
                  btnClassName="!p-1 h-9! w-9 border border-green-200 rounded-md text-green-600 hover:bg-green-500 hover:text-white transition flex items-center justify-center"
                  footer={null}
                  className="w-[1000px]!"
                  disabled={isViewOnly}
                >
                  <div className="p-4 text-center text-gray-500">
                    Form tạo khách hàng bị vô hiệu hóa trong phiên bản này.
                  </div>
                </ModalBase>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <Label text="Khu vực:" />
            <SelectBase
              showSearch
              placeholder="Chọn khu vực"
              value={formData.area || undefined}
              options={areaOptions}
              onChange={(v, o) => handleSelectChange(v, o, "area")}
              className="h-9!"
              disabled={isViewOnly}
            />
          </div>

          <div className="flex flex-col">
            <Label text="Phân loại KH:" />
            <SelectBase
              showSearch
              placeholder="Chọn phân loại KH"
              value={formData.typecustomer || undefined}
              options={typeOptions}
              onChange={(v, o) => handleSelectChange(v, o, "typecustomer")}
              disabled={isViewOnly}
              className="h-9!"
            />
          </div>
        </WithPermission>

        {/* --- Cột 2 & 3: Thông tin sản phẩm --- */}
        <div className="flex flex-col">
          <Label text="Phân loại sản xuất:" />
          <WithPermission
            roleId={Number(user_info?.role)}
            permission={hasSalesPermission ? "Sales" : hasDesignPermission ? "Design" : ""}
          >
            <SelectBase
              placeholder="Phân loại sản xuất"
              value={formData.productiontype || undefined}
              options={filteredProductionOptions}
              onChange={(v, o) => handleSelectChange(v, o, "productiontype")}
              disabled={isViewOnly}
              className="h-9!"
            />
          </WithPermission>
        </div>

        <div className="flex flex-col">
          <Label text="Loại sản phẩm:" />
          <SelectBase
            showSearch
            placeholder="Chọn loại sản phẩm"
            value={formData.ProType || undefined}
            options={fakeTypeProductsFile}
            onChange={(v, o) => handleSelectChange(v, o, "ProType")}
            className="h-9!"
            disabled={isViewOnly}
          />
        </div>

        <div className="flex flex-col">
          <Label text="Link đơn hàng:" />
          <InputBase
            placeholder="Nhập link đơn hàng..."
            value={formData.orderLink || ""}
            onChange={(e) => handleInputChange(e, "orderLink")}
            className="h-9!"
            disabled={isViewOnly}
          />
        </div>

        {(formData.ProType === "HỘP SÓNG THƯỜNG" || formData.ProType === "HỘP OFFSET") && (
          <div className="flex flex-col">
            <Label text="Loại hộp:" />
            <SelectBase
              showSearch
              placeholder="Chọn loại hộp"
              value={formData.productId || undefined}
              options={optionTypeBox}
              onChange={(v, o) => handleSelectChange(v, o, "productId")}
              className="h-9!"
              disabled={isViewOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTopSection;
