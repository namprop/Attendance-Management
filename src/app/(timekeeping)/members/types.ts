export interface Employee {
  id: string;
  _id?: string;
  fullName: string;
  employeeCode: string;
  email: string;
  phone?: string;
  role: string;
  employeeType?: 'full_time' | 'part_time' | string;
  hasContract?: boolean;
  contractTypeId?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  status?: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  branchId?: string;
  locationId?: string;
  locationName: string;
  deptGroupId?: string;
  departmentId?: string;
  faceEnrolled: boolean;
  identityCard?: string;
  issueDate?: string;
  issuePlace?: string;
  dateOfBirth?: string;
  joinDate?: string;
  bankAccount?: string;
  bankName?: string;
  taxCode?: string;
  address?: string;

  enrollNumber?: number | string;
  unaccentedName?: string;
  cardNo?: string;
  devicePassword?: string;
  devicePrivilege?: string;
  isEnabled?: boolean;
  nativePlace?: string;
  ethnicity?: string;
  nationality?: string;
  linkedDevices?: string[];
  zktecoLinkedDevices?: string[];
  zktecoSyncDetails?: Record<string, ZktecoSyncDetail>;
}

export interface ZktecoSyncDetail {
  uid?: string | number;
  syncedAt?: string | Date;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface LocationItem {
  _id: string;
  id?: string;
  locationName: string;
  branchId?: string;
  shortCode?: string;
}

export interface BranchItem {
  _id?: string;
  id?: string;
  name: string;
  shortCode?: string;
}

export interface DeptGroupItem {
  _id: string;
  id?: string;
  name: string;
  locationId?: string;
  shortCode?: string;
}

export interface DepartmentItem {
  _id: string;
  id?: string;
  name: string;
  groupId?: string;
  departmentGroupTimekeepingId?: string;
  branchId?: string;
  locationId?: string;
  shortCode?: string;
}

export interface IDuplicateDetails {
  metrics?: {
    similarity?: number;
    distance?: number;
  };
  duplicateEmployee?: {
    id?: string;
    avatar?: string;
    fullName?: string;
    employeeCode?: string;
    branchName?: string;
  };
}

export interface WebAuthnCredentialItem {
  id: string;
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string[];
  counter: number;
  createdAt?: string;
}

export interface AuthRole {
  _id?: string;
  id?: string | number;
  name: string;
}

export interface AuthUser {
  _id?: string;
  id?: string | number;
  username: string;
  name?: string;
  email?: string;
  employeeCode?: string;
  avatar?: string;
}

export interface ZktecoDevice {
  _id: string;
  id?: string;
  name?: string;
  deviceName?: string;
  ip?: string;
  ipAddress?: string;
  locationId?: string;
  branchId?: string;
  connectorId?: string;
}

export interface ZktecoConnector {
  _id: string;
  name: string;
  code?: string;
}
