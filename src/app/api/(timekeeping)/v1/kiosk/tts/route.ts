import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    if (!text) {
      return new Response("Missing text parameter", { status: 400 });
    }

    const encodedText = encodeURIComponent(text);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodedText}`;

    // Thực hiện cuộc gọi phía máy chủ (Server-side) giúp loại bỏ hoàn toàn các rào cản CORS 
    // và đảm bảo Google không chặn lượt truy cập giống như từ trình duyệt client.
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!response.ok) {
      console.error("Google TTS error status:", response.status);
      return new Response("Failed to fetch audio from Google TTS", { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable" // Cache âm thanh 7 ngày để tối ưu hiệu suất
      }
    });
  } catch (error) {
    console.error("Lỗi TTS Proxy API:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
