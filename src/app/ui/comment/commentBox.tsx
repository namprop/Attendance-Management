
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Attachment, CommentDoc } from "@/app/ui/comment/types";
import Image from "next/image";
import { InputAreaBase } from "../base/textarea";
import { PopconfirmBase } from "../base/popconfirm";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import EmojiPicker from "../base/emoji-picker";
import ZoomImageViewer from "../base/zoom-img";
import { ButtonBase } from "../base/button";
import LoadingProgress from "../base/loading-progress";

export default function CommentModule({
    module,
    moduleId,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    sort = "asc",
}: {
    module: string;
    moduleId: string;
    currentUserId: string;
    currentUserName?: string;
    currentUserAvatar?: string;
    sort?: "asc" | "desc";
}) {
    const [comments, setComments] = useState<CommentDoc[]>([]);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [text, setText] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploadingMain, setUploadingMain] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(() => {
        // Chỉ cuộn nếu có comments
        if (comments.length > 0) {
            scrollToBottom();
        }
    }, [comments]);

    useEffect(() => {
        loadComments();
    }, [module, moduleId, sort]);

    async function loadComments() {
        const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "read",
                collectionName: "Comments",
                filters: { module, moduleId },
                sort: [{ field: "createdAt", order: sort }],
            }),
        });
        const json = await res.json();
        setComments(json?.data ?? []);
    }

    async function uploadMega(file: File) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folderPath", `comments/${module}/${moduleId}`);
        try {
            const res = await fetch("/api/pocket", {
                method: "POST",
                body: fd
            });
            const json = await res.json();
            // setUploading(false);
            if (json.success) {
                const att: Attachment = {
                    type: file.type.startsWith("image") ? "image" : "file",
                    url: json.data.url,
                    fileName: json.name || file.name,
                    size: json.size || file.size,
                };
                return att;
            } else {
                console.error("Tải ảnh lỗi!", json);
                return null;
            }
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async function handleSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploadingMain(true);
        const att = await uploadMega(f);
        setUploadingMain(false);
        if (att) setAttachments((p) => [...p, att]);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function submitComment(text: string, attachments: Attachment[], parentId: string | null = null) {
        if (!text.trim() && attachments.length === 0) return;
        const payload = {
            action: "create",
            data: {
                module,
                moduleId,
                userId: currentUserId,
                userName: currentUserName,
                userAvatar: currentUserAvatar,
                content: text || null,
                attachments,
                parentId: parentId ?? null, // Đã nhận parentId
            },
        };

        await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        // Reset state chỉ khi submit comment chính (comment gốc)
        if (!parentId) {
            setText("");
            setAttachments([]);
        }

        await loadComments();
    }

    async function toggleLike(commentId: string) {
        const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update",
                field: "_id",
                value: commentId,
                data: { toggleLike: currentUserId },
            }),
        });

        const json = await res.json();

        // Nếu API trả về likes mới → update ngay trong state
        if (json.success && json.likes) {
            setComments(prev =>
                prev.map(c =>
                    c._id === commentId
                        ? { ...c, likes: json.likes }
                        : c
                )
            );
        }
    }


    async function deleteComment(commentId: string) {
        // trong api đã check xóa comment child của nó nếu nó có comment con
        await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "delete",
                collectionName: "Comments",
                field: "_id",
                value: commentId,
            }),
        });

        await loadComments();
    }

    // HÀM XÓA ATTACHMENT TRẢ LỜI
    function removeAttachment(indexToRemove: number) {
        setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
    }


    // HÀM CHÈN EMOJI
    const handleSelectEmoji = (emoji: string) => {
        // Chèn emoji vào vị trí con trỏ hiện tại (đơn giản nhất là chèn vào cuối)
        setText((prev) => prev + emoji);
        // Sau khi chọn, bạn có thể chọn ẩn picker hoặc giữ lại tùy ý
        // setShowEmojiPicker(false); 
    };

    // HÀM XỬ LÝ PASTE ẢNH/FILE TỪ CLIPBOARD
    async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
        // Ngăn chặn hành vi paste mặc định của trình duyệt
        e.preventDefault();

        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Chỉ xử lý các item có kiểu image/
            if (item.type.indexOf("image") === 0) {
                const file = item.getAsFile();

                if (file) {
                    // Tương tự như handleSelectFile, gọi hàm uploadMega
                    setUploadingMain(true);
                    try {
                        const att = await uploadMega(file);

                        if (att) {
                            setAttachments(p => [...p, att]);
                            // Nếu paste ảnh, thường ta không muốn chèn thêm văn bản vào input
                            // (Bạn có thể bỏ qua setText nếu không muốn ảnh tự chèn tên file)
                        } else {
                            console.error("Upload failed after paste.");
                        }
                    } catch (error) {
                        console.error("Paste upload error:", error);
                    } finally {
                        setUploadingMain(false);
                    }

                    // Quan trọng: Sau khi xử lý ảnh, bạn có thể dừng lại
                    return;
                }
            }
        }

        // Nếu không phải ảnh, xử lý paste văn bản thông thường
        const pastedText = e.clipboardData.getData('text/plain');
        if (pastedText) {
            // Chèn văn bản vào vị trí hiện tại của con trỏ (phức tạp)
            // Dưới đây là cách đơn giản: Chèn vào vị trí cuối
            setText(prev => prev + pastedText);
        }
    }


    const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitComment(text, attachments)
        }
    };

    return (
        <div className="w-full">
            {/* List - Danh sách comment =====================================================*/}
            <div className="mt-4 space-y-4 px-3">
                {comments.length === 0 && <div className="text-gray-500">Chưa có bình luận</div>}

                {comments
                    .filter((c) => !c.parentId)
                    .map((c) => (
                        <CommentItem
                            key={String(c._id)}
                            data={c}
                            allComments={comments} // TRUYỀN TOÀN BỘ COMMENTS
                            currentUserId={currentUserId}
                            onReply={async (replyText, attachmentsReply, parentId) => {
                                await submitComment(replyText, attachmentsReply, String(parentId));
                            }}
                            onLike={(_id: string) => toggleLike(String(_id))}
                            deleteComment={(_id: string) => deleteComment(String(_id))}
                            uploadMega={uploadMega}
                            depth={0} 
                        />
                    ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-3 p-3 bg-white">
                <Avatar name={currentUserName} avatar={currentUserAvatar} />
                <div className="w-full bg-gray-100 rounded-xl p-2">
                    <InputAreaBase
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        placeholder={`Bình luận với tên ${currentUserName}...`}
                        className="w-full resize-none! p-2! rounded-md! min-h-6! max-h-7!"
                        onPaste={handlePaste}
                        onKeyDown={handleEnter}
                    />

                    <div className="">
                        <div className="flex items-center justify-between gap-2">
                            <div className="relative flex items-center gap-1">
                                {/* 1. Icon Biểu cảm (Emotion/Emoji) */}
                                <ButtonBase
                                    className="text-xl! p-1! rounded-full! hover:bg-gray-100!"
                                    title="Biểu cảm"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} // Toggle
                                >
                                    <Image src="/icons/smile.svg" alt="x" width={15} height={15} />
                                </ButtonBase>
                                {/* RENDER EMOJI PICKER */}
                                {showEmojiPicker && <EmojiPicker onSelectEmoji={handleSelectEmoji} onClose={() => setShowEmojiPicker(false)} />}

                                {/* 2. Icon Ảnh/Camera (Tái sử dụng logic upload file) */}
                                <label className="cursor-pointer">
                                    <input ref={fileRef} type="file" className="hidden" onChange={handleSelectFile} />
                                    <span className="rounded-full" title="Tải ảnh">
                                        <Image src="/icons/camera.svg" alt="Tải ảnh" width={15} height={15} />
                                    </span>
                                </label>
                            </div>
                            <div>
                                <ButtonBase
                                    className="p-2! rounded-full! hover:bg-gray-200"
                                    onClick={() => submitComment(text, attachments)}
                                >
                                    {(!text.trim() && attachments.length === 0) ? (
                                        <Image src="/icons/send-black.svg" alt="Tải ảnh" width={15} height={15} />
                                    ) : (
                                        <Image src="/icons/send-active.svg" alt="Tải ảnh" width={15} height={15} />
                                    )}
                                </ButtonBase>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {attachments.map((a, i) => (
                                <div key={i} className="relative text-xs border border-gray-200 p-1 rounded-md">
                                    {/* NÚT XÓA */}
                                    <ButtonBase
                                        className="absolute -top-2 -right-2 bg-gray-200 text-gray-600 rounded-full! p-1! hover:bg-gray-300"
                                        onClick={() => removeAttachment(i)}
                                    >
                                        <Image src="/icons/close-black.svg" alt="x" width={15} height={15} />
                                    </ButtonBase>
                                    {a.type === "image" ? (
                                        <ZoomImageViewer src={`${a.url}`} className="object-cover rounded w-20" alt="attachment" />
                                    ) : (
                                        <div className="flex items-center gap-2">📄 {a.fileName}</div>
                                    )}
                                </div>
                            ))}
                            {uploadingMain && <LoadingProgress />}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function CommentItem({
    data,
    // replies,
    allComments,
    currentUserId,
    onReply,
    onLike,
    deleteComment,
    uploadMega,
    depth,
}: {
    data: CommentDoc;
    // replies: CommentDoc[];
    allComments: CommentDoc[];
    currentUserId: string;
    onReply: (replyText: string, attachmentsReply: Attachment[], parentId: string) => void;
    onLike: (_id: string) => void;
    deleteComment: (_id: string) => void;
    uploadMega: (file: File) => Promise<Attachment | null>;
    depth: number;
}) {
    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [attachmentsReply, setAttachmentsReply] = useState<Attachment[]>([]);
    const fileRefChild = useRef<HTMLInputElement>(null);
    const [uploadingReply, setUploadingReply] = useState(false);
    const [showEmojiPickerReply, setShowEmojiPickerReply] = useState(false);
    const user_info = cookieBase.get<User>("info_user");
    const replyInputRef = useRef<HTMLTextAreaElement>(null);

    const liked = Array.isArray(data.likes) && data.likes.includes(currentUserId);
    // TÌM CÁC REPLIES TRỰC TIẾP CỦA COMMENT HIỆN TẠI
    const replies = allComments.filter((r) => r.parentId === data._id);

    async function handleSelectFileReply(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploadingReply(true);
        const att = await uploadMega(f);
        setUploadingReply(false);
        if (att) setAttachmentsReply((p) => [...p, att]);
        if (fileRefChild.current) fileRefChild.current.value = "";
    }

    // HÀM XÓA ATTACHMENT TRẢ LỜI
    function removeAttachmentReply(indexToRemove: number) {
        setAttachmentsReply((prev) => prev.filter((_, index) => index !== indexToRemove));
    }
    //  HÀM CHÈN EMOJI CHO PHẢN HỒI
    const handleSelectEmojiReply = (emoji: string) => {
        setReplyText((prev) => prev + emoji);
    };

    //  HÀM XỬ LÝ PASTE CHO INPUT TRẢ LỜI
    async function handleReplyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
        e.preventDefault();

        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.type.indexOf("image") === 0) {
                const file = item.getAsFile();

                if (file) {
                    // Tương tự như trên, gọi uploadMega
                    setUploadingReply(true);
                    try {
                        const att = await uploadMega(file);

                        if (att) {
                            setAttachmentsReply(p => [...p, att]);
                        }
                    } catch (error) {
                        console.error("Paste upload error:", error);
                    } finally {
                        setUploadingReply(false);
                    }
                    return;
                }
            }
        }

        // Xử lý paste văn bản
        const pastedText = e.clipboardData.getData('text/plain');
        if (pastedText) {
            setReplyText(prev => prev + pastedText);
        }
    }


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onReply(replyText, attachmentsReply, String(data._id));
            setReplyText("");
            setAttachmentsReply([]);
            setShowReply(false);
        }
    };

    // Nếu depth > 0, ta đang render comment con, cần áp dụng margin-left.
    const fixedIndent = '10px'; // 2.5rem ~ ml-10
    const wrapperStyle = depth > 0 ? { marginLeft: fixedIndent } : {};
    return (
        <div style={wrapperStyle} className="space-y-3">
            <div className="flex gap-3">
                <Avatar name={data.userName} avatar={data.userAvatar} />
                <div className="flex-1">
                    {/* HIỂN THỊ NỘI DUNG COMMENT GỐC */}
                    <div className="bg-gray-100 p-2 rounded-xl w-fit max-w-full">
                        <div className="font-semibold text-sm">{data.userName ?? `User ${data.userId}`}</div>
                        <div className="text-sm whitespace-pre-wrap">{data.content}</div>
                    </div>
                    <div className="mt-2 space-y-2 flex flex-wrap gap-2">
                        {(data.attachments || []).map((a, i) => (
                            <div key={i}>
                                {a.type === "image" ? (
                                    <ZoomImageViewer src={`${a.url}`} className="object-cover rounded w-20" alt="attachment" />
                                ) : (
                                    <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                        📄 {a.fileName}
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* CÁC NÚT THAO TÁC (Thích, Trả lời, Xóa) */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="text-xs text-gray-400">{timeAgo(data.createdAt)}</div>
                        <ButtonBase onClick={() => onLike(String(data._id))}
                            className={liked ? "text-blue-600! font-semibold! text-xs! p-0! hover:underline!" : "text-gray-500! text-xs! p-0! hover:underline!"}>
                            {liked ? "Bỏ thích" : "Thích"} {data.likes?.length ? `(${data.likes.length})` : ""}
                        </ButtonBase>
                        <ButtonBase
                            className="text-gray-500! text-xs! p-0! hover:underline!"
                            onClick={() => setShowReply((s) => !s)}>Trả lời</ButtonBase>
                        {Number(data.userId) === Number(user_info?.id) && (
                            <PopconfirmBase
                                cancelText="Hủy"
                                okText="Xóa"
                                description="Bạn muốn xóa bình luận này ?"
                                onConfirm={() => deleteComment(String(data._id))}
                            >
                                <span className="cursor-pointer text-red-600">Xóa</span>
                            </PopconfirmBase>
                        )}

                    </div>

                    {/* KHU VỰC INPUT TRẢ LỜI */}
                    {showReply && (
                        <div className="mt-2 flex gap-2 items-start">
                            <Avatar name={data.userName} avatar={data.userAvatar} />
                            <div className="flex-1 bg-gray-100 rounded-xl p-2">
                                <InputAreaBase
                                    ref={replyInputRef}
                                    value={replyText}
                                    rows={2}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full resize-none! p-2! rounded-md! min-h-6! max-h-7!"
                                    placeholder={`Trả lời...`}
                                    onPaste={handleReplyPaste}
                                    onKeyDown={handleKeyDown}
                                />
                                <div className="flex items-center justify-between mt-1">
                                    <div className="relative flex items-center gap-1">
                                        {/* NÚT MỞ EMOJI PICKER */}
                                        <ButtonBase
                                            className="text-xl! p-1! rounded-full! hover:bg-gray-100!"
                                            title="Biểu cảm"
                                            onClick={() => setShowEmojiPickerReply(!showEmojiPickerReply)} // Toggle
                                        >
                                            <Image src="/icons/smile.svg" alt="x" width={15} height={15} />
                                        </ButtonBase>

                                        {/* RENDER EMOJI PICKER */}
                                        {showEmojiPickerReply && <EmojiPicker onSelectEmoji={handleSelectEmojiReply} onClose={() => setShowEmojiPickerReply(false)} />}

                                        {/* Nút Tải ảnh/file */}
                                        <label className="cursor-pointer">
                                            <input ref={fileRefChild} type="file" className="hidden" onChange={handleSelectFileReply} />
                                            <span className="rounded-full" title="Tải ảnh">
                                                <Image src="/icons/camera.svg" alt="Tải ảnh" width={15} height={15} />
                                            </span>
                                        </label>
                                    </div>

                                    <div className="text-right">
                                        <ButtonBase
                                            className="p-2! rounded-full! hover:bg-gray-200"
                                            onClick={() => {
                                                onReply(replyText, attachmentsReply, String(data._id));
                                                setReplyText("");
                                                setAttachmentsReply([]);
                                                setShowReply(false);
                                            }}>
                                            {(!replyText.trim() && attachmentsReply.length === 0) ? (
                                                <Image src="/icons/send-black.svg" alt="Tải ảnh" width={15} height={15} />
                                            ) : (
                                                <Image src="/icons/send-active.svg" alt="Tải ảnh" width={15} height={15} />
                                            )}
                                        </ButtonBase>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {attachmentsReply.map((a, i) => (
                                        <div key={i} className="relative text-xs border border-gray-200 p-1 rounded-md">
                                            {/* NÚT XÓA */}
                                            <button
                                                type="button"
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs p-0 leading-none"
                                                onClick={() => removeAttachmentReply(i)}
                                            >
                                                x
                                            </button>

                                            {a.type === "image" ? (
                                                <ZoomImageViewer src={`${a.url}`} className="object-cover rounded w-20" alt="attachmentReply" />
                                            ) : (
                                                <div className="flex items-center gap-2">📄 {a.fileName}</div>
                                            )}
                                        </div>
                                    ))}
                                    {uploadingReply && <LoadingProgress />}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sub replies - HIỂN THỊ ĐỆ QUY CÁC COMMENT CON ======================================= */}
                    {replies.length > 0 && (
                        <div className={`mt-3 space-y-3`} >
                            {replies.map((r) => (
                                <CommentItem
                                    key={String(r._id)}
                                    data={r}
                                    allComments={allComments} // TRUYỀN LẠI TOÀN BỘ COMMENTS
                                    currentUserId={currentUserId}
                                    onReply={onReply}
                                    onLike={onLike}
                                    deleteComment={deleteComment}
                                    uploadMega={uploadMega}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* timeAgo helper */
function timeAgo(d?: string | Date | null) {
    if (!d) return "";
    const t = new Date(d);
    const diff = Math.floor((Date.now() - t.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return t.toLocaleDateString();
}

function Avatar({ name, avatar }: { name?: string; avatar?: string }) {
    if (avatar) {
        return <Image src={avatar} width={32} height={32} className="rounded-full object-cover" alt="Avarta" />;
    }
    const char = name ? name.charAt(0).toUpperCase() : "?";
    return (
        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
            {char}
        </div>
    );
}
