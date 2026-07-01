export type Attachment = {
    type: "image" | "file";
    url: string;
    fileName: string;
    size: number;
};

export type CommentDoc = {
    _id?: string;
    module: string;
    moduleId: string;

    userId: string;
    userName?: string;
    userAvatar?: string; // không bắt buộc, fallback = chữ cái đầu

    content?: string | null;
    attachments?: Attachment[] | null;
    parentId?: string | null;

    likes?: string[]; 
    createdAt?: Date;
    updatedAt?: Date;
};
