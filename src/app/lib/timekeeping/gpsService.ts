/**
 * Service xử lý các tính toán khoảng cách địa lý (GPS)
 */

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Thuật toán Haversine: Tính khoảng cách (mét) giữa 2 tọa độ GPS
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Bán kính Trái Đất tính bằng mét
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Kiểm tra xem vị trí thiết bị có nằm trong bán kính cho phép của cơ sở không
 */
export function validateGPS(
  deviceGps: GPSCoordinate,
  locationGps: { lat: number; lng: number; radiusMeters: number },
  skipCheck: boolean = false
): { isValid: boolean; distance: number; message?: string } {
  if (skipCheck) {
    return { isValid: true, distance: 0 };
  }

  if (!locationGps.lat && !locationGps.lng) {
    // Chưa cấu hình tọa độ cơ sở -> coi như không hợp lệ nhưng có thể cấu hình cảnh báo
    return { isValid: false, distance: 0, message: "Cơ sở chưa được cấu hình tọa độ GPS." };
  }

  const distance = calculateDistanceMeters(
    deviceGps.latitude,
    deviceGps.longitude,
    locationGps.lat,
    locationGps.lng
  );

  const maxAllowed = locationGps.radiusMeters || 100;
  const isValid = distance <= maxAllowed;

  return {
    isValid,
    distance,
    message: isValid 
      ? "Hợp lệ" 
      : `Vị trí thiết bị không hợp lệ. Cách cơ sở ${Math.round(distance)}m, tối đa cho phép ${maxAllowed}m.`
  };
}
