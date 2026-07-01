import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { User } from "@/app/data/dataUser";
import { addRow, deleteByField, getAllRows, getRowByIdOrCode, updateByField } from "@/app/lib/monggodb/mongoDBCRUD";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

  const {
    action,
    sheetTitle = "Departments",
    data,
    field,
    value,
    filters,
    search,
    skip,
    limit,
    id,
    code,
    sort,
  } = await req.json();

  try {
    switch (action) {
      case "create":
        const newData = { ...data, id: data.id, _id: data.id };
        const newId = await addRow<User>(sheetTitle, newData);
        return NextResponse.json({ success: true, id: newId, _id: newId });

      case "read":
        return NextResponse.json(
          await getAllRows<User>(sheetTitle, {
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
          await getRowByIdOrCode<User>(sheetTitle, { id, code })
        );

      case "update":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for update" },
            { status: 400 }
          );
        }
        // Nếu cập nhật theo _id thì convert sang ObjectId
        const fixedValue =
          field === "_id" ? new ObjectId(value) : value;
        await updateByField<User>(sheetTitle, field, fixedValue, data);
        return NextResponse.json({ success: true });

      case "delete":
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: "Missing field or value for delete" },
            { status: 400 }
          );
        }
        await deleteByField<User>(sheetTitle, field, value);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
