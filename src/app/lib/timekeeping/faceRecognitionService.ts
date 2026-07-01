/**
 * Service xử lý tính toán nhận diện khuôn mặt và chống giả mạo
 */

// Ngưỡng nhận diện chính (dùng khi so với tất cả slots, chặt hơn)
export const FACE_MATCH_THRESHOLD = 0.42;
// Ngưỡng liveness (góc nghiêng chấp nhận sai số cao hơn chút)
export const LIVENESS_MATCH_THRESHOLD = 0.58;

/**
 * Thuật toán Euclidean: Tính khoảng cách giữa 2 Face Vector 128 chiều
 * Giá trị càng nhỏ càng giống nhau. 0 là giống hệt.
 */
export function euclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length || v1.length !== 128) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

export interface FaceMatchResult {
  isMatch: boolean;
  bestMatchEmployee: Record<string, unknown> | null;
  minDistance: number;
  matchedSlotIndex: number; // Slot nào khớp tốt nhất (-1 nếu không khớp)
}

/**
 * Tìm nhân viên khớp nhất với khuôn mặt trong danh sách.
 *
 * Chiến lược Best-of-All:
 * - So sánh capturedVector với TẤT CẢ các slot đã đăng ký (faceVectors[0..9])
 * - Lấy khoảng cách nhỏ nhất trong tất cả các slot
 * - Ưu tiên nhân viên có slot có khoảng cách nhỏ nhất toàn bộ danh sách
 *
 * Lý do: Người dùng khi đứng trước kiosk có thể hơi nghiêng đầu tự nhiên,
 * nếu chỉ so slot 0 (thẳng) sẽ tăng tỷ lệ từ chối sai (false negative).
 */
export function findBestFaceMatch(
  capturedVector: number[],
  employees: Record<string, unknown>[]
): FaceMatchResult {
  let bestMatch: Record<string, unknown> | null = null;
  let globalMinDistance = FACE_MATCH_THRESHOLD; // Chỉ chấp nhận nếu dưới ngưỡng
  let bestSlotIndex = -1;

  for (const emp of employees) {
    const bio = emp.biometricData as Record<string, unknown> | undefined;
    if (!bio) continue;

    const faceVectors = Array.isArray(bio.faceVectors) ? bio.faceVectors : [];
    // Tương thích ngược: nếu không có faceVectors, thử faceVector cũ
    const legacyVector = Array.isArray(bio.faceVector) && (bio.faceVector as number[]).length === 128
      ? bio.faceVector as number[]
      : null;

    let empMinDist = Infinity;
    let empBestSlot = -1;

    // So sánh với tất cả các slot đã đăng ký (0 đến 9)
    for (let slotIdx = 0; slotIdx < faceVectors.length; slotIdx++) {
      const storedVec = faceVectors[slotIdx];
      if (!Array.isArray(storedVec) || storedVec.length !== 128) continue;

      const dist = euclideanDistance(capturedVector, storedVec as number[]);
      if (dist < empMinDist) {
        empMinDist = dist;
        empBestSlot = slotIdx;
      }
    }

    // Tương thích ngược: kiểm tra faceVector đơn lẻ nếu không có slot nào
    if (faceVectors.length === 0 && legacyVector) {
      const dist = euclideanDistance(capturedVector, legacyVector);
      if (dist < empMinDist) {
        empMinDist = dist;
        empBestSlot = 0;
      }
    }

    // Cập nhật kết quả tốt nhất toàn cục
    if (empMinDist < globalMinDistance) {
      globalMinDistance = empMinDist;
      bestMatch = emp;
      bestSlotIndex = empBestSlot;
    }
  }

  return {
    isMatch: bestMatch !== null,
    bestMatchEmployee: bestMatch,
    minDistance: globalMinDistance,
    matchedSlotIndex: bestSlotIndex
  };
}

/**
 * Xác thực Liveness (Chống giả mạo 3D) bằng góc mặt ngẫu nhiên.
 *
 * Server random challengeDirection (1-4) → client phải quay đầu đúng góc đó
 * và gửi lại vector. Server so với slot tương ứng đã đăng ký.
 *
 * Bảo mật: Client không thể biết trước challengeDirection (server generate),
 * nên không thể gian lận bằng cách replay vector slot 0.
 */
export function verifyLiveness(
  employee: Record<string, unknown>,
  challengeVector: number[],
  challengeDirection: number
): { isVerified: boolean; message: string } {
  const bio = employee.biometricData as Record<string, unknown> | undefined;
  const faceVectors = bio?.faceVectors && Array.isArray(bio.faceVectors) ? bio.faceVectors : [];

  const sideVector = faceVectors[challengeDirection] as number[] | undefined;

  if (!sideVector || !Array.isArray(sideVector) || sideVector.length !== 128) {
    const dirName = (['', 'TRÁI', 'PHẢI', 'NGƯỚC LÊN', 'CÚI XUỐNG'] as const)[challengeDirection] ?? 'không xác định';
    return {
      isVerified: false,
      message: `Lỗi bảo mật: Bạn chưa đăng ký góc mặt ${dirName}. Vui lòng liên hệ HR để cập nhật đủ 5 góc Face ID.`
    };
  }

  // Chống replay attack: challengeVector không được quá gần slot 0 (mặt thẳng)
  const mainVector = faceVectors[0] as number[] | undefined;
  if (mainVector && Array.isArray(mainVector) && mainVector.length === 128) {
    const distToFront = euclideanDistance(challengeVector, mainVector);
    // Nếu challenge vector quá giống mặt thẳng → có thể đang dùng ảnh tĩnh
    if (distToFront < 0.15) {
      return {
        isVerified: false,
        message: 'Cảnh báo giả mạo: Góc quay không hợp lệ (giống mặt thẳng).'
      };
    }
  }

  const sideDist = euclideanDistance(challengeVector, sideVector);
  if (sideDist >= LIVENESS_MATCH_THRESHOLD) {
    return {
      isVerified: false,
      message: 'Cảnh báo giả mạo: Góc quay khuôn mặt không khớp với hồ sơ đã đăng ký.'
    };
  }

  return { isVerified: true, message: 'Liveness hợp lệ.' };
}
