import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { addRow, deleteByField, getAllRows, getRowByIdOrCode, updateByField, updateMany } from "@/app/lib/monggodb/mongoDBCRUD";
import { FileRecord } from "@/app/data/interface/file";

export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

  const {
    action,
    collectionName = "FileManage",
    data,
    filters,
    field,
    value,
    search,
    skip,
    limit,
    id,
    code,
    sort,
  } = await req.json();

  try {
    switch (action) {
      case "create": {
        // 1. Tự sinh id dạng "FILEyymmddHHMMSS"
        const now = new Date();
        const uniqueSuffix = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}${now
            .getHours()
            .toString()
            .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
              .getSeconds()
              .toString()
              .padStart(2, "0")}`;
        const finalId = `${id || "FILE"}${uniqueSuffix}`;
        const newData = { ...data, id: finalId };

        // 2. Thêm document vào MongoDB
        await addRow<FileRecord>(collectionName, newData);

        // 3. [FIX 1] Phải trả về 'finalId' (ví dụ: "FILE...") mà bạn đã tạo
        return NextResponse.json({ success: true, id: finalId });
      }

      case "read":
        return NextResponse.json(
          await getAllRows<FileRecord>(collectionName, {
            search,
            skip,
            limit,
            field,
            value,
            filters,
            sort,
          })
        );

      case "getById":
        return NextResponse.json(
          await getRowByIdOrCode<FileRecord>(collectionName, { id, code })
        );

      case "update":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for update" },
            { status: 400 }
          );
        }
        await updateByField<FileRecord>(collectionName, field, value, data);

        return NextResponse.json({ success: true });

      case "updateMany": {
        if (!filters || !data) {
          return NextResponse.json(
            { error: "Missing filters or data for updateMany" },
            { status: 400 }
          );
        }

        const result = await updateMany<FileRecord>(collectionName, filters, { $set: data });
        return NextResponse.json({
          success: true,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }

      case "delete":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for delete" },
            { status: 400 }
          );
        }
        await deleteByField<FileRecord>(collectionName, field, value);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
