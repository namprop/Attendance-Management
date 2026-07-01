import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { addRow, deleteByField, deleteById, findByField, getAllRows, getRowByIdOrCode, updateByField } from "@/app/lib/monggodb/mongoDBCRUD";
import { ObjectId } from "mongodb";
import { Tags } from "@/app/data/interface/customer";


export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

  const {
    action,
    collectionName = "Tags",
    data,
    filters = {},
    field,
    value,
    search,
    skip,
    limit,
    id,
    _id,
    code,
    sort,
  } = await req.json();

  try {
    switch (action) {
      case "create": {
        if (Array.isArray(data)) {
          const ids: string[] = [];
          for (const item of data) {
            const idnew = await addRow<Tags>(collectionName, item);
            ids.push(String(idnew));
          }
          return NextResponse.json({ success: true, ids });
        } else {
          const now = Date.now();
          const uniqueSuffix = now.toString(36).slice(-6).toUpperCase();
          const finalId = `${(id || "TG")}${uniqueSuffix}`;
          const newData = { ...data, id: finalId, };

          const newId = await addRow<Tags>(collectionName, newData);
          return NextResponse.json({ success: true, id: newId });
        }
      }

      case "read":
        // Xử lý _id nếu client có gửi lên
        if (filters && filters._id && typeof filters._id === "object" && "$in" in filters._id) {
          const arr = (filters._id.$in as string[]).map(
            (id) => new ObjectId(id)
          );
          filters._id.$in = arr;
        }

        // Lấy toàn bộ dữ liệu (Full Data)
        const result = await getAllRows<Tags>(collectionName, {
          search,
          skip,
          limit,
          field,
          value,
          filters,
          sort,
        });

        // Trả về object có key 'data' để Client (result.data) đọc được
        return NextResponse.json({ data: result });

      case "getById":
        return NextResponse.json(
          await getRowByIdOrCode<Tags>(collectionName, { id, code, _id })
        );

      case "findByField":
        return NextResponse.json(
          await findByField<Tags>(collectionName, field, value)
        );

      case "update":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for update" },
            { status: 400 }
          );
        }
        const fixedValue =
          field === "_id" ? new ObjectId(value) : value;
        await updateByField<Tags>(collectionName, field, fixedValue, data);
        return NextResponse.json({ success: true });

      case "delete":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for delete" },
            { status: 400 }
          );
        }
        await deleteByField<Tags>(collectionName, field, value);
        return NextResponse.json({ success: true });

      case "deleteById":
        if (id === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for delete" },
            { status: 400 }
          );
        }
        await deleteById(collectionName, id);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("MongoDB API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}