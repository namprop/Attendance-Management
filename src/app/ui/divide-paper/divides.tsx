import React, { useMemo, useEffect, useRef } from "react";

interface Piece {
  id: string;
  width: number;
  height: number;
  quantity: number;
  color?: string;
  noRotation?: boolean;
}
interface Sheet {
  width: number;
  height: number;
}
interface CuttingVisualizerProps {
  pieces: Piece[];
  sheet: Sheet;
  isShow?: boolean;
  onCutComplete?: (totalPieces: number) => void;
  width?: number;
}
interface PlacedPiece {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotated: boolean;
  color?: string;

}
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CuttingVisualizer({
  pieces,
  sheet,
  onCutComplete,
  width,
  isShow = true,
}: CuttingVisualizerProps) {
  // --- LOGIC TÍNH TOÁN CẮT ---
  const { placedPieces, wasteAreas, invalidPieces } = useMemo(() => {
    const validPieces = pieces.filter(
      (p) =>
        (p.width <= sheet.width && p.height <= sheet.height) ||
        (!p.noRotation && p.height <= sheet.width && p.width <= sheet.height)
    );

    const invalidPieces = pieces.filter(
      (p) =>
        !(
          (p.width <= sheet.width && p.height <= sheet.height) ||
          (!p.noRotation && p.height <= sheet.width && p.width <= sheet.height)
        )
    );

    if (validPieces.length === 0) {
      return {
        placedPieces: [],
        wasteAreas: [{ x: 0, y: 0, width: sheet.width, height: sheet.height }],
        invalidPieces,
      };
    }

    const allPieces: Piece[] = [];
    validPieces.forEach((p) => {
      for (let i = 0; i < p.quantity; i++) {
        allPieces.push(p);
      }
    });

    allPieces.sort(
      (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)
    );

    const freeRects: Rect[] = [
      { x: 0, y: 0, width: sheet.width, height: sheet.height },
    ];
    const result: PlacedPiece[] = [];
    let currentIndex = 0;

    const tryPlaceInFreeRects = (
      p: Piece,
      rects: Rect[]
    ): PlacedPiece | null => {
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        const variants = [
          { w: p.width, h: p.height, rotated: false },
          ...(p.noRotation ? [] : [{ w: p.height, h: p.width, rotated: true }]),
        ];
        for (const v of variants) {
          if (v.w <= r.width && v.h <= r.height) {
            const placed: PlacedPiece = {
              id: `${p.id}-${result.length}`,
              x: r.x,
              y: r.y,
              width: v.w,
              height: v.h,
              rotated: v.rotated,
              color: p.color,
            };

            const remainingRects: Rect[] = [];
            if (r.width - v.w > 0)
              remainingRects.push({
                x: r.x + v.w,
                y: r.y,
                width: r.width - v.w,
                height: v.h,
              });
            if (r.height - v.h > 0)
              remainingRects.push({
                x: r.x,
                y: r.y + v.h,
                width: r.width,
                height: r.height - v.h,
              });

            rects.splice(i, 1);
            rects.push(...remainingRects);
            return placed;
          }
        }
      }
      return null;
    };

    const placeLoop = () => {
      let retry = true;
      while (retry && currentIndex < allPieces.length) {
        const p = allPieces[currentIndex];
        const placed = tryPlaceInFreeRects(p, freeRects);
        if (placed) {
          result.push(placed);
          currentIndex++;
        } else {
          retry = false;
        }
      }

      // Tận dụng phần dư
      const templatePiece = validPieces[0];
      const canRotate = !templatePiece.noRotation;
      const variants = [
        { w: templatePiece.width, h: templatePiece.height },
        ...(canRotate
          ? [{ w: templatePiece.height, h: templatePiece.width }]
          : []),
      ];
      const minArea = Math.min(...variants.map((v) => v.w * v.h));

      let totalFreeArea = freeRects.reduce(
        (sum, r) => sum + r.width * r.height,
        0
      );
      while (totalFreeArea >= minArea) {
        let placedInThisLoop = false;
        for (const v of variants) {
          const fakePiece: Piece = {
            ...templatePiece,
            id: templatePiece.id + "-extra",
            width: v.w,
            height: v.h,
            quantity: 1,
          };
          const placed = tryPlaceInFreeRects(fakePiece, freeRects);
          if (placed) {
            result.push(placed);
            placedInThisLoop = true;
            break;
          }
        }
        if (!placedInThisLoop) break;
        totalFreeArea = freeRects.reduce(
          (sum, r) => sum + r.width * r.height,
          0
        );
      }
    };

    placeLoop();

    return { placedPieces: result, wasteAreas: freeRects, invalidPieces };
  }, [pieces, sheet]);

  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (onCutComplete) {
      const currentTotal = placedPieces.length;

      if (prevTotalRef.current !== currentTotal) {
        prevTotalRef.current = currentTotal;
        onCutComplete(currentTotal);
      }
    }
  }, [placedPieces, onCutComplete]);
  // ---------------------

  if (invalidPieces.length > 0) {
    return (
      <div className="text-red-600 text-sm mb-2 p-2 border border-red-300 bg-red-50 rounded">
        ⚠ Kích thước phôi vượt quá kích thước khổ máy và vui lòng chọn khổ máy
        phù hợp:
        <ul className="list-disc list-inside">
          {invalidPieces.map((p) => (
            <li key={p.id}>
              <strong>Kích thước phôi</strong>: {p.width}x{p.height}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex justify-center h-full gap-2">
      {isShow && (<div className="flex flex-col gap-2">
        <div>
          Tổng số bát:{" "}
          <span className="font-bold text-red-500">
            {placedPieces.length} bát
          </span>
        </div>
        <div>
          Kích thước khổ máy: {sheet.width} x {sheet.height} mm
        </div>
        <div>
          Kích thước phôi: {placedPieces[0]?.height} x {placedPieces[0]?.width}{" "}
          mm
        </div>
      </div>)}
      {placedPieces.length > 1000 ? (
        <div className="text-red-500">
          Số lượng bát quá lớn trên 1000, mời nhập lại kích thước phôi/kích
          thước hộp để hiển thị chính xác.
        </div>
      ) : (

        <>

          <div
            className="relative border shadow-sm rounded-md "
            style={{ width: width || 700, height: "100%" }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-700 font-medium whitespace-nowrap">
              Rộng: {sheet.width} mm
            </div>

            {/* Label bên phải (DÀI) */}
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 rotate-90 text-xs text-gray-700 font-medium whitespace-nowrap">
              Dài: {sheet.height} mm
            </div>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${sheet.width} ${sheet.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern
                  id="wastePattern"
                  patternUnits="userSpaceOnUse"
                  width="10"
                  height="10"
                >
                  <path
                    d="M0,0 L10,10 M10,0 L0,10"
                    stroke="#ccc"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect width={sheet.width} height={sheet.height} fill="#f8f8f8" />

              {/* Phần dư (waste) */}
              {wasteAreas.map((w, i) => (
                <rect
                  key={`waste-${i}`}
                  x={w.x}
                  y={w.y}
                  width={w.width}
                  height={w.height}
                  fill="url(#wastePattern)"
                />
              ))}

              {/* Mảnh đã đặt */}
              {placedPieces.map((piece) => (
                <g key={piece.id}>
                  <rect
                    x={piece.x}
                    y={piece.y}
                    width={piece.width}
                    height={piece.height}
                    fill={piece.color || "#b8e4cb"}
                    stroke="#333"
                    strokeWidth={1}
                    rx={2}
                  />
                  <text
                    x={piece.x + piece.width / 2}
                    y={piece.y + piece.height / 2}
                    textAnchor="middle"
                    fontSize="15"
                    fill="#111"
                    dominantBaseline="middle"
                    style={{ pointerEvents: "none" }}
                  >
                    {piece.rotated
                      ? `${piece.height}x${piece.width}`
                      : `${piece.width}x${piece.height}`}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
