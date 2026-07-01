import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const encoder = new TextEncoder();

    // Flag để dừng mọi thao tác khi client đóng kết nối
    let isClosed = false;
    let intervalId: NodeJS.Timeout | undefined;

    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = async () => {
                // Guard: nếu stream đã đóng thì không làm gì
                if (isClosed) {
                    if (intervalId) clearInterval(intervalId);
                    return;
                }

                try {
                    const { db } = await connectToDatabase();
                    const devices = await db.collection('ZktecoDevices').find({}).toArray();

                    const activeDeviceIds = devices
                        .filter((d: Record<string, unknown>) => d.isOnline)
                        .map((d: Record<string, unknown>) => d._id?.toString() || '');

                    const deviceStatuses = devices.reduce(
                        (acc: Record<string, unknown>, d: Record<string, unknown>) => {
                            const idStr = d._id?.toString();
                            if (idStr) {
                                acc[idStr] = {
                                    isOnline: !!d.isOnline,
                                    lastErrorMessage: d.lastErrorMessage,
                                    lastErrorTime: d.lastErrorTime,
                                };
                            }
                            return acc;
                        },
                        {}
                    );

                    // Guard lần 2: kiểm tra lại sau khi await DB (có thể close trong lúc query)
                    if (isClosed) return;

                    const payload = { activeDeviceIds, deviceStatuses };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch (e) {
                    if (!isClosed) {
                        console.error('Lỗi SSE check kết nối ZKTeco:', e);
                    }
                }
            };

            // Gửi ngay lần đầu
            await sendUpdate();

            // Cập nhật realtime mỗi 3 giây
            intervalId = setInterval(sendUpdate, 3000);
        },

        cancel() {
            // Client đóng kết nối → dừng interval và đánh dấu closed
            isClosed = true;
            if (intervalId) clearInterval(intervalId);
        },
    });

    // Cleanup khi request bị abort (browser close / navigate away)
    req.signal.addEventListener('abort', () => {
        isClosed = true;
        if (intervalId) clearInterval(intervalId);
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
