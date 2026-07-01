export interface BranchArea {
    [key: string]: unknown;
    code: string;
    name: string;
}

export interface Branch {
    _id: string;
    name: string;
    address: string;
    products?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    businessRegion: string;
}
