import { requireAuth } from "@/lib/auth-guard";
import { NextRequest, NextResponse } from "next/server";
import PocketBase, { ClientResponseError, RecordAuthResponse, RecordModel } from "pocketbase";

const pbUrl = process.env.POCKETBASE_URL || "https://files.hunacloud.net";

// --- KHAI BÁO TYPE CHO BIẾN TOÀN CỤC ---
declare global {
  var __pb_instance: PocketBase | undefined;
  var __pb_auth_promise: Promise<RecordAuthResponse<RecordModel>> | undefined;
}

// --- SINGLETON PATTERN ---
if (!globalThis.__pb_instance) {
  globalThis.__pb_instance = new PocketBase(pbUrl);
  globalThis.__pb_instance.autoCancellation(false);
}

const pb = globalThis.__pb_instance;

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File không hợp lệ" }, { status: 400 });
    }

    const identity = process.env.POCKETBASE_USER_ID;
    const password = process.env.POCKETBASE_PASSWORD;

    if (!identity || !password) {
      return NextResponse.json({ error: "Lỗi cấu hình server" }, { status: 500 });
    }

    // --- LOGIC XÁC THỰC (LOCKING) ---
    if (!pb.authStore.isValid) {
      if (!globalThis.__pb_auth_promise) {
        console.log("🔒 [Lock] Bắt đầu đăng nhập PocketBase...");

        // Gán Promise vào biến global
        globalThis.__pb_auth_promise = pb.collection("users")
          .authWithPassword(identity, password)
          .then((authData) => {
            return authData;
          })
          .catch((err) => {
            console.error("❌ Đăng nhập thất bại:", err);
            throw err;
          })
          .finally(() => {
            globalThis.__pb_auth_promise = undefined;
          });
      } else {
      }

      // Await Promise (Type Safe)
      try {
        await globalThis.__pb_auth_promise;
      } catch (e) {
        return NextResponse.json({ error: "Lỗi xác thực hệ thống" }, { status: 401 });
      }
    }

    // --- KIỂM TRA LẠI SAU KHI AWAIT ---
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Token không hợp lệ sau khi đăng nhập" }, { status: 401 });
    }

    // --- UPLOAD FILE ---
    const pbFormData = new FormData();
    pbFormData.append("file", file);

    const title = formData.get("title")?.toString() || file.name;
    const description = formData.get("description")?.toString() || "";

    pbFormData.append("title", title);
    pbFormData.append("description", description);

    if (pb.authStore.model?.id) {
      pbFormData.append("users_id", pb.authStore.model.id);
    }

    const record = await pb.collection("files").create(pbFormData);

    const fullUrl = `${pbUrl}/api/files/${record.collectionId}/${record.id}/${record.file}`;

    return NextResponse.json({
      success: true,
      data: { id: record.id, url: fullUrl, filename: record.file }
    });

  } catch (error: unknown) {
    console.error("❌ API Upload Error:", error);
    let errorMessage = "Lỗi server nội bộ";
    let statusCode = 500;

    if (error instanceof ClientResponseError) {
      statusCode = error.status;
      errorMessage = error.message;
      if (error.response?.data) {
        console.error("Chi tiết lỗi PB:", JSON.stringify(error.response.data));
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}