export type Option = {
  [key: string]: unknown;
  label?: string;
  value?: string | number;
};

export type OptionProvinces = {
  [key: string]: unknown;
  name?: string;
  code?: number;
  division_type?: string;
  codename?: string;
  phone_code?: number;
  wards?: OptionWards[];
  area?: string;
};

export type OptionWards = {
  [key: string]: unknown;
  name?: string;
  code?: number;
  division_type?: string;
  codename?: string;
  province_code?: number;
};

export type OptionZalo = {
  [key: string]: unknown;
  name?: string;
  phone?: string;
  network?: string;
};

export type CocKhuon = {
  id: number;
  price: number;
};

export interface KhoBeOption {
  id: number | string;
  name: string;
  note: string;
  size: string;
  price: number;
  mayBeId: number | string;
  min: number;
  long?: number;
  width?: number;
}

export interface BoChapOption {
  value: string;
  label: string;
  min: number;
}

export interface OptionFlexo {
  id: string;
  name: string;
  price: number;
}

export interface OptionPrintMultipliers {
  from: number;
  to: number;
  multiplier: number;
}
