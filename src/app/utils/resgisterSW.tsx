import { User } from "../data/dataUser";
import { cookieBase } from "./cookie";

export async function registerPush() {
  if (!("serviceWorker" in navigator)) return;

  try {
    // 1. Đăng ký service worker
    const registration = await navigator.serviceWorker.register("/sw.js");

    // 2. Xin quyền thông báo
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Người dùng từ chối nhận thông báo");
      return;
    }

    // 3. Đăng ký push subscription
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const user_info = cookieBase.get<User>("info_user");

    // 4. Gửi lên API lưu vào MongoDB
    await fetch("/api/push-notifications/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        role: user_info?.role || null, // <-- lưu role
      }),
    });

    console.log("Đăng ký push notification thành công");
  } catch (error) {
    console.error("⚠️ Lỗi đăng ký Push Notification ServiceWorker:", error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
