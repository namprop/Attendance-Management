import webPush from 'web-push';
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

webPush.setVapidDetails(
    "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY!
);

type PushParams = {
    title: string;
    body: string;
    url: string;
    role?: number | null; // <- thêm role
};

function normalizeUrl(url: string) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
    }
    return url;
}

export async function sendPushNotification({
    title,
    body,
    url,
    role = null,
}: PushParams) {
    const { db } = await connectToDatabase();

    // Nếu truyền role → chỉ gửi cho đúng role đó
    const query = role ? { role } : {};

    const subs = await db.collection("Notifications").find(query).toArray();

    const payload = JSON.stringify({
        title,
        body,
        data: { url: normalizeUrl(url) },
    });

    for (const sub of subs) {
        const subscription = {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime || null,
            keys: {
                p256dh: sub.keys?.p256dh,
                auth: sub.keys?.auth,
            },
        };

        try {
            await webPush.sendNotification(subscription, payload);
        } catch (error: unknown) {
            console.error("Push error:", error);

            const pushError = error as { statusCode?: number };
            if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
                await db.collection("Notifications").deleteOne({ endpoint: sub.endpoint });
            }
        }
    }

    return true;
}

// cách gọi push bên api khác
// await sendPushNotification({
//   role: "designer", // <-- chỉ designer mới nhận
//   title: "Có yêu cầu thiết kế mới",
//   body: "Sale vừa gửi yêu cầu thiết kế mới.",
//   url: `https://quote.hunacloud.net/service/${id}`,
// });
// =======================
// await sendPushNotification({
//   role: { $in: ["designer", "admin"] }, // dùng mongodb query
//   title: "Thông báo",
//   body: "Có yêu cầu quan trọng.",
//   url: "https://quote.hunacloud.net",
// });