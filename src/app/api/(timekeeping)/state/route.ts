import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { TimekeepingState } from '@/app/interface/timekeeping';

const dbPath = path.join(process.cwd(), 'data.json');

async function readDb(): Promise<Omit<TimekeepingState, 'isLoading'>> {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB, fallback to empty structure', error);
    return { employees: [], shifts: [], logs: [], leaveRequests: [], officeConfig: null };
  }
}

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db);
  } catch (error) {
    console.error('Failed to get state', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
