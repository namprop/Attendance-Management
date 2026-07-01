import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const encoder = new TextEncoder();
    let isClosed = false;
    let pollInterval: NodeJS.Timeout | undefined;
    let keepAliveInterval: NodeJS.Timeout | undefined;

    const stream = new ReadableStream({
        async start(controller) {
            // Chỉ lắng nghe record tạo sau khi stream mở
            const startedAt = new Date();
            // Lưu timestamp của record cuối cùng đã xử lý — dùng để query incremental
            let lastCheckedAt = new Date(startedAt);

            const send = (data: unknown) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    isClosed = true;
                }
            };

            const checkNewRecords = async () => {
                if (isClosed) return;
                try {
                    const { db } = await connectToDatabase();
                    if (isClosed) return;

                    const queryFrom = new Date(lastCheckedAt);
                    lastCheckedAt = new Date(); // Cập nhật window trước khi query để không bỏ sót

                    // Tìm các record chấm công mới trong time window
                    const newRecords = await db
                        .collection('time_records-timekeeping')
                        .find({
                            $or: [
                                { createdAt: { $gte: queryFrom } },
                                { updatedAt: { $gte: queryFrom } },
                            ]
                        })
                        .sort({ createdAt: 1 })
                        .limit(10)
                        .toArray();

                    if (isClosed) return;

                    for (const record of newRecords) {
                        // Lấy tên nhân viên từ employees collection
                        const emp = await db.collection('employees-timekeeping').findOne({
                            $or: [
                                { employeeCode: record.employeeId },
                                { employeeCode: record.employeeCode },
                            ]
                        });

                        const isCheckIn = Boolean(record.clockIn && !record.clockOut);
                        send({
                            employeeName: emp
                                ? (emp.fullName || emp.employeeName || record.employeeId)
                                : (record.employeeId || record.employeeCode || 'Unknown'),
                            employeeCode: record.employeeId || record.employeeCode,
                            timeStr: record.clockIn || record.clockOut || '',
                            deviceType: record.deviceType || 'ZKTeco',
                            isCheckIn,
                        });
                    }
                } catch (err) {
                    if (!isClosed) {
                        console.error('[SSE time-records] Lỗi DB:', err instanceof Error ? err.message : String(err));
                    }
                }
            };

            // Poll DB mỗi 2 giây để phát hiện record mới
            pollInterval = setInterval(checkNewRecords, 2000);

            // Keep-alive mỗi 20 giây
            keepAliveInterval = setInterval(() => {
                if (isClosed) {
                    clearInterval(keepAliveInterval);
                    clearInterval(pollInterval);
                    return;
                }
                try {
                    controller.enqueue(encoder.encode(`: keep-alive\n\n`));
                } catch {
                    isClosed = true;
                    clearInterval(keepAliveInterval);
                    clearInterval(pollInterval);
                }
            }, 20000);

            req.signal.addEventListener('abort', () => {
                isClosed = true;
                clearInterval(pollInterval);
                clearInterval(keepAliveInterval);
            });
        },
        cancel() {
            isClosed = true;
            if (pollInterval) clearInterval(pollInterval);
            if (keepAliveInterval) clearInterval(keepAliveInterval);
        },
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
