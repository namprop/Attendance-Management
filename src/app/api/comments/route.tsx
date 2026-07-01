// app/api/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import {
    addRow,
    deleteByField,
    deleteManyRows,
    getAllRows,
    getRowByIdOrCode,
    updateByField,
} from "@/app/lib/monggodb/mongoDBCRUD";
import { CommentDoc } from "@/app/ui/comment/types";
import { ObjectId } from "mongodb";

const COLLECTION = "Comments";

export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

    const {
        action,
        collectionName = COLLECTION,
        data,
        field,
        value,
        id,
        code,
        filters,
        search,
        skip,
        limit,
        sort,
    } = await req.json().catch(() => ({}));

    try {
        switch (action) {
            case "create": {
                if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 });

                const now = new Date();
                const newComment: CommentDoc = {
                    ...data,
                    attachments: data.attachments ?? [],
                    parentId: data.parentId ?? null,
                    likes: data.likes ?? [],
                    createdAt: now,
                    updatedAt: now,
                };

                const newId = await addRow<CommentDoc>(collectionName, newComment);
                return NextResponse.json({ success: true, id: newId });
            }

            case "read": {
                const res = await getAllRows<CommentDoc>(collectionName, {
                    search,
                    skip,
                    limit,
                    filters,
                    sort,
                });
                // return { total, data }
                return NextResponse.json(res);
            }

            case "getById": {
                const row = await getRowByIdOrCode<CommentDoc>(collectionName, { id, code });
                return NextResponse.json(row);
            }

            case "update": {
                if (!field || value === undefined || data === undefined) {
                    return NextResponse.json({ error: "Missing field/value/data" }, { status: 400 });
                }

                // =============================
                // 1) Toggle Like
                // =============================
                if (data.toggleLike && field === "_id") {
                    // Nếu field = "_id" thì convert value sang ObjectId
                    const fixedValue =
                        field === "_id" ? new ObjectId(value) : value;
                    const comment = await getRowByIdOrCode<CommentDoc>(collectionName, { _id: fixedValue });
                    if (!comment || !comment.row) {
                        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
                    }

                    const currentLikes: string[] = Array.isArray(comment.row.likes) ? comment.row.likes : [];
                    const userIdToToggle = data.toggleLike as string;

                    const alreadyLiked = currentLikes.includes(userIdToToggle);
                    const newLikes = alreadyLiked
                        ? currentLikes.filter((u) => u !== userIdToToggle)
                        : [...currentLikes, userIdToToggle];

                    await updateByField<CommentDoc>(collectionName, field, fixedValue, {
                        likes: newLikes,
                        updatedAt: new Date(),
                    });

                    return NextResponse.json({ success: true, likes: newLikes });
                }

                // =============================
                // 2) Edit bình luận
                // =============================
                if (data.editContent && field === "_id") {
                    await updateByField<CommentDoc>(collectionName, field, value, {
                        content: data.editContent,
                        updatedAt: new Date(),
                    });

                    return NextResponse.json({ success: true });
                }

                // =============================
                // 3) Update các field khác
                // =============================
                await updateByField<CommentDoc>(collectionName, field, value, {
                    ...data,
                    updatedAt: new Date(),
                });

                return NextResponse.json({ success: true });
            }

            case "delete": {
                if (!field || value === undefined) {
                    return NextResponse.json({ error: "Missing field/value" }, { status: 400 });
                }

                const fixedValue =
                    field === "_id" ? new ObjectId(value) : value;

                // Xóa comment cha + toàn bộ replies
                const doc = await getRowByIdOrCode<CommentDoc>(collectionName, { _id: fixedValue });

                if (!doc || !doc.row) {
                    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
                }

                // Xóa chính nó
                await deleteByField(collectionName, field, fixedValue);

                // Xóa replies
                await deleteManyRows<CommentDoc>(collectionName, { parentId: value });

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (err) {
        console.error("comments route error:", err);
        return NextResponse.json({ error: (err as Error)?.message || String(err) }, { status: 500 });
    }
}
