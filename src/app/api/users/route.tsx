import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { User } from "@/app/data/dataUser";
import { addRow, deleteByField, getAllRows, getRowByIdOrCode, updateByField, getCollection } from "@/app/lib/monggodb/mongoDBCRUD";
import { ObjectId, Filter } from "mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

  const {
    action,
    sheetTitle = "Users",
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
        // Hash password if present
        if (data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        }
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

        // Hash password if updating password
        if (data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        }

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

      // Login
      case "login": {
        const { username, password } = data as {
          username?: string;
          password?: string;
        };

        if (!username || !password) {
          return NextResponse.json(
            { success: false, message: "Thiếu tên người dùng hoặc mật khẩu!" },
            { status: 400 }
          );
        }
        const queryResult = await getAllRows<User>(sheetTitle, {
          filters: { username },
          limit: 1
        });
        const found = queryResult.data?.[0];

        if (!found) {
          return NextResponse.json(
            { success: false, message: "Tài khoản hoặc mật khẩu không đúng!" },
            { status: 401 }
          );
        }

        // Check active status
        if (Number(found.status) === 2) {
          return NextResponse.json(
            { success: false, message: "Tài khoản đã ngừng hoạt động!" },
            { status: 403 }
          );
        }

        // Verify password
        let ok = false;
        if (found.password && found.password.startsWith("$2")) {
          ok = await bcrypt.compare(password, found.password);
        } else if (found.password === password) {
          ok = true;
        }

        // Robust Migration Logic
        if (ok && found.password === password && !found.password.startsWith("$2")) {
          try {
            const userCollection = await getCollection<User>(sheetTitle);
            const idStr = String(found._id);
            const orFilters: Array<Record<string, unknown>> = [{ _id: idStr }];

            if (!isNaN(Number(idStr))) {
              orFilters.push({ _id: Number(idStr) });
            }
            if (ObjectId.isValid(idStr) && idStr.length === 24) {
              orFilters.push({ _id: new ObjectId(idStr) });
            }

            const hashed = await bcrypt.hash(password, 10);
            await userCollection.updateOne(
              { $or: orFilters } as Filter<User>,
              { $set: { password: hashed } }
            );
          } catch (e) {
            console.error("Migration failed", e);
          }
        }

        if (ok) {
          // không trả password
          const { password: _, ...safeUser } = found;
          return NextResponse.json({ success: true, user: safeUser });
        }

        return NextResponse.json(
          { success: false, message: "Tài khoản hoặc mật khẩu không đúng!" },
          { status: 401 }
        );
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
