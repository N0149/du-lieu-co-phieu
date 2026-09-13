import type { BctcNoteItem } from "@/lib/bctc-service";

export type FinancialTab = "cdkt" | "kqkd" | "lctt" | "ratios";

export function normalizeBctcStr(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface NoteRule {
  tabs: ("cdkt" | "kqkd" | "lctt")[];
  section: number; // 2: CDKT, 3: KQKD, 4: Other/LCTT
  rowKeywords: string[];
  excludeRowKeywords?: string[];
  noteKeywords: string[];
}

const NOTE_RULES: NoteRule[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. CÂN ĐỐI KẾ TOÁN (Section 2)
  // ─────────────────────────────────────────────────────────────
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: [
      "tien va tuong duong tien",
      "cac khoan tuong duong tien",
      "tien mat",
      "tien gui ngan hang",
      "tien",
    ],
    excludeRowKeywords: ["nguoi mua tra tien truoc", "tra tien truoc"],
    noteKeywords: ["tien va cac khoan tuong duong tien", "tien va tuong duong tien"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: [
      "dau tu ngan han",
      "dau tu tai chinh",
      "chung khoan kinh doanh",
      "dau tu nam giu den ngay dao han",
    ],
    excludeRowKeywords: ["du phong giam gia hang ton kho"],
    noteKeywords: ["cac khoan dau tu tai chinh", "dau tu tai chinh", "dau tu nam giu"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: [
      "phai thu khach hang",
      "phai thu cua khach hang",
      "cac khoan phai thu",
      "phai thu ngan han",
    ],
    excludeRowKeywords: ["phai thu khac", "tra truoc nguoi ban", "phai thu cho vay"],
    noteKeywords: ["phai thu ngan han cua khach hang", "phai thu cua khach hang", "phai thu khach hang"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["tra truoc nguoi ban", "tra truoc cho nguoi ban"],
    noteKeywords: ["tra truoc cho nguoi ban", "tra truoc nguoi ban"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["phai thu khac", "phai thu ngan han khac"],
    noteKeywords: ["phai thu ngan han khac", "phai thu khac"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["no qua han", "du phong phai thu ngan han kho doi", "du phong phai thu kho doi"],
    noteKeywords: ["no qua han", "du phong phai thu"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["hang ton kho", "hang ton kho rong", "du phong giam gia hang ton kho", "du phong giam gia"],
    excludeRowKeywords: ["du phong giam gia dau tu"],
    noteKeywords: ["hang ton kho"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["tai san sinh hoc", "suc vat nuoi"],
    noteKeywords: ["tai san sinh hoc", "suc vat nuoi"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["tai san co dinh huu hinh", "tscd huu hinh", "tai san co dinh"],
    excludeRowKeywords: ["vo hinh"],
    noteKeywords: ["tai san co dinh huu hinh", "tang giam tai san co dinh huu hinh"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["tai san co dinh vo hinh", "tscd vo hinh"],
    noteKeywords: ["tai san co dinh vo hinh", "tang giam tai san co dinh vo hinh"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["xay dung co ban do dang", "chi phi xay dung co ban do dang"],
    noteKeywords: ["chi phi xay dung co ban do dang", "xay dung co ban do dang"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["chi phi tra truoc", "chi phi tra truoc dai han", "chi phi cho phan bo", "chi phi tra truoc ngan han"],
    noteKeywords: ["chi phi tra truoc", "chi phi cho phan bo"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["tai san ngan han khac", "tai san luu dong khac"],
    excludeRowKeywords: ["tai san ngan han"], // tránh match dòng cha "TÀI SẢN NGẮN HẠN"
    noteKeywords: ["tai san ngan han khac"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["phai tra nguoi ban", "phai tra nguoi ban ngan han"],
    noteKeywords: ["phai tra nguoi ban"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["nguoi mua tra tien truoc", "nguoi mua tra tien truoc ngan han", "nguoi mua tra tien truoc dai han"],
    noteKeywords: ["nguoi mua tra tien truoc"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["thue va cac khoan phai nop", "thue va cac khoan phai nop nha nuoc"],
    noteKeywords: ["thue va cac khoan phai nop"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["phai tra nguoi lao dong"],
    noteKeywords: ["phai tra nguoi lao dong"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["chi phi phai tra", "chi phi phai tra ngan han", "chi phi phai tra dai han"],
    noteKeywords: ["chi phi phai tra"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["phai tra khac", "phai tra ngan han khac", "phai tra dai han khac"],
    noteKeywords: ["phai tra khac"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["vay va no thue tai chinh", "vay ngan han", "vay dai han", "vay va no"],
    excludeRowKeywords: ["phai thu cho vay"],
    noteKeywords: ["vay va no thue tai chinh", "vay va no"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["du phong phai tra", "du phong phai tra dai han"],
    noteKeywords: ["du phong phai tra"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: [
      "von chu so huu",
      "von gop",
      "von gop cua chu so huu",
      "thang du von co phan",
      "co phieu",
      "co phieu pho thong",
      "co phieu uu dai",
    ],
    noteKeywords: ["von chu so huu", "co phieu"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["quy khen thuong phuc loi", "quy khen thuong"],
    noteKeywords: ["quy khen thuong phuc loi", "quy khen thuong"],
  },
  {
    tabs: ["cdkt"],
    section: 2,
    rowKeywords: ["thue thu nhap hoan lai"],
    noteKeywords: [
      "thue thu nhap hoan lai",
      "thue thu nhap hoan lai phai tra",
      "tai san thue thu nhap hoan lai",
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. KẾT QUẢ KINH DOANH (Section 3)
  // ─────────────────────────────────────────────────────────────
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: [
      "doanh thu ban hang",
      "doanh thu thuan",
      "doanh thu ban hang va cung cap dich vu",
    ],
    noteKeywords: [
      "doanh thu ban hang va cung cap dich vu",
      "doanh thu thuan gia von hang ban",
      "doanh thu ban hang",
      "doanh thu thuan",
    ],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["gia von hang ban", "gia von"],
    noteKeywords: ["gia von hang ban", "doanh thu thuan gia von hang ban"],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["doanh thu hoat dong tai chinh", "doanh thu tai chinh"],
    noteKeywords: ["doanh thu hoat dong tai chinh"],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["chi phi tai chinh", "chi phi lai vay"],
    noteKeywords: ["chi phi tai chinh"],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["chi phi ban hang"],
    noteKeywords: ["chi phi ban hang", "chi phi ban hang va chi phi quan ly", "chi phi ban hang quan ly doanh nghiep"],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["chi phi quan ly doanh nghiep", "chi phi quan ly"],
    noteKeywords: [
      "chi phi quan ly doanh nghiep",
      "chi phi ban hang va chi phi quan ly",
      "chi phi ban hang quan ly doanh nghiep",
    ],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: [
      "chi phi thue thu nhap doanh nghiep",
      "thue thu nhap doanh nghiep",
      "chi phi thue tndn",
    ],
    noteKeywords: ["chi phi thue thu nhap doanh nghiep", "chi phi thue tndn"],
  },
  {
    tabs: ["kqkd"],
    section: 3,
    rowKeywords: ["lai co ban tren co phieu", "eps"],
    noteKeywords: ["lai co ban tren co phieu", "eps"],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. LƯU CHUYỂN TIỀN TỆ (Section 4)
  // ─────────────────────────────────────────────────────────────
  {
    tabs: ["lctt"],
    section: 4,
    rowKeywords: ["luu chuyen tien te", "thong tin bo sung"],
    noteKeywords: ["thong tin bo sung cho bao cao luu chuyen tien te"],
  },
];

/**
 * Tìm Thuyết minh tương ứng cho một chỉ tiêu BCTC
 */
export function findMatchingNote(
  rowName: string,
  tab: FinancialTab,
  notes?: BctcNoteItem[] | null
): BctcNoteItem | null {
  if (!notes || notes.length === 0 || !rowName) return null;
  if (tab === "ratios") return null;

  const cleanName = rowName.replace(/^_+/, "").trim();
  const upperClean = cleanName.toUpperCase();

  // Bỏ qua các tiêu đề tổng chương lớn chỉ có tính chất phân loại chung
  if (
    upperClean === "TÀI SẢN NGẮN HẠN" ||
    upperClean === "TÀI SẢN DÀI HẠN" ||
    upperClean === "NỢ PHẢI TRẢ" ||
    upperClean === "NỢ NGẮN HẠN" ||
    upperClean === "NỢ DÀI HẠN" ||
    upperClean === "TỔNG CỘNG TÀI SẢN" ||
    upperClean === "TỔNG CỘNG NGUỒN VỐN" ||
    upperClean === "LỢI NHUẬN TRƯỚC THUẾ" ||
    upperClean === "LỢI NHUẬN SAU THUẾ"
  ) {
    return null;
  }

  const nRow = normalizeBctcStr(cleanName);
  if (!nRow) return null;

  // 1. Kiểm tra theo bộ quy tắc chính xác (Rule-based)
  for (const rule of NOTE_RULES) {
    if (!rule.tabs.includes(tab as any)) continue;

    // Kiểm tra loại trừ (Exclusions)
    if (
      rule.excludeRowKeywords &&
      rule.excludeRowKeywords.some((ex) => nRow.includes(ex))
    ) {
      continue;
    }

    const isMatchRow = rule.rowKeywords.some((kw) => {
      return (
        nRow === kw ||
        nRow.startsWith(kw + " ") ||
        nRow.endsWith(" " + kw) ||
        nRow.includes(" " + kw + " ")
      );
    });

    if (isMatchRow) {
      const candidate = notes.find((n) => {
        if (rule.section && n.sectionNumber !== rule.section && n.sectionNumber !== 0) {
          return false;
        }
        const nTitle = normalizeBctcStr(n.title);
        return rule.noteKeywords.some((nkw) => nTitle.includes(nkw));
      });
      if (candidate) return candidate;
    }
  }

  // 2. Dự phòng (Fallback): Khớp chuỗi trực tiếp trong đúng Section
  const targetSection = tab === "cdkt" ? 2 : tab === "kqkd" ? 3 : 4;
  const sectionNotes = notes.filter((n) => n.sectionNumber === targetSection);

  for (const n of sectionNotes) {
    const nTitle = normalizeBctcStr(n.title);
    if (nTitle.length > 5 && (nTitle.includes(nRow) || (nRow.length > 8 && nRow.includes(nTitle)))) {
      return n;
    }
  }

  return null;
}

/**
 * Tạo nhãn badge ngắn gọn (ví dụ "TM 1", "TM 6", "TM")
 */
export function getNoteShortBadge(note: BctcNoteItem): string {
  if (note.noteNumber) {
    return `TM ${note.noteNumber}`;
  }
  return "TM";
}
