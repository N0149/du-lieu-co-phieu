import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const contentDir = path.join(process.cwd(), 'content');

export type FinancialHighlights = {
  netRevenueQ2_2026?: number;
  grossProfitQ2_2026?: number;
  netProfitAfterTaxQ2_2026?: number;
  netProfitParentQ2_2026?: number;
  netProfitAfterTaxQ2_2025?: number;
  profitGrowthYoY?: number;
  associatesProfitQ2_2026?: number;
  associatesProfitQ2_2025?: number;
  associatesProfitGrowthYoY?: number;
  epsQ22026?: number;
  cashAndEquivalents?: number;
  shortTermFinancialInvestments?: number;
  longTermFinancialInvestments?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  ownerEquity?: number;
};

export type TickerReport = {
  ticker: string;
  companyName: string;
  sector: string;
  reportPeriod: string;
  publishDate: string;
  financialHighlights: FinancialHighlights;
  valuationNote?: string;
  keyCatalysts?: string[];
};

export type TickerReportContent = {
  ticker: string;
  content: string;
};

export async function getTickerReport(symbol: string): Promise<TickerReport | null> {
  try {
    const filePath = path.join(dataDir, `${symbol.toUpperCase()}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as TickerReport;
  } catch (error) {
    return null;
  }
}

export async function getTickerContent(symbol: string): Promise<TickerReportContent | null> {
  try {
    const files = await fs.readdir(contentDir);
    const targetFile = files.find(f => f.toLowerCase().startsWith(`${symbol.toLowerCase()}-`));
    if (!targetFile) return null;
    
    const filePath = path.join(contentDir, targetFile);
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      ticker: symbol.toUpperCase(),
      content
    };
  } catch (error) {
    return null;
  }
}

// ==========================================
// DANH SÁCH BÁO CÁO NGHIÊN CỨU DRIVE
// ==========================================

export interface ResearchReport {
  slug: string;
  ticker: string;
  title: string;
  quarter: string;
  date: string;
  author: string;
  category: string;
  summary: string;
  driveDocId: string;
}

export const RESEARCH_REPORTS: ResearchReport[] = [
  {
    slug: "snz-q2-2026",
    ticker: "SNZ",
    title: "Đánh Giá Tài Sản SNZ Tính RNAV",
    quarter: "Q2/2026",
    date: "2026-08-08",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Bóc tách hệ sinh thái tài sản KCN Biên Hòa, Long Thành và giá trị tài sản ròng SNZ.",
    driveDocId: "1t_KeRA3vDInpaXUjLDZENM8taoiMJFYT5DvwE0evaV8",
  },
  {
    slug: "bmi-q2-2026",
    ticker: "BMI",
    title: "Định Giá Cổ Phiếu BMI",
    quarter: "Q2/2026",
    date: "2026-07-31",
    author: "AI Analyst",
    category: "Bảo Hiểm",
    summary: "Đánh giá cấu trúc tài chính, danh mục tiền gửi và hiệu quả kinh doanh bảo hiểm Bảo Minh.",
    driveDocId: "1yjHgV9ubhIOZbkkfZGlLLCcqRXzc15-5Gxsvl-SCD8E",
  },
  {
    slug: "sgp-q2-2026",
    ticker: "SGP",
    title: "Định Giá Cổ Phiếu SGP - Cảng Sài Gòn",
    quarter: "Q2/2026",
    date: "2026-07-14",
    author: "AI Analyst",
    category: "Cảng Biển",
    summary: "Động lực tăng trưởng 2026-2027 từ chuỗi hạ tầng cảng biển và Cảng siêu trung chuyển Cần Giờ.",
    driveDocId: "1k4IGwsmxdt7BUNYceBfUuZ27r_eeKjczPw11T0kT3QM",
  },
  {
    slug: "szl-q2-2026",
    ticker: "SZL",
    title: "Định Giá Cổ Phiếu SZL Bằng RNAV",
    quarter: "Q2/2026",
    date: "2026-04-12",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Định giá lại mảng nhà xưởng cho thuê và KCN Long Thành Sonadezi.",
    driveDocId: "1gElWhAi1znQTnhKOS-v_MEK6nOoaVyNml8v-33UARTA",
  },
  {
    slug: "ttt-q2-2026",
    ticker: "TTT",
    title: "Định Giá Cổ Phiếu TTT",
    quarter: "Q2/2026",
    date: "2026-07-13",
    author: "AI Analyst",
    category: "Định Giá Doanh Nghiệp",
    summary: "Phân tích tài sản ngầm và tỷ suất cổ tức tiền mặt bền vững.",
    driveDocId: "1YwOp6RG6Yxk9jnpwWmLtpld_EWnYapUfYMKeTZ0EbKE",
  },
  {
    slug: "vnf-q2-2026",
    ticker: "VNF",
    title: "Định Giá Cổ Phiếu VNF - Vinafreight",
    quarter: "Q2/2026",
    date: "2026-08-01",
    author: "AI Analyst",
    category: "CTY Liên Kết",
    summary: "Bóc tách danh mục CTY liên kết bứt phá +2049% YoY và quỹ tiền dồi dào.",
    driveDocId: "1jSk0lAOqaMh9Z4ThFcqRNlDCAwWX9cnlcoJs0y3PVGs",
  },
  {
    slug: "vnl-q2-2026",
    ticker: "VNL",
    title: "Định Giá Cổ Phiếu VNL - Logistics",
    quarter: "Q2/2026",
    date: "2026-08-01",
    author: "AI Analyst",
    category: "Logistics",
    summary: "Phân tích khả năng tạo lợi suất >15% trong môi trường lãi suất cao.",
    driveDocId: "19iuzCYO1KwtH3tpU2iefRtMFetgjonD9V-vJ9o2J3gw",
  },
  {
    slug: "dri-q2-2026",
    ticker: "DRI",
    title: "Định Giá DRI Theo RNAV Chi Tiết",
    quarter: "Q2/2026",
    date: "2026-04-23",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Đánh giá quỹ đất nông nghiệp cao su tại Lào và dự phóng dòng tiền dài hạn.",
    driveDocId: "1VqDyBRY33phdQCchleO9KZmZ_krgWezrhFz6lmHOekg",
  },
  {
    slug: "lhg-q2-2026",
    ticker: "LHG",
    title: "Định Giá LHG Theo Phương Pháp RNAV",
    quarter: "Q2/2026",
    date: "2026-05-22",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Đánh giá KCN Long Hậu 3, nhà xưởng cao tầng và số dư tiền mặt lớn.",
    driveDocId: "1LTbiMCRZHNPS31XZTN2BPpRgywc51bEbnRVuAlIgMQ8",
  },
  {
    slug: "m10-q2-2026",
    ticker: "M10",
    title: "Định Giá M10 Và Tiềm Năng Tăng Trưởng",
    quarter: "Q2/2026",
    date: "2026-04-29",
    author: "AI Analyst",
    category: "Dệt May",
    summary: "Chiến lược định giá RNAV từ di sản 80 năm đến tầm nhìn thời trang toàn cầu.",
    driveDocId: "1iwA-9XQossagjnpk1chEIZaM6bkXiY_EeND27wIY430",
  },
  {
    slug: "ral-q2-2026",
    ticker: "RAL",
    title: "Định Giá RAL Và Phân Tích Tăng Trưởng",
    quarter: "Q2/2026",
    date: "2026-05-02",
    author: "AI Analyst",
    category: "Sản Xuất",
    summary: "Chuyển đổi số nhà máy thông minh và đánh giá quỹ đất Hạ Đình.",
    driveDocId: "1rVEdcwplN-FUDrNJjXYj3Ed3DgHLIgKEq6oZRk-Yn3c",
  },
  {
    slug: "sd9-q2-2026",
    ticker: "SD9",
    title: "Định Giá RNAV Của SD9",
    quarter: "Q2/2026",
    date: "2026-08-07",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Giải phóng giá trị tài sản ròng từ các dự án thủy điện và các khoản phải thu.",
    driveDocId: "1vbjd1GF8gTkUp4ptUYGtm7JsURm85d1v9B8SeQ5hmf0",
  },
  {
    slug: "idv-q2-2026",
    ticker: "IDV",
    title: "Deep Research IDV - Phân Tích RNAV 2026",
    quarter: "Q2/2026",
    date: "2026-08-08",
    author: "AI Analyst",
    category: "RNAV",
    summary: "Định giá KCN Châu Sơn, Khai Quang và dòng tiền cổ tức đều đặn.",
    driveDocId: "1ua3L_bcAqwpz-0soIg8GetncvQ_MAQtP-7NOXVYXvtg",
  },
  {
    slug: "dc4-q2-2026",
    ticker: "DC4",
    title: "Phân Tích Cổ Phiếu DC4 & Quỹ Đất DICERA",
    quarter: "Q2/2026",
    date: "2026-08-08",
    author: "AI Analyst",
    category: "Bất Động Sản",
    summary: "Đánh giá dự án Chí Linh Center, quỹ đất Bà Rịa Vũng Tàu và hệ sinh thái DIC.",
    driveDocId: "1Z3FIe3ExzMBLCJEU-AKjo1Rso_e581u0_lfkHEKXRt0",
  },
];

export function getResearchReportBySlug(slug: string): ResearchReport | undefined {
  if (!slug) return undefined;
  return RESEARCH_REPORTS.find((r) => r.slug?.toLowerCase() === slug.toLowerCase());
}

export function getResearchReportsByTicker(ticker: string): ResearchReport[] {
  return RESEARCH_REPORTS.filter(
    (r) => r.ticker.toLowerCase() === ticker.toLowerCase()
  );
}