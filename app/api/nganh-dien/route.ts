import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  POWER_STOCKS,
  RESERVOIRS_HYDRO_DATA,
  HOURLY_SMP_PRICES,
  DAILY_GENERATION_BY_FUEL,
  DAILY_GENERATION_BY_OWNER,
  EAV_REGULATION_DOCS,
} from '@/lib/nganh-dien-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OFFLINE_DIR = path.join(process.cwd(), 'data', 'nganh_dien');
const SYNC_SCRIPT = path.join(process.cwd(), 'scripts', 'sync_nganh_dien_offline.py');

// Ensure offline directory exists
function ensureOfflineDir() {
  if (!fs.existsSync(OFFLINE_DIR)) {
    fs.mkdirSync(OFFLINE_DIR, { recursive: true });
  }
}

// Ensure 36 stocks JSON file is exported offline
function ensureOfflineStocksFile() {
  try {
    ensureOfflineDir();
    const stocksFile = path.join(OFFLINE_DIR, 'power_stocks_36_intel.json');
    const payload = {
      updatedAt: new Date().toISOString(),
      totalStocks: POWER_STOCKS.length,
      totalPlants: POWER_STOCKS.reduce((acc, s) => acc + s.powerPlants.length, 0),
      totalCapacityMW: POWER_STOCKS.reduce((acc, s) => acc + s.totalCapacityMW, 0),
      stocks: POWER_STOCKS,
    };
    fs.writeFileSync(stocksFile, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error ensuring offline stocks file:', err);
  }
}

// Read offline JSON file safely
function readOfflineJson<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(OFFLINE_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`Could not read offline file ${filename}:`, err);
  }
  return fallback;
}

// Run python sync script
function runOfflineSyncScript(): boolean {
  try {
    if (fs.existsSync(SYNC_SCRIPT)) {
      execSync(`python "${SYNC_SCRIPT}"`, { timeout: 25000, stdio: 'pipe' });
      return true;
    }
  } catch (err) {
    console.warn('Warning: Offline sync script execution error, using saved offline files:', err);
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const action = searchParams.get('action');

  try {
    ensureOfflineDir();
    ensureOfflineStocksFile();

    // 1. If action=sync requested, execute live sync script to fetch fresh NSMO & EAV
    if (action === 'sync') {
      runOfflineSyncScript();
    }

    // 2. Read offline files or fallback to in-memory datasets
    const offlineOwner = readOfflineJson('nsmo_chu_so_huu.json', {
      source: 'https://www.nsmo.vn/',
      data: DAILY_GENERATION_BY_OWNER,
    });

    const offlineFuel = readOfflineJson('nsmo_loai_hinh_nguon.json', {
      source: 'https://www.nsmo.vn/',
      data: DAILY_GENERATION_BY_FUEL,
    });

    const offlineSmp = readOfflineJson('nsmo_smp_48_chu_ky.json', {
      source: 'https://www.nsmo.vn/',
      cycles: HOURLY_SMP_PRICES,
    });

    const offlineReservoirs = readOfflineJson('eav_quan_trac_ho_chua.json', {
      source: 'https://hochuathuydien.evn.com.vn/',
      reservoirs: RESERVOIRS_HYDRO_DATA,
    });

    const offlineSystem = readOfflineJson('nsmo_tong_quan_he_thong.json', {
      source: 'https://www.nsmo.vn/',
      pMaxMW: 51207.4,
      pMaxTime: '17:50',
      totalGenerationMillionKWh: 1051.9,
    });

    const offlineAct = readOfflineJson('eav_bieu_gia_act_tranh_duoc.json', null);
    const offlineMeta = readOfflineJson('sync_metadata.json', {
      lastSyncTime: new Date().toISOString(),
      status: 'OFFLINE_READY',
    });

    // Sub-queries
    if (type === 'stocks') {
      return NextResponse.json({
        success: true,
        source: 'Offline data/nganh_dien/power_stocks_36_intel.json',
        count: POWER_STOCKS.length,
        data: POWER_STOCKS,
      });
    }

    if (type === 'hydro') {
      return NextResponse.json({
        success: true,
        source: 'Offline data/nganh_dien/eav_quan_trac_ho_chua.json',
        count: (offlineReservoirs as any)?.reservoirs?.length || RESERVOIRS_HYDRO_DATA.length,
        data: (offlineReservoirs as any)?.reservoirs || RESERVOIRS_HYDRO_DATA,
      });
    }

    if (type === 'market') {
      return NextResponse.json({
        success: true,
        source: 'Offline data/nganh_dien/nsmo_*.json',
        smp: (offlineSmp as any)?.cycles || HOURLY_SMP_PRICES,
        fuelDistribution: (offlineFuel as any)?.data || DAILY_GENERATION_BY_FUEL,
        ownerDistribution: (offlineOwner as any)?.data || DAILY_GENERATION_BY_OWNER,
        systemSummary: offlineSystem,
      });
    }

    if (type === 'act') {
      return NextResponse.json({
        success: true,
        source: 'Offline data/nganh_dien/eav_bieu_gia_act_tranh_duoc.json',
        data: offlineAct,
      });
    }

    // Default: full offline payload
    return NextResponse.json({
      success: true,
      isOfflineStorage: true,
      storageDirectory: 'data/nganh_dien',
      updatedAt: (offlineMeta as any)?.lastSyncTime || new Date().toISOString(),
      metadata: offlineMeta,
      stocks: POWER_STOCKS,
      reservoirs: (offlineReservoirs as any)?.reservoirs || RESERVOIRS_HYDRO_DATA,
      smp: (offlineSmp as any)?.cycles || HOURLY_SMP_PRICES,
      fuelDistribution: (offlineFuel as any)?.data || DAILY_GENERATION_BY_FUEL,
      ownerDistribution: (offlineOwner as any)?.data || DAILY_GENERATION_BY_OWNER,
      systemSummary: offlineSystem,
      avoidedCostAct: offlineAct,
      regulations: EAV_REGULATION_DOCS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    ensureOfflineDir();
    ensureOfflineStocksFile();

    const ok = runOfflineSyncScript();

    const offlineMeta = readOfflineJson('sync_metadata.json', {
      lastSyncTime: new Date().toISOString(),
      status: ok ? 'MANUAL_SYNC_OFFLINE_SAVED' : 'SAVED_LOCAL',
      directory: 'data/nganh_dien',
    });

    return NextResponse.json({
      success: true,
      message: 'Đã đồng bộ và cập nhật toàn bộ dữ liệu NSMO & EAV mới nhất về offline tại data/nganh_dien',
      timestamp: (offlineMeta as any)?.lastSyncTime || new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
