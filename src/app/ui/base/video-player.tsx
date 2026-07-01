"use client";
import React, { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  /** URL video (mp4, mov, webm…) */
  src: string;
  /** Nội dung kích hoạt (thumbnail, nút...). Nếu bỏ trống sẽ render nút Play mặc định */
  trigger?: React.ReactNode;
  className?: string;
}

/**
 * VideoPlayer
 * - Click trigger → mở overlay fullscreen
 * - Controls HTML5 chuẩn (play/pause, seek, volume, fullscreen)
 * - Hỗ trợ Esc để đóng
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, trigger, className }) => {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lock scroll khi mở
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Autoplay khi mở, pause + reset khi đóng
  useEffect(() => {
    if (open) {
      setTimeout(() => videoRef.current?.play(), 80);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [open]);

  // Phím Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => { e.stopPropagation(); setOpen(true); };
  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Trigger */}
      <span onClick={handleOpen} className={className} style={{ cursor: "pointer", display: "inline-block" }}>
        {trigger ?? (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition backdrop-blur-sm"
          >
            {/* Play icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Xem video
          </button>
        )}
      </span>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          {/* Video */}
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "82vh",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
              background: "#000",
              outline: "none",
            }}
          />

          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition backdrop-blur-sm"
            title="Đóng (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Bottom hint */}
          <p className="absolute bottom-5 text-white/30 text-xs select-none">Nhấn Esc hoặc click ngoài để đóng</p>
        </div>
      )}
    </>
  );
};

export default VideoPlayer;
