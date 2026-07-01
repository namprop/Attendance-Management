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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CuttingResult {
  totalPieces: number; // Tổng số bát cắt được (kể cả tận dụng phần dư)
  usedPieces: number; // Số mảnh gốc đã cắt được (từ quantity)
  usedSheets: number; // Số tấm phôi đã dùng (mặc định là 1 ở đây)
  wasteArea: number; // Tổng diện tích phần dư
  invalidPieces: Piece[]; // Danh sách mảnh không cắt được
}

export function calculateCuttingResult(
  pieces: Piece[],
  sheet: Sheet
): CuttingResult {
  const validPieces: Piece[] = pieces.filter(
    (p) =>
      (p.width <= sheet.width && p.height <= sheet.height) ||
      (!p.noRotation && p.height <= sheet.width && p.width <= sheet.height)
  );

  const invalidPieces: Piece[] = pieces.filter(
    (p) =>
      !(
        (p.width <= sheet.width && p.height <= sheet.height) ||
        (!p.noRotation && p.height <= sheet.width && p.width <= sheet.height)
      )
  );

  if (validPieces.length === 0) {
    return {
      totalPieces: 0,
      usedPieces: 0,
      usedSheets: 1,
      wasteArea: sheet.width * sheet.height,
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

  const placedPieces: Piece[] = [];
  let currentIndex = 0;

  const tryPlace = (p: Piece, rects: Rect[]): boolean => {
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const variants = [
        { w: p.width, h: p.height },
        ...(p.noRotation ? [] : [{ w: p.height, h: p.width }]),
      ];

      for (const v of variants) {
        if (v.w <= r.width && v.h <= r.height) {
          // Cắt được, cập nhật vùng trống
          rects.splice(i, 1);
          const remainingRects: Rect[] = [];

          if (r.width - v.w > 0) {
            remainingRects.push({
              x: r.x + v.w,
              y: r.y,
              width: r.width - v.w,
              height: v.h,
            });
          }

          if (r.height - v.h > 0) {
            remainingRects.push({
              x: r.x,
              y: r.y + v.h,
              width: r.width,
              height: r.height - v.h,
            });
          }

          rects.push(...remainingRects);
          return true;
        }
      }
    }

    return false;
  };

  const placeLoop = () => {
    let retry = true;

    while (retry && currentIndex < allPieces.length) {
      const p = allPieces[currentIndex];
      const placed = tryPlace(p, freeRects);
      if (placed) {
        placedPieces.push(p);
        currentIndex++;
      } else {
        retry = false;
      }
    }

    // Tận dụng phần dư nếu còn
    const template = validPieces[0];
    const canRotate = !template.noRotation;
    const variants = [
      { w: template.width, h: template.height },
      ...(canRotate ? [{ w: template.height, h: template.width }] : []),
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
          ...template,
          id: template.id + "-extra",
          width: v.w,
          height: v.h,
          quantity: 1,
        };

        const placed = tryPlace(fakePiece, freeRects);
        if (placed) {
          placedPieces.push(fakePiece);
          placedInThisLoop = true;
          break;
        }
      }

      if (!placedInThisLoop) break;

      totalFreeArea = freeRects.reduce((sum, r) => sum + r.width * r.height, 0);
    }
  };

  placeLoop();

  const totalWasteArea = freeRects.reduce(
    (sum, r) => sum + r.width * r.height,
    0
  );

  return {
    totalPieces: placedPieces.length,
    usedPieces: currentIndex,
    usedSheets: 1,
    wasteArea: totalWasteArea,
    invalidPieces,
  };
}
