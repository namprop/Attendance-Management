// Central TypeScript Interfaces for KiotViet Hub Data and UI Modules

/**
 * Properties for the Unified Kiot Order Table Component
 */
export interface OrderTableKiotProps {
    externalKiotDeliveryStatus?: number | number[];
    externalStatusInvoice?: string;
    externalChannel?: string;
    externalSearch?: string;
    externalTimeRange?: string;
    shopeeChannels?: Array<{ label: string; value: string; id?: string }>;
    activeTab?: string;
}

/**
 * Interface representing an Individual Navigation Tab
 */
export interface KiotTabItem {
    id: string;
    label: string;
    statusVal: string;
    kiotStatusVal?: number | number[];
    count: number;
    isError?: boolean;
}

/**
 * System Notification Options Interface
 */
export interface ToastOptions {
    type: "success" | "error" | "info" | "warning";
    message: string;
}

/**
 * Functional Type Definition for Toast Popup Callers
 */
export type ShowToastFn = (options: ToastOptions) => void;

/**
 * Master Shopee & Sales Channel Model
 */
export interface SalesChannelItem {
    id: string | number;
    name?: string;
    isActive: boolean;
    img: string;
}

/**
 * Raw KiotViet Invoice Structural Interface from MongoDB
 */
export interface KiotInvoiceRaw {
    totalDue?: number;
    codAmount?: number;
    saleschanel?: string;
    orderDateTime?: string;
    dateInvoice?: string;
    kiotData?: {
        InvoiceDelivery?: {
            Status?: number;
        }
    };
}

/**
 * Aggregation Model for Delivery Status Ratios
 */
export interface StatusMetric {
    name: string;
    value: number;
    color: string;
    revenue: number;
}

/**
 * Aggregation Model for Multi-channel Revenues
 */
export interface ChannelMetric {
    name: string;
    orders: number;
    revenue: number;
}

/**
 * Aggregation Model for Daily Sales Velocity
 */
export interface TimeTrendMetric {
    date: string;
    orders: number;
    revenue: number;
}
