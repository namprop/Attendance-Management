"use client"
import React, { useState, useRef, useEffect } from "react";

interface ZoomImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
}

const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ffffff", "#000000"];

const ZoomImageViewer: React.FC<ZoomImageViewerProps> = ({ src, alt = "", className }) => {
  const [open, setOpen] = useState(false);

  // Transform State
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Interaction State
  const [dragging, setDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState(colors[0]);

  // Refs
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock Body Scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset on open
  const handleOpen = () => {
    setOpen(true);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDrawing(false);
    resetDrawingCanvas();
  };

  const resetDrawingCanvas = () => {
    // Clear canvas if exists - Wait for render
    setTimeout(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, 0);
  }

  // Close handler
  const handleClose = () => {
    setOpen(false);
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.min(5, Math.max(0.5, prev - e.deltaY * 0.001)));
  };

  const zoomIn = () => setScale((s) => Math.min(5, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

  // Rotate
  const rotateLeft = () => setRotation((r) => r - 90);
  const rotateRight = () => setRotation((r) => r + 90);


  // Mouse Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; // Ignore right click

    if (isDrawing) {
      e.preventDefault();
      startDrawing(e);
    } else {
      // Dragging
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDrawing) {
      draw(e);
    } else if (dragging) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    stopDrawing();
  };

  // Drawing Logic
  const getCanvasCoordinates = (e: React.MouseEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    // e.nativeEvent.offsetX/Y gives coordinates relative to the target's padding box in CSS pixels.
    // We need to handle two things:
    // 1. If target is NOT canvas (moved fast?), we need to be careful.
    // 2. We need to map CSS pixels to Internal Canvas Pixels (canvas.width / clientWidth).

    let cssX = 0;
    let cssY = 0;

    // If target is canvas, use simple offset.
    // Note: checking target validity is tricky if mouse goes slightly off. 
    // For now we rely on the fact that if we draw, we are mostly on canvas.
    if (e.target === canvas) {
      cssX = (e as MouseEvent).offsetX;
      cssY = (e as MouseEvent).offsetY;
    } else {
      // Fallback: Calculate from Client Rect
      const rect = canvas.getBoundingClientRect();
      // This rect includes Transform effects...
      // If rotated, clientX/Y mapping is hard without inverse transform.
      // But 'offsetX' on the event usually handles correct local space even if rotated?
      // Let's assume user stays on canvas for now or rely on 'canvas' capturing pointer.
      // If we really need robust off-canvas drawing, it's a lot more math. 
      // Let's stick to simple "must be on canvas" behavior or use what we have.
      return null;
    }

    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;

    return {
      x: cssX * scaleX,
      y: cssY * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoordinates(e, canvas);
    if (!coords) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    canvas.setAttribute("data-drawing", "true");
  };

  const draw = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.getAttribute("data-drawing") !== "true") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoordinates(e, canvas);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = drawColor;
    // Adjust line width based on internal resolution vs visual size?
    // If image is huge (4000px) displayed small (400px), scaleX is 10.
    // We want a visual line of ~3px. So internal line should be 3 * 10 = 30px.
    const lineWidthVisual = 3;
    const scaleRatio = canvas.width / canvas.clientWidth;
    // We divide by 'scale' (zoom level) to keep it constant visual size regardless of zoom?
    // No, usually when you zoom in, you want to see the line get bigger (detail).
    // If we want "constant visual thickness on screen", we divide by scale.
    // If we want "constant physical thickness on image", we use fixed value.
    // Usually, annotation is "on the image", so it should zoom with image.
    // So fixed internal width. 
    // But what is that fixed width? 3px * ResolutionRatio.

    ctx.lineWidth = lineWidthVisual * scaleRatio;

    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.setAttribute("data-drawing", "false");
  };


  // Sync canvas size with image
  useEffect(() => {
    if (open && imgRef.current && canvasRef.current) {
      const syncSize = () => {
        if (imgRef.current && canvasRef.current) {
          canvasRef.current.width = imgRef.current.naturalWidth || imgRef.current.width;
          canvasRef.current.height = imgRef.current.naturalHeight || imgRef.current.height;
        }
      };
      if (imgRef.current.complete) syncSize();
      else imgRef.current.onload = syncSize;
    }
  }, [open, src]);


  // Global Event Listeners
  useEffect(() => {
    if (open) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, open, isDrawing, drawColor, scale, rotation]);


  if (!open) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className ?? "cursor-pointer"}
        onClick={handleOpen}
        style={{ cursor: "zoom-in" }}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "none"
      }}
      onWheel={handleWheel}
      onClick={(e) => {
        // Close if clicked on background
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Main Content Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "relative",
          cursor: isDrawing ?
            `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${encodeURIComponent(drawColor === "#ffffff" ? "#000000" : drawColor)}" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>') 12 12, crosshair`
            : dragging ? "grabbing" : "grab",
          transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
          transition: dragging || isDrawing ? "none" : "transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transformOrigin: "center center"
        }}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            userSelect: "none",
            // ENABLE POINTER EVENTS so user can right click
            pointerEvents: "auto",
            display: "block",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)"
          }}
        />

        {/* Drawing Canvas Overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            // Only capture events if drawing, otherwise let them fall through to Image (for context menu) or Container (for drag)
            pointerEvents: isDrawing ? "auto" : "none",
          }}
        />
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-50 backdrop-blur-sm"
        title="Đóng (Esc)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      {/* Bottom Toolbar */}
      <div
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 z-50 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom */}
        <div className="flex items-center gap-1 border-r border-white/20 pr-2">
          <button onClick={zoomOut} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Thu nhỏ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <span className="text-xs text-white/70 w-8 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
        </div>

        {/* Rotate */}
        <div className="flex items-center gap-1 border-r border-white/20 pr-2 pl-2">
          <button onClick={rotateLeft} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Xoay trái">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
          <button onClick={rotateRight} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Xoay phải">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
          </button>
        </div>

        {/* Draw & Reset */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`p-2 rounded-full transition-colors ${isDrawing ? 'bg-blue-600 text-white' : 'hover:bg-white/20 text-white'}`}
            title="Vẽ (Ghi chú)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l5.5 5.5L2 2z"></path></svg>
          </button>

          {isDrawing && (
            <div className="flex gap-2 animate-in slide-in-from-left duration-200">
              {/* Color Picker */}
              <div className="flex gap-1">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setDrawColor(color)}
                    className={`w-5 h-5 rounded-full border-2 ${drawColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110 transition-transform'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Reset Button (Replaces Eraser) */}
              <button
                onClick={resetDrawingCanvas}
                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors border border-white/20 ml-1"
                title="Xóa tất cả hình vẽ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoomImageViewer;
