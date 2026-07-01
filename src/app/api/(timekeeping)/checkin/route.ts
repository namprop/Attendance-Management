import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { CheckInLog, TimekeepingState } from '@/app/interface/timekeeping';

const dbPath = path.join(process.cwd(), 'data.json');

async function readDb(): Promise<Omit<TimekeepingState, 'isLoading'>> {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB', error);
    return { employees: [], shifts: [], logs: [], leaveRequests: [], officeConfig: null };
  }
}

async function writeDb(data: Omit<TimekeepingState, 'isLoading'>): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

interface CheckInRequestBody {
  employeeId: string;
  shiftId: string;
  deviceType?: 'Web' | 'FaceID' | 'WiFi';
  lat?: number;
  lng?: number;
  wifiName?: string | null;
  wifiBssid?: string | null;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequestBody = await request.json();
    const { employeeId, shiftId, deviceType, lat, lng, wifiName, notes } = body;

    if (!employeeId || !shiftId) {
      return NextResponse.json({ error: 'Missing employeeId or shiftId' }, { status: 400 });
    }

    const db = await readDb();
    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const shift = db.shifts.find((s) => s.id === shiftId);
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Format clockTime as "HH:MM:SS" with local time zone
    const clockTime = now.toTimeString().split(' ')[0];

    // Verify distance / WiFi
    const office = db.officeConfig;
    let gpsMatched = false;

    if (office) {
      if (lat !== undefined && lng !== undefined) {
        // Haversine formula for distance
        const R = 6371e3; // metres
        const lat1Rad = (lat * Math.PI) / 180;
        const lat2Rad = (office.latitude * Math.PI) / 180;
        const deltaLatRad = ((office.latitude - lat) * Math.PI) / 180;
        const deltaLngRad = ((office.longitude - lng) * Math.PI) / 180;

        const a =
          Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
          Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // in metres

        if (distance <= office.radius) {
          gpsMatched = true;
        }
      }

      // WiFi SSID matching
      if (wifiName && wifiName === office.wifiSsid) {
        gpsMatched = true; // WiFi acts as success geolocation match
      }
    }

    // Is there a log for this employee today?
    const existingLogIndex = db.logs.findIndex((l) => l.employeeId === employeeId && l.date === todayStr);

    if (existingLogIndex === -1) {
      // CHECK-IN
      const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
      const [nowHour, nowMin] = clockTime.split(':').map(Number);
      
      let lateMinutes = 0;
      const shiftStartInMinutes = shiftHour * 60 + shiftMin;
      const nowInMinutes = nowHour * 60 + nowMin;
      
      if (nowInMinutes > shiftStartInMinutes + shift.graceMinutes) {
        lateMinutes = nowInMinutes - shiftStartInMinutes;
      }

      const newLog: CheckInLog = {
        id: `LOG${String(db.logs.length + 1).padStart(3, '0')}`,
        employeeId,
        date: todayStr,
        clockIn: clockTime,
        clockOut: null,
        lateMinutes,
        earlyMinutes: 0,
        shiftId,
        gpsMatched,
        deviceType: deviceType || 'Web',
        notes: notes || ''
      };

      db.logs.push(newLog);
      await writeDb(db);
      
      return NextResponse.json({ type: 'checkin', log: newLog, distanceDetails: { gpsMatched } }, { status: 201 });
    } else {
      // CHECK-OUT
      const log = db.logs[existingLogIndex];
      if (log.clockOut) {
        return NextResponse.json({ error: 'Bạn đã hoàn tất chấm công ra (Check-out) cho ngày hôm nay rồi.' }, { status: 400 });
      }

      // Calculate early minutes
      const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);
      const [nowHour, nowMin] = clockTime.split(':').map(Number);
      
      let earlyMinutes = 0;
      const shiftEndInMinutes = shiftEndHour * 60 + shiftEndMin;
      const nowInMinutes = nowHour * 60 + nowMin;
      
      if (nowInMinutes < shiftEndInMinutes) {
        earlyMinutes = shiftEndInMinutes - nowInMinutes;
      }

      log.clockOut = clockTime;
      log.earlyMinutes = earlyMinutes;
      if (notes) {
        log.notes = (log.notes ? log.notes + '; ' : '') + notes;
      }

      await writeDb(db);
      
      return NextResponse.json({ type: 'checkout', log, distanceDetails: { gpsMatched } });
    }
  } catch (error) {
    console.error('API Checkin error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
