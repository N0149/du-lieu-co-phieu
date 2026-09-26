import fs from 'fs';
import path from 'path';
import {
  HealthcareContractor,
  InfrastructureProject,
  InfrastructurePackage,
  MacroForecastData,
} from './bidding-types';

export * from './bidding-types';

const DATA_DIR = path.join(process.cwd(), 'data', 'bidding');

function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return defaultValue;
  }
}

export function getHealthcareContractors(): HealthcareContractor[] {
  return readJsonFile<HealthcareContractor[]>('healthcare-contractors.json', []);
}

export function getHealthcareContractorDetail(codeOrTax: string): HealthcareContractor | null {
  const contractors = getHealthcareContractors();
  const search = codeOrTax.trim().toUpperCase();
  for (const c of contractors) {
    if (
      c.tax_code === codeOrTax ||
      c.id === codeOrTax ||
      c.short_name.toUpperCase() === search ||
      (c.stock_code && c.stock_code.toUpperCase() === search)
    ) {
      return c;
    }
  }
  return null;
}

export function getInfrastructureData(): {
  projects: InfrastructureProject[];
  packages: InfrastructurePackage[];
} {
  return readJsonFile<{
    projects: InfrastructureProject[];
    packages: InfrastructurePackage[];
  }>('infrastructure-projects.json', { projects: [], packages: [] });
}

export function getMacroForecastData(): MacroForecastData | null {
  return readJsonFile<MacroForecastData | null>('macro-forecast.json', null);
}

export function getBiddingSummaryKPIs() {
  const contractors = getHealthcareContractors();
  const totalBidsParticipated = contractors.reduce((sum, c) => sum + c.bids_participated, 0);
  const totalBidsWon = contractors.reduce((sum, c) => sum + c.bids_won, 0);
  const totalWinningValue = contractors.reduce((sum, c) => sum + c.total_winning_value, 0);

  const avgWinRate = totalBidsParticipated > 0 ? (totalBidsWon / totalBidsParticipated) * 100 : 0;

  return {
    total_contractors: contractors.length,
    total_bids_participated: totalBidsParticipated,
    total_bids_won: totalBidsWon,
    total_winning_value: totalWinningValue,
    avg_win_rate: parseFloat(avgWinRate.toFixed(1)),
    listed_contractors: contractors.filter((c) => c.is_listed).length,
  };
}
