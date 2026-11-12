// Dữ liệu quỹ mở Việt Nam (Open-ended Mutual Funds Vietnam)
// Tự động đồng bộ từ hệ thống dữ liệu thị trường Fmarket

export type FundCategory = 'equity' | 'bond' | 'balanced'

export interface FundHolding {
  symbol: string
  name: string
  industry: string
  weight: number // % tỷ trọng danh mục
}

export interface Fund {
  id: string
  code: string // Mã CCQ: DCDS, VEOF, VCBF-MGF,...
  name: string
  category: FundCategory
  issuer: string // Dragon Capital, VinaCapital, VCBF, SSIAM,...
  issuerFullName?: string
  nav: number // Giá NAV gần nhất (VND)
  navDate: string // Ngày cập nhật NAV (dd/MM/yyyy)
  ytdReturn: number | null // % Lợi nhuận từ đầu năm (YTD)
  return1Y: number | null // % Lợi nhuận 1 năm
  return3Y: number | null // % Lợi nhuận 3 năm
  returnInception?: number | null // % Lợi nhuận từ khi thành lập
  aumBillionVnd?: number // Quy mô tài sản (tỷ VNĐ)
  managementFee?: number // % Phí quản lý hàng năm
  inceptionDate?: string
  holdings: FundHolding[]
  description: string
  fmarketId?: number
}

export interface StockHoldingStats {
  rank: number
  symbol: string
  name?: string
  industry: string
  fundCount: number
  avgWeight: number
}

export interface IndustryHoldingStats {
  rank: number
  industry: string
  fundCount: number
  avgWeight: number
}

export const FUND_CATEGORIES: { key: FundCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'equity', label: 'Cổ phiếu' },
  { key: 'bond', label: 'Trái phiếu' },
  { key: 'balanced', label: 'Cân bằng' },
]

export const FUND_ISSUERS: string[] = [
  "Tất cả tổ chức",
  "VIETCOMBANK FUND",
  "MIRAE ASSET",
  "DCVFM",
  "UOBAM VIETNAM",
  "SSIAM",
  "AMBER CAPITAL",
  "KIM",
  "VIETINBANK CAPITAL",
  "LPBA",
  "ABF",
  "LIGHTHOUSE CAPITAL",
  "HDCAPITAL",
  "EASTSPRING VIET NAM",
  "MBCAPITAL",
  "VDAM",
  "VINACAPITAL",
  "TCAM",
  "MANULIFE INVESTMENTS",
  "VCAM",
  "IPA PARTNER",
  "PHFM",
  "PVCB CAPITAL",
  "NTP AM",
  "SGIC",
  "BAOVIETFUND",
  "DFVN"
]

export const FUNDS_DATA: Fund[] = [
  {
    "id": "vcbf-cfo",
    "fmarketId": 122,
    "code": "VCBF-CFO",
    "name": "QUỸ ĐẦU TƯ TỐI ƯU DÒNG TIỀN VCBF",
    "category": "bond",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 10040.74,
    "navDate": "12/11/2026",
    "ytdReturn": 0.41,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 0.41,
    "managementFee": 0.2,
    "inceptionDate": "15/09/2026",
    "description": "Quỹ Đầu tư chủ yếu vào các công cụ thị trường tiền tệ ngắn hạn, bao gồm tiền gửi ngân hàng, chứng chỉ tiền gửi của các tổ chức tín dụng, và có thể không quá 10% vào trái phiếu doanh nghiệp niêm yết và trái phiếu chào bán ra công chúng. Mang lại thu nhập tăng thêm, trong khi ưu tiên bảo toàn vốn và duy trì tính thanh khoản bằng cách đầu tư chủ yếu vào các công cụ thị trường tiền tệ ngắn hạn có tính an toàn cao.",
    "holdings": []
  },
  {
    "id": "madef",
    "fmarketId": 121,
    "code": "MADEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU CỔ TỨC MIRAE ASSET VIỆT NAM",
    "category": "equity",
    "issuer": "MIRAE ASSET",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MIREA ASSET VIỆT NAM",
    "nav": 10000,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 0,
    "managementFee": 1.75,
    "inceptionDate": "",
    "description": "Quỹ đầu tư vào nhóm Cổ phiếu VN30 nhằm tối đa hóa lợi nhuận dài hạn cho Nhà đầu tư trên cơ sở kết hợp giữa tăng trưởng vốn và các dòng thu nhập từ tài sản đầu tư. Quỹ đầu tư hướng tới tăng trưởng giá trị tài sản ròng dài hạn thông qua danh mục đầu tư vào các công ty có nền tảng tài chính vững mạnh, chính sách chia cổ tức rõ ràng và lịch sử chi trả cổ tức ổn định.",
    "holdings": []
  },
  {
    "id": "dcba",
    "fmarketId": 118,
    "code": "DCBA",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG DC",
    "category": "balanced",
    "issuer": "DCVFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ DRAGON CAPITAL VIỆT NAM",
    "nav": 9875.29,
    "navDate": "12/11/2026",
    "ytdReturn": -1.25,
    "return1Y": null,
    "return3Y": null,
    "returnInception": -1.25,
    "managementFee": 1.75,
    "inceptionDate": "29/07/2026",
    "description": "Quỹ cân bằng, kết hợp giữa tăng trưởng và giảm rủi ro, lý tưởng cho bước chuyển từ tiết kiệm sang đầu tư.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 12.45
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 3.55
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 3.49
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 3.17
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 2.55
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 2.42
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 2.4
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 2.28
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 1.79
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 1.73
      }
    ]
  },
  {
    "id": "ummf",
    "fmarketId": 117,
    "code": "UMMF",
    "name": "QUỸ ĐẦU TƯ UNITED DÒNG TIỀN LINH HOẠT",
    "category": "bond",
    "issuer": "UOBAM VIETNAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ UOB ASSET MANAGEMENT (VIỆT NAM)",
    "nav": 10024.44,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 0.24,
    "managementFee": 0.6,
    "inceptionDate": "",
    "description": "Quỹ đầu tư vào tài sản như sau: Tài sản chiếm tỷ trọng cao trong danh mục đầu tư  (ví dụ: Trái phiếu doanh nghiệp,  Trái phiếu chính phủ, Chứng chỉ tiền gửi, Công cụ thị trường tiền tệ,…) và tài sản chiếm tỷ trọng vừa/thấp trong danh mục đầu tư (ví dụ: Trái phiếu doanh nghiệp,  Trái phiếu chính phủ, Chứng chỉ tiền gửi, Công cụ thị trường tiền tệ,…).",
    "holdings": []
  },
  {
    "id": "ssi-pdf",
    "fmarketId": 116,
    "code": "SSI-PDF",
    "name": "QUỸ ĐẦU TƯ CỔ TỨC TĂNG TRƯỞNG KÉP SSI",
    "category": "equity",
    "issuer": "SSIAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ SSI",
    "nav": 10150.05,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 1.5,
    "managementFee": 1.9,
    "inceptionDate": "",
    "description": "Quỹ đầu tư vào các cổ phiếu có lịch sử và tiềm năng chi trả cổ tức cao, ổn định; hướng tới tăng trưởng vốn dài hạn cho Nhà đầu tư.",
    "holdings": [
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 8.5
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 0.11
      },
      {
        "symbol": "SAB",
        "name": "Sabeco",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 0.08
      },
      {
        "symbol": "DPR",
        "name": "DPR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 0.07
      },
      {
        "symbol": "IDC",
        "name": "Tổng Công ty IDICO",
        "industry": "Tiện ích",
        "weight": 0.07
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 0.04
      },
      {
        "symbol": "BCM12406",
        "name": "BCM12406",
        "industry": "Bất động sản",
        "weight": 18.18
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 18.17
      }
    ]
  },
  {
    "id": "aeif",
    "fmarketId": 115,
    "code": "AEIF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU AMBER",
    "category": "equity",
    "issuer": "AMBER CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ AMBER",
    "nav": 9284.15,
    "navDate": "12/11/2026",
    "ytdReturn": -7.16,
    "return1Y": null,
    "return3Y": null,
    "returnInception": -7.16,
    "managementFee": 1.35,
    "inceptionDate": "11/05/2026",
    "description": "AEIF là quỹ mở đầu tư cổ phiếu đầu tư vào các cổ phiếu đầu ngành, cơ bản tốt có lợi thế cạnh tranh kết hợp cùng việc tối ưu hóa định lượng để kiểm soát rủi ro, hướng tới mục tiêu tăng trưởng bền vững cho nhà đầu tư.",
    "holdings": [
      {
        "symbol": "EVF",
        "name": "EVF",
        "industry": "Tài chính khác",
        "weight": 17.77
      },
      {
        "symbol": "EIB",
        "name": "Eximbank",
        "industry": "Ngân hàng",
        "weight": 16.22
      },
      {
        "symbol": "PIV",
        "name": "PIV",
        "industry": "Bất động sản",
        "weight": 3.91
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 1.18
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 1.07
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 1.05
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 0.82
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 0.81
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 0.77
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 0.74
      }
    ]
  },
  {
    "id": "ksif",
    "fmarketId": 114,
    "code": "KSIF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU CHIẾN LƯỢC KIM",
    "category": "bond",
    "issuer": "KIM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ KIM VIỆT NAM",
    "nav": 10272.64,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 2.73,
    "managementFee": 1.2,
    "inceptionDate": "",
    "description": "KSIF hướng tới lợi nhuận vượt lãi suất tiền gửi 6 tháng, đảm bảo tính thanh khoản cao, đầu tư đa dạng và linh hoạt vào trái phiếu doanh nghiệp chất lượng cao và các công cụ tiền tệ.",
    "holdings": [
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 14.5
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 12.82
      },
      {
        "symbol": "SHS12601-OTC",
        "name": "SHS12601-OTC",
        "industry": "Khác",
        "weight": 9.86
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 7.18
      },
      {
        "symbol": "VBA124019",
        "name": "VBA124019",
        "industry": "Ngân hàng",
        "weight": 0.48
      }
    ]
  },
  {
    "id": "vbif",
    "fmarketId": 113,
    "code": "VBIF",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG VIETINBANK",
    "category": "balanced",
    "issuer": "VIETINBANK CAPITAL",
    "issuerFullName": "CÔNG TY TNHH MTV QUẢN LÝ QUỸ NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN CÔNG THƯƠNG VIỆT NAM",
    "nav": 10181.36,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 1.81,
    "managementFee": 1.5,
    "inceptionDate": "",
    "description": "Quỹ hướng tới mục tiêu là mang lại hiệu suất sinh lời ổn định đi kèm mức rủi ro được kiểm soát, tạo cơ hội tăng trưởng bền vững cho nhà đầu tư.",
    "holdings": [
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 0.01
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 0.01
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 17.35
      },
      {
        "symbol": "SHS12601",
        "name": "SHS12601",
        "industry": "Chứng khoán",
        "weight": 17.35
      },
      {
        "symbol": "SHB125017",
        "name": "SHB125017",
        "industry": "Ngân hàng",
        "weight": 4.2
      },
      {
        "symbol": "LPB125006",
        "name": "LPB125006",
        "industry": "Ngân hàng",
        "weight": 4.06
      }
    ]
  },
  {
    "id": "lplf",
    "fmarketId": 97,
    "code": "LPLF",
    "name": "QUỸ ĐẦU TƯ DOANH NGHIỆP DẪN ĐẦU LP ",
    "category": "equity",
    "issuer": "LPBA",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ LPB",
    "nav": 9133.13,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": -8.67,
    "managementFee": 1.75,
    "inceptionDate": "",
    "description": "Mục tiêu đầu tư của Quỹ là tối đa hóa tăng trưởng giá trị tài sản cho nhà đầu tư thông qua việc đầu tư vào cổ phiếu của các doanh nghiệp có vị thế đầu ngành, có nền tảng tài chính vững chắc, năng lực cạnh tranh bền vững và tiềm năng tăng trưởng cao, được hưởng lợi từ chính sách ưu tiên phát triển của Nhà nước.",
    "holdings": [
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 9.89
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 8.58
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 6.74
      },
      {
        "symbol": "LPB",
        "name": "LPBank",
        "industry": "Ngân hàng",
        "weight": 5.8
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 5.68
      },
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 5.68
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 5.13
      },
      {
        "symbol": "VCI",
        "name": "Chứng khoán Vietcap",
        "industry": "Chứng khoán",
        "weight": 4.75
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.16
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 4.05
      }
    ]
  },
  {
    "id": "abef",
    "fmarketId": 96,
    "code": "ABEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU AN BÌNH THỊNH VƯỢNG",
    "category": "equity",
    "issuer": "ABF",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN AN BÌNH",
    "nav": 9096.99,
    "navDate": "12/11/2026",
    "ytdReturn": null,
    "return1Y": null,
    "return3Y": null,
    "returnInception": -9.03,
    "managementFee": 1.7,
    "inceptionDate": "",
    "description": "Quỹ Cổ phiếu An Bình Thịnh Vượng (ABEF) là quỹ đầu tư cổ phiếu theo phương pháp quản lý chủ động, tập trung vào các xu hướng tăng trưởng dài hạn của nền kinh tế. Quỹ xây dựng danh mục đa dạng từ các cổ phiếu chất lượng cao, được lựa chọn thông qua kết hợp phân tích vĩ mô, định lượng và cơ bản, nhằm tối ưu hóa lợi nhuận và mang lại tăng trưởng vượt trội trong dài hạn.",
    "holdings": [
      {
        "symbol": "ABB",
        "name": "ABB",
        "industry": "Ngân hàng",
        "weight": 6.38
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 5.98
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 5.62
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.89
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.88
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.87
      },
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 4.72
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.38
      },
      {
        "symbol": "SSI",
        "name": "Chứng khoán SSI",
        "industry": "Chứng khoán",
        "weight": 4.31
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 3.96
      }
    ]
  },
  {
    "id": "lhfcf",
    "fmarketId": 93,
    "code": "LHFCF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU DÒNG TIỀN LINH HOẠT LIGHTHOUSE",
    "category": "bond",
    "issuer": "LIGHTHOUSE CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ LIGHTHOUSE",
    "nav": 10410.32,
    "navDate": "12/11/2026",
    "ytdReturn": 4.1,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 4.1,
    "managementFee": 0.9,
    "inceptionDate": "",
    "description": "Quỹ đầu tư vào các công cụ tài chính ngắn hạn có tính thanh khoản cao mang lại lợi nhuận ổn định và khả năng linh hoạt trong đầu tư ngắn hạn.",
    "holdings": [
      {
        "symbol": "SHB125010",
        "name": "SHB125010",
        "industry": "Ngân hàng",
        "weight": 18.99
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 18.93
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 18.84
      },
      {
        "symbol": "HDB125025",
        "name": "HDB125025",
        "industry": "Ngân hàng",
        "weight": 16.94
      },
      {
        "symbol": "CTG121031",
        "name": "CTG121031",
        "industry": "Ngân hàng",
        "weight": 15.37
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 5.65
      }
    ]
  },
  {
    "id": "gdegf",
    "fmarketId": 92,
    "code": "GDEGF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TĂNG TRƯỞNG RỒNG VÀNG",
    "category": "equity",
    "issuer": "HDCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ HD",
    "nav": 8209.19,
    "navDate": "12/11/2026",
    "ytdReturn": -10.12,
    "return1Y": -11.43,
    "return3Y": null,
    "returnInception": -17.91,
    "managementFee": 1.2,
    "inceptionDate": "30/06/2025",
    "description": "Quỹ Đầu tư Cổ phiếu Tăng trưởng Rồng Vàng (GDEGF) được Ủy ban Chứng khoán Nhà nước cấp giấy chứng nhận đăng ký thành lập ngày 22/07/2025. Quỹ hướng đến tối đa hóa lợi nhuận đầu tư và sự tăng trưởng đầu tư trong trung và dài hạn thông qua phân bổ tỷ trọng đa số vào các cổ phiếu của các công ty vốn hóa vừa và lớn, có tiềm năng tăng trưởng cao.",
    "holdings": [
      {
        "symbol": "PHP",
        "name": "PHP",
        "industry": "Vận tải - Kho bãi",
        "weight": 9.13
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 8.73
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 6.39
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.96
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.55
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.03
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 3.97
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.77
      },
      {
        "symbol": "TV2",
        "name": "TV2",
        "industry": "Dịch vụ tư vấn, hỗ trợ",
        "weight": 3.76
      },
      {
        "symbol": "DGW",
        "name": "Thế Giới Số (Digiworld)",
        "industry": "Bán buôn",
        "weight": 3.34
      }
    ]
  },
  {
    "id": "usif",
    "fmarketId": 91,
    "code": "USIF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU UNITED THU NHẬP ỔN ĐỊNH",
    "category": "bond",
    "issuer": "UOBAM VIETNAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ UOB ASSET MANAGEMENT (VIỆT NAM)",
    "nav": 10461.17,
    "navDate": "12/11/2026",
    "ytdReturn": 4.61,
    "return1Y": null,
    "return3Y": null,
    "returnInception": 4.61,
    "managementFee": 0.6,
    "inceptionDate": "",
    "description": "USIF là một quỹ đầu tư trái phiếu dạng mở, cung cấp chứng chỉ quỹ ra công chúng. Mục tiêu của quỹ là tìm kiếm nguồn thu nhập ổn định thường xuyên đồng thời bảo toàn vốn cho Nhà đầu tư thông qua việc xây dựng một danh mục đầu tư đa dạng gồm các loại tiền gửi, công cụ thị trường tiền tệ và trái phiếu doanh nghiệp có chất lượng tín dụng tốt. Quỹ cũng định hướng chi trả lợi tức hàng năm.",
    "holdings": [
      {
        "symbol": "HDB125012",
        "name": "HDB125012",
        "industry": "Ngân hàng",
        "weight": 14.23
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 8.85
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 8.85
      },
      {
        "symbol": "KBCL12601 bond",
        "name": "KBCL12601 bond",
        "industry": "Bất động sản",
        "weight": 8.85
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 7.4
      },
      {
        "symbol": "VND125033",
        "name": "VND125033",
        "industry": "Chứng khoán",
        "weight": 7.4
      },
      {
        "symbol": "NAB125004",
        "name": "NAB125004",
        "industry": "Ngân hàng",
        "weight": 7.38
      },
      {
        "symbol": "LPB121036",
        "name": "LPB121036",
        "industry": "Ngân hàng",
        "weight": 4.07
      },
      {
        "symbol": "BCM12403",
        "name": "BCM12403",
        "industry": "Bất động sản",
        "weight": 2.97
      },
      {
        "symbol": "TDP124010",
        "name": "TDP124010",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 1.78
      }
    ]
  },
  {
    "id": "ssi-ef",
    "fmarketId": 90,
    "code": "SSI-EF",
    "name": "QUỸ ĐẦU TƯ KIẾN TẠO TƯƠNG LAI SSI",
    "category": "balanced",
    "issuer": "SSIAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ SSI",
    "nav": 9446.71,
    "navDate": "12/11/2026",
    "ytdReturn": -3.88,
    "return1Y": -1.12,
    "return3Y": null,
    "returnInception": -5.53,
    "managementFee": 1.75,
    "inceptionDate": "",
    "description": "Quỹ đầu tư vào cổ phiếu của doanh nghiệp quản trị tốt, minh bạch, tài chính vững và tài sản có thu nhập cố định, hướng tới tăng trưởng tài sản ròng dài hạn.",
    "holdings": [
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 3.43
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 3.34
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 3.1
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 2.99
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 2.95
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 2.62
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 2.29
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 2.08
      },
      {
        "symbol": "BCM12406",
        "name": "BCM12406",
        "industry": "Bất động sản",
        "weight": 18.81
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 15.38
      }
    ]
  },
  {
    "id": "evesg",
    "fmarketId": 89,
    "code": "EVESG",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU ESG EASTSPRING INVESTMENTS VIỆT NAM",
    "category": "equity",
    "issuer": "EASTSPRING VIET NAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ EASTSPRING INVESTMENTS",
    "nav": 11950,
    "navDate": "12/11/2026",
    "ytdReturn": -2.15,
    "return1Y": 2.45,
    "return3Y": null,
    "returnInception": 19.5,
    "managementFee": 1.3,
    "inceptionDate": "27/09/2024",
    "description": "Mục tiêu đầu tư của Quỹ là mang lại lợi nhuận tối ưu cho Nhà Đầu Tư trong dài hạn thông qua một danh mục đầu tư đa dạng vào các công ty có triển vọng tăng trưởng bền vững với mô hình kinh doanh phù hợp và có nỗ lực cải thiện các vấn đề liên quan đến Môi trường, Xã hội và Quản trị doanh nghiệp (Environmental – Social – Governance; viết tắt là ESG). \nMỗi công ty trong danh mục đầu tư sẽ được đánh giá thẻ điểm ESG theo quy trình đầu tư của Eastspring Việt Nam.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 19.59
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 8.19
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 6.13
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.77
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.77
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 3.73
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 3.47
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.39
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 2.88
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 2.82
      }
    ]
  },
  {
    "id": "mbam",
    "fmarketId": 88,
    "code": "MBAM",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU DÒNG TIỀN LINH HOẠT MB",
    "category": "bond",
    "issuer": "MBCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ MB",
    "nav": 11453,
    "navDate": "12/11/2026",
    "ytdReturn": 3.66,
    "return1Y": 4.35,
    "return3Y": null,
    "returnInception": 14.53,
    "managementFee": 1.5,
    "inceptionDate": "11/04/2024",
    "description": "Là sản phẩm quỹ mở trái phiếu mang lại giải pháp đầu tư linh hoạt ở kỳ ngắn hạn, lợi nhuận ổn định và hấp dẫn cho nhà đầu tư.",
    "holdings": [
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 27.67
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 23.33
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 13.42
      },
      {
        "symbol": "DSE125004",
        "name": "DSE125004",
        "industry": "Chứng khoán",
        "weight": 0.2
      }
    ]
  },
  {
    "id": "bmff",
    "fmarketId": 87,
    "code": "BMFF",
    "name": "QUỸ ĐẦU TƯ TĂNG TRƯỞNG BORDIER - MB FLAGSHIP",
    "category": "equity",
    "issuer": "MBCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ MB",
    "nav": 15949,
    "navDate": "12/11/2026",
    "ytdReturn": 0.69,
    "return1Y": 1.01,
    "return3Y": 50.68,
    "returnInception": 59.49,
    "managementFee": 1.8,
    "inceptionDate": "03/01/2023",
    "description": "BMFF là sản phẩm quỹ mở cổ phiếu với mục tiêu đem lại tăng trưởng 15 – 20%/năm và quản trị rủi ro chặt chẽ chuyên nghiệp.",
    "holdings": [
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 11.98
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 8.38
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 6.13
      },
      {
        "symbol": "TPB",
        "name": "TPBank",
        "industry": "Ngân hàng",
        "weight": 5.01
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.94
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.77
      },
      {
        "symbol": "TCI",
        "name": "TCI",
        "industry": "Chứng khoán",
        "weight": 3.22
      },
      {
        "symbol": "QNS",
        "name": "Đường Quảng Ngãi",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.03
      },
      {
        "symbol": "DPR",
        "name": "DPR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 2.95
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 5.78
      }
    ]
  },
  {
    "id": "kdef",
    "fmarketId": 86,
    "code": "KDEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU CỔ TỨC TĂNG TRƯỞNG KIM",
    "category": "equity",
    "issuer": "KIM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ KIM VIỆT NAM",
    "nav": 11060.69,
    "navDate": "12/11/2026",
    "ytdReturn": -14.36,
    "return1Y": -10.32,
    "return3Y": null,
    "returnInception": 10.61,
    "managementFee": 1.7,
    "inceptionDate": "",
    "description": "KDEF là Quỹ mở cổ phiếu với mục tiêu đầu tư vào các công ty mang lại thu nhập cổ tức hấp dẫn và có tiềm năng tăng trưởng vốn mạnh mẽ trong dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 17.81
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 7.94
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.91
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.36
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.2
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.11
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 3.11
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.05
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 2.82
      },
      {
        "symbol": "STB",
        "name": "Sacombank",
        "industry": "Ngân hàng",
        "weight": 2.67
      }
    ]
  },
  {
    "id": "rvpif",
    "fmarketId": 83,
    "code": "RVPIF",
    "name": "QUỸ ĐẦU TƯ THỊNH VƯỢNG RỒNG VIỆT",
    "category": "equity",
    "issuer": "VDAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ RỒNG VIỆT",
    "nav": 9562.06,
    "navDate": "12/11/2026",
    "ytdReturn": -13.11,
    "return1Y": -13.77,
    "return3Y": null,
    "returnInception": -4.38,
    "managementFee": 1.5,
    "inceptionDate": "",
    "description": "Quỹ hướng tới việc tạo ra lợi nhuận dài hạn thông qua chiến lược đầu tư tập trung vào cổ phiếu niêm yết và các tài sản tài chính khác theo quy định.",
    "holdings": [
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 6.38
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.92
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 5.87
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.4
      },
      {
        "symbol": "KBC",
        "name": "Kinh Bắc",
        "industry": "Bất động sản",
        "weight": 4.99
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.88
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.48
      },
      {
        "symbol": "KDH",
        "name": "Nhà Khang Điền",
        "industry": "Bất động sản",
        "weight": 4.4
      },
      {
        "symbol": "GEL",
        "name": "GEL",
        "industry": "Vật liệu xây dựng",
        "weight": 3.47
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.09
      }
    ]
  },
  {
    "id": "vcbf-aif",
    "fmarketId": 82,
    "code": "VCBF-AIF",
    "name": "QUỸ ĐẦU TƯ THU NHẬP CHỦ ĐỘNG VCBF",
    "category": "equity",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 10553.29,
    "navDate": "12/11/2026",
    "ytdReturn": -8.35,
    "return1Y": -3.53,
    "return3Y": null,
    "returnInception": 5.53,
    "managementFee": 1.9,
    "inceptionDate": "",
    "description": "Mục tiêu đầu tư là tăng trưởng tài sản từ tăng giá cổ phiếu và thu nhập cổ tức nhưng tập trung chủ yếu vào gia tăng thu nhập cổ tức thông qua phân bổ tỷ trọng cao hơn vào cổ phiếu cổ tức cao.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 6.22
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 5.67
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 5.6
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.53
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.36
      },
      {
        "symbol": "BWE",
        "name": "BWE",
        "industry": "Tiện ích",
        "weight": 4.12
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.94
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 3.46
      },
      {
        "symbol": "TLG",
        "name": "TLG",
        "industry": "Sản xuất Phụ trợ",
        "weight": 3.28
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 3.15
      }
    ]
  },
  {
    "id": "enf",
    "fmarketId": 81,
    "code": "ENF",
    "name": "QUỸ ĐẦU TƯ NĂNG ĐỘNG EASTSPRING INVESTMENTS VIỆT NAM",
    "category": "balanced",
    "issuer": "EASTSPRING VIET NAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ EASTSPRING INVESTMENTS",
    "nav": 39838,
    "navDate": "12/11/2026",
    "ytdReturn": -4.36,
    "return1Y": -1.53,
    "return3Y": 30.21,
    "returnInception": 298.38,
    "managementFee": 1.5,
    "inceptionDate": "04/03/2014",
    "description": "Quỹ ENF hướng đến việc gia tăng một cách ổn định và bền vững vốn đầu tư thông qua đa dạng hóa các tài sản trong danh mục bao gồm cổ phiếu, trái phiếu và tiền gửi ngân hàng.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 8.62
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 6.07
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.74
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 3.48
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 3.04
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 2.39
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 2.1
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 2.1
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 2.04
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 1.95
      }
    ]
  },
  {
    "id": "vdef",
    "fmarketId": 80,
    "code": "VDEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU CƠ HỘI TIÊN PHONG VINACAPITAL",
    "category": "equity",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 11418.09,
    "navDate": "12/11/2026",
    "ytdReturn": -3.05,
    "return1Y": 0.46,
    "return3Y": null,
    "returnInception": 14.18,
    "managementFee": 1.75,
    "inceptionDate": "04/06/2024",
    "description": "Quỹ VDEF đầu tư vào cổ phiếu của những doanh nghiệp ít được thị trường chú ý và đang được định giá hấp dẫn. Thông qua chiến lược quản lý chủ động và xây dựng danh mục đầu tư một cách kỷ luật, Quỹ hướng tới mục tiêu đạt lợi nhuận vượt trội trong trung và dài hạn cho nhà đầu tư, đồng thời tối ưu hóa mối tương quan giữa lợi nhuận và rủi ro. Quỹ theo đuổi chiến lược đầu tư chủ động với mức độ tập trung cao, ưu tiên cổ phiếu vốn hóa vừa và nhỏ có mô hình kinh doanh khả năng mở rộng hoặc được kỳ vọng có bước đột phá, kèm theo các động lực đủ mạnh để mở ra dư địa định giá cao hơn, điều chỉnh tỷ trọng ngành nghề và cổ phiếu phù hợp với từng chu kỳ kinh tế dưới quy trình kiểm soát rủi ro kỷ luật.",
    "holdings": [
      {
        "symbol": "PHR",
        "name": "PHR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 6.57
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 6.19
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.04
      },
      {
        "symbol": "DPR",
        "name": "DPR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 5.02
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.92
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 4.9
      },
      {
        "symbol": "STB",
        "name": "Sacombank",
        "industry": "Ngân hàng",
        "weight": 4.87
      },
      {
        "symbol": "PVI",
        "name": "Bảo hiểm PVI",
        "industry": "Bảo hiểm",
        "weight": 4.77
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 4.71
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.69
      }
    ]
  },
  {
    "id": "tcgf",
    "fmarketId": 79,
    "code": "TCGF",
    "name": "QUỸ ĐẦU TƯ TĂNG TRƯỞNG THÀNH CÔNG",
    "category": "equity",
    "issuer": "TCAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ THÀNH CÔNG",
    "nav": 10672.57,
    "navDate": "12/11/2026",
    "ytdReturn": -11.19,
    "return1Y": -8.03,
    "return3Y": null,
    "returnInception": 6.73,
    "managementFee": 1.5,
    "inceptionDate": "01/01/1970",
    "description": "Quỹ TCGF đặt mục tiêu lợi nhuận dài hạn với chiến lược đầu tư linh hoạt vào cổ phiếu của DN đầu ngành, chủ chốt của nền kinh tế, phù hợp từng giai đoạn thị trường.",
    "holdings": [
      {
        "symbol": "GEX",
        "name": "GEX",
        "industry": "Thiết bị điện",
        "weight": 8.52
      },
      {
        "symbol": "HSG",
        "name": "Tập đoàn Hoa Sen",
        "industry": "Vật liệu xây dựng",
        "weight": 8.33
      },
      {
        "symbol": "DIG",
        "name": "DIC Corp",
        "industry": "Bất động sản",
        "weight": 7.33
      },
      {
        "symbol": "POW",
        "name": "PV Power",
        "industry": "Tiện ích",
        "weight": 7.03
      },
      {
        "symbol": "VIX",
        "name": "VIX",
        "industry": "Chứng khoán",
        "weight": 6.91
      },
      {
        "symbol": "VSC",
        "name": "VSC",
        "industry": "Vận tải - Kho bãi",
        "weight": 3.29
      },
      {
        "symbol": "TCX",
        "name": "TCX",
        "industry": "Chứng khoán",
        "weight": 0.53
      },
      {
        "symbol": "SHB",
        "name": "SHB",
        "industry": "Ngân hàng",
        "weight": 0.41
      }
    ]
  },
  {
    "id": "uvdif",
    "fmarketId": 78,
    "code": "UVDIF",
    "name": "QUỸ ĐẦU TƯ UNITED THU NHẬP NĂNG ĐỘNG VIỆT NAM",
    "category": "balanced",
    "issuer": "UOBAM VIETNAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ UOB ASSET MANAGEMENT (VIỆT NAM)",
    "nav": 10610.94,
    "navDate": "12/11/2026",
    "ytdReturn": -0.47,
    "return1Y": 2.29,
    "return3Y": null,
    "returnInception": 10.11,
    "managementFee": 1.5,
    "inceptionDate": "01/01/1970",
    "description": "Mục tiêu đầu tư của Quỹ là tìm kiếm đồng thời nguồn thu nhập đều đặn định kỳ và tăng trưởng về vốn gốc trong dài hạn thông qua việc xây dựng một danh mục đầu tư đa dạng gồm các tài sản có thu nhập cố định và cổ phiếu chất lượng cao. Quỹ cũng hướng đến mục tiêu chi trả lợi tức mỗi năm.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 6.15
      },
      {
        "symbol": "HDB125012",
        "name": "HDB125012",
        "industry": "Ngân hàng",
        "weight": 9.22
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 8.37
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 8.24
      },
      {
        "symbol": "TDP124010",
        "name": "TDP124010",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 7.69
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 5.23
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 3.92
      },
      {
        "symbol": "VND125033",
        "name": "VND125033",
        "industry": "Chứng khoán",
        "weight": 3.92
      },
      {
        "symbol": "NAB125004",
        "name": "NAB125004",
        "industry": "Ngân hàng",
        "weight": 3.91
      },
      {
        "symbol": "SHB125010",
        "name": "SHB125010",
        "industry": "Ngân hàng",
        "weight": 3.87
      }
    ]
  },
  {
    "id": "mdi",
    "fmarketId": 77,
    "code": "MDI",
    "name": "QUỸ ĐẦU TƯ NĂNG ĐỘNG MANULIFE",
    "category": "balanced",
    "issuer": "MANULIFE INVESTMENTS",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MANULIFE INVESTMENT (VIỆT NAM)",
    "nav": 11583,
    "navDate": "12/11/2026",
    "ytdReturn": -5.13,
    "return1Y": -2.8,
    "return3Y": null,
    "returnInception": 15.83,
    "managementFee": 1.75,
    "inceptionDate": "30/11/2023",
    "description": "Quỹ MDI quản lý bởi Manulife Investments Việt Nam đầu tư vào cổ phiếu, chứng khoán thu nhập cố định và chủ động điều chỉnh tỷ lệ đầu tư tài sản nhằm cân bằng rủi ro, lợi nhuận đầu tư trung, dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 7
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.38
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 3.59
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 2.42
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 2.4
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 2.13
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 1.91
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 1.83
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 1.79
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 1.76
      }
    ]
  },
  {
    "id": "lhcdf",
    "fmarketId": 76,
    "code": "LHCDF",
    "name": "QUỸ ĐẦU TƯ NĂNG ĐỘNG LIGHTHOUSE",
    "category": "equity",
    "issuer": "LIGHTHOUSE CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ LIGHTHOUSE",
    "nav": 10903.16,
    "navDate": "12/11/2026",
    "ytdReturn": -5.89,
    "return1Y": -8.1,
    "return3Y": null,
    "returnInception": 9.03,
    "managementFee": 1.5,
    "inceptionDate": "01/01/1970",
    "description": "Quỹ LHCDF đầu tư linh hoạt và chọn lọc vào những cổ phiếu có nền tảng và tiềm năng tăng trưởng tốt nhằm gia tăng giá trị trong trung và dài hạn.",
    "holdings": [
      {
        "symbol": "NAB",
        "name": "NAB",
        "industry": "Ngân hàng",
        "weight": 18.04
      },
      {
        "symbol": "DBD",
        "name": "DBD",
        "industry": "Chăm sóc sức khỏe",
        "weight": 10.59
      },
      {
        "symbol": "KDH",
        "name": "Nhà Khang Điền",
        "industry": "Bất động sản",
        "weight": 5.11
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.8
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.66
      },
      {
        "symbol": "NTP",
        "name": "Nhựa Tiền Phong",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 4.65
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.25
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.02
      },
      {
        "symbol": "VIX",
        "name": "VIX",
        "industry": "Chứng khoán",
        "weight": 3.73
      },
      {
        "symbol": "TDP124010",
        "name": "TDP124010",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 5.58
      }
    ]
  },
  {
    "id": "vcamdf",
    "fmarketId": 75,
    "code": "VCAMDF",
    "name": "QUỸ ĐẦU TƯ BẢN VIỆT DISCOVERY",
    "category": "equity",
    "issuer": "VCAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN BẢN VIỆT",
    "nav": 10028.94,
    "navDate": "12/11/2026",
    "ytdReturn": -8.83,
    "return1Y": -10.72,
    "return3Y": null,
    "returnInception": 0.29,
    "managementFee": 1.5,
    "inceptionDate": "01/01/1970",
    "description": "Quỹ tập trung cổ phiếu vốn hóa vừa và nhỏ, có lợi thế cạnh tranh, nền tảng tài chính tốt, định giá chưa phản ánh đúng giá trị và tiềm năng tăng trưởng dài hạn.",
    "holdings": [
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 8.96
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 5.89
      },
      {
        "symbol": "TLG",
        "name": "TLG",
        "industry": "Sản xuất Phụ trợ",
        "weight": 5.4
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 4.49
      },
      {
        "symbol": "IDC",
        "name": "Tổng Công ty IDICO",
        "industry": "Tiện ích",
        "weight": 4.45
      },
      {
        "symbol": "NTP",
        "name": "Nhựa Tiền Phong",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 4.31
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.16
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 4.01
      },
      {
        "symbol": "BVB",
        "name": "BVB",
        "industry": "Ngân hàng",
        "weight": 4.01
      },
      {
        "symbol": "PHR",
        "name": "PHR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 4
      }
    ]
  },
  {
    "id": "mafeqi",
    "fmarketId": 72,
    "code": "MAFEQI",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU MANULIFE",
    "category": "equity",
    "issuer": "MANULIFE INVESTMENTS",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MANULIFE INVESTMENT (VIỆT NAM)",
    "nav": 19021,
    "navDate": "12/11/2026",
    "ytdReturn": -9.41,
    "return1Y": -4,
    "return3Y": 29.98,
    "returnInception": 90.21,
    "managementFee": 1.75,
    "inceptionDate": "01/10/2014",
    "description": "Quỹ MAFEQI quản lý bởi Manulife Investments Việt Nam đầu tư đa dạng có chọn lọc vào 20-50 cổ phiếu các doanh nghiệp hàng đầu Việt Nam với mục tiêu gia tăng giá trị đầu tư trung, dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 15.55
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 8.58
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.11
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 4.73
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.71
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.66
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.72
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 3.67
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 3.44
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.29
      }
    ]
  },
  {
    "id": "mafbal",
    "fmarketId": 71,
    "code": "MAFBAL",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG MANULIFE",
    "category": "balanced",
    "issuer": "MANULIFE INVESTMENTS",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MANULIFE INVESTMENT (VIỆT NAM)",
    "nav": 17404,
    "navDate": "12/11/2026",
    "ytdReturn": -3.19,
    "return1Y": -0.92,
    "return3Y": 23.79,
    "returnInception": 74.04,
    "managementFee": 1.2,
    "inceptionDate": "29/09/2017",
    "description": "Quỹ MAFBAL quản lý bởi Manulife Investments Việt Nam phân bổ đầu tư cân bằng vào cổ phiếu và chứng khoán thu nhập cố định với mục tiêu cân bằng rủi ro & lợi nhuận đầu tư trung, dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 5.58
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 3.64
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 2.46
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 2.25
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 2.04
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 1.99
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.56
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 4.03
      },
      {
        "symbol": "VIC124005",
        "name": "VIC124005",
        "industry": "Bất động sản",
        "weight": 3.83
      },
      {
        "symbol": "TCXC12602",
        "name": "TCXC12602",
        "industry": "Chứng khoán",
        "weight": 3.13
      }
    ]
  },
  {
    "id": "vcambf",
    "fmarketId": 70,
    "code": "VCAMBF",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG BẢN VIỆT",
    "category": "balanced",
    "issuer": "VCAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN BẢN VIỆT",
    "nav": 20737.45,
    "navDate": "12/11/2026",
    "ytdReturn": -5.15,
    "return1Y": -2.99,
    "return3Y": 30.62,
    "returnInception": 107.37,
    "managementFee": 1.2,
    "inceptionDate": "11/04/2014",
    "description": "VCAMBF tuân theo chiến lược phân bổ tài sản chủ động với tỷ lệ 50% - 70% dành cho cổ phiếu niêm yết và phần còn lại dành cho tài sản có thu nhập cố định.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.8
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 2.97
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 2.75
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 2.65
      },
      {
        "symbol": "STB",
        "name": "Sacombank",
        "industry": "Ngân hàng",
        "weight": 2.6
      },
      {
        "symbol": "ABB",
        "name": "ABB",
        "industry": "Ngân hàng",
        "weight": 2.59
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 2.58
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 2.52
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 2.03
      },
      {
        "symbol": "HAH",
        "name": "Vận tải Hải An",
        "industry": "Vận tải - Kho bãi",
        "weight": 1.95
      }
    ]
  },
  {
    "id": "lpbf",
    "fmarketId": 69,
    "code": "LPBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU LP",
    "category": "bond",
    "issuer": "LPBA",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ LPB",
    "nav": 10964.49,
    "navDate": "12/11/2026",
    "ytdReturn": 6.5,
    "return1Y": 7.21,
    "return3Y": null,
    "returnInception": 9.83,
    "managementFee": 1.2,
    "inceptionDate": "01/01/1970",
    "description": "Quỹ Đầu tư Trái phiếu LP (LPBF) hướng tới mục tiêu mang lại lợi nhuận ổn định, hấp dẫn và bền vững cho Nhà đầu tư thông qua việc đầu tư vào danh mục trái phiếu niêm yết của các doanh nghiệp hàng đầu, chứng chỉ tiền gửi của các tổ chức phát hành uy tín và các tài sản có thu nhập cố định khác. Quỹ LPBF phù hợp với nhà đầu tư tìm kiếm giải pháp tích lũy an toàn, ổn định và linh hoạt, hướng đến tăng trưởng tài sản bền vững.",
    "holdings": [
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 17.87
      },
      {
        "symbol": "LPB125007",
        "name": "LPB125007",
        "industry": "Ngân hàng",
        "weight": 17.52
      },
      {
        "symbol": "HDB125012",
        "name": "HDB125012",
        "industry": "Ngân hàng",
        "weight": 17
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 15.42
      },
      {
        "symbol": "VIC124003",
        "name": "VIC124003",
        "industry": "Bất động sản",
        "weight": 9.04
      },
      {
        "symbol": "KBC12601",
        "name": "KBC12601",
        "industry": "Bất động sản",
        "weight": 8.91
      },
      {
        "symbol": "VIC124005",
        "name": "VIC124005",
        "industry": "Bất động sản",
        "weight": 8.68
      },
      {
        "symbol": "VSCL12601",
        "name": "VSCL12601",
        "industry": "Vận tải - Kho bãi",
        "weight": 2.05
      }
    ]
  },
  {
    "id": "vndcf",
    "fmarketId": 40,
    "code": "VNDCF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU LINH HOẠT VND",
    "category": "bond",
    "issuer": "IPA PARTNER",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ IPA PARTNER",
    "nav": 11976.6,
    "navDate": "12/11/2026",
    "ytdReturn": 5.11,
    "return1Y": 5.83,
    "return3Y": 17.79,
    "returnInception": 19.77,
    "managementFee": 0.9,
    "inceptionDate": "04/08/2023",
    "description": "Quỹ VNDCF giúp tối ưu lợi nhuận cho nguồn tiền nhàn rỗi ngắn hạn của Nhà đầu tư, phù hợp với dòng tiền đầu tư dưới 06 tháng.",
    "holdings": [
      {
        "symbol": "CVT122009",
        "name": "CVT122009",
        "industry": "Vật liệu xây dựng",
        "weight": 16.32
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 7.24
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 5.69
      },
      {
        "symbol": "VBA121033",
        "name": "VBA121033",
        "industry": "Ngân hàng",
        "weight": 3.2
      }
    ]
  },
  {
    "id": "vmeef",
    "fmarketId": 68,
    "code": "VMEEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU KINH TẾ HIỆN ĐẠI VINACAPITAL",
    "category": "equity",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 15129.58,
    "navDate": "12/11/2026",
    "ytdReturn": -7.5,
    "return1Y": -6.29,
    "return3Y": 38.38,
    "returnInception": 51.3,
    "managementFee": 1.75,
    "inceptionDate": "11/04/2023",
    "description": "Quỹ VMEEF đầu tư vào cổ phiếu của những doanh nghiệp có triển vọng tốt về tăng trưởng doanh thu và lợi nhuận trong dài hạn, gắn liền với các động lực phát triển kinh tế hiện đại của Việt Nam. Thông qua chiến lược quản lý chủ động và xây dựng danh mục đầu tư một cách kỷ luật, Quỹ hướng tới mục tiêu mang lại lợi nhuận vượt trội trong trung và dài hạn cho nhà đầu tư, đồng thời tối ưu hóa mối tương quan giữa lợi nhuận và rủi ro. Quỹ áp dụng cách tiếp cận chủ động để xây dựng danh mục đón đầu các động lực tăng trưởng cốt lõi như đô thị hóa, sự bùng nổ của tầng lớp trung lưu và số hóa, tập trung vào các doanh nghiệp cung cấp giải pháp trong lĩnh vực dịch vụ tài chính, bán lẻ hiện đại, bất động sản đô thị và giải pháp ứng dụng công nghệ tại vùng định giá hợp lý, điều chỉnh tỷ trọng ngành nghề và cổ phiếu phù hợp với từng chu kỳ kinh tế dưới quy trình kiểm soát rủi ro kỷ luật.",
    "holdings": [
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 8.56
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 7.53
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 7.01
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 6.67
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 4.73
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.64
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.62
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 4.08
      },
      {
        "symbol": "REE",
        "name": "Cơ Điện Lạnh",
        "industry": "Thiết bị điện",
        "weight": 3.93
      },
      {
        "symbol": "NLG",
        "name": "Nam Long",
        "industry": "Bất động sản",
        "weight": 3.61
      }
    ]
  },
  {
    "id": "dcip",
    "fmarketId": 67,
    "code": "DCIP",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU GIA TĂNG THU NHẬP CỐ ĐỊNH DC",
    "category": "bond",
    "issuer": "DCVFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ DRAGON CAPITAL VIỆT NAM",
    "nav": 12511.65,
    "navDate": "12/11/2026",
    "ytdReturn": 5.48,
    "return1Y": 6.34,
    "return3Y": 18.64,
    "returnInception": 25.12,
    "managementFee": 1.2,
    "inceptionDate": "24/05/2021",
    "description": "DCIP – Quỹ đầu tư trái phiếu gia tăng thu nhập cố định DC là quỹ mở được thiết kế đặc biệt cho các nhu cầu đầu tư ngắn hạn (dưới 6 tháng) thông qua một danh mục đầu tư đa dạng hóa, bao gồm các tài sản có tính phòng vệ như trái phiếu, chứng chỉ tiền gửi.",
    "holdings": [
      {
        "symbol": "VPI124001",
        "name": "VPI124001",
        "industry": "Bất động sản",
        "weight": 11.73
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 8.63
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 8.59
      },
      {
        "symbol": "CIIL12601",
        "name": "CIIL12601",
        "industry": "Xây dựng",
        "weight": 8.56
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 6.89
      },
      {
        "symbol": "SHSL12603",
        "name": "SHSL12603",
        "industry": "Chứng khoán",
        "weight": 3.43
      },
      {
        "symbol": "VHM12612",
        "name": "VHM12612",
        "industry": "Bất động sản",
        "weight": 0.86
      },
      {
        "symbol": "VND125032",
        "name": "VND125032",
        "industry": "Chứng khoán",
        "weight": 0.85
      }
    ]
  },
  {
    "id": "phvsf",
    "fmarketId": 66,
    "code": "PHVSF",
    "name": "QUỸ ĐẦU TƯ CHỌN LỌC PHÚ HƯNG VIỆT NAM",
    "category": "equity",
    "issuer": "PHFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ PHÚ HƯNG",
    "nav": 12317.34,
    "navDate": "12/11/2026",
    "ytdReturn": -8.35,
    "return1Y": -6.5,
    "return3Y": 19.59,
    "returnInception": 23.17,
    "managementFee": 1.5,
    "inceptionDate": "21/11/2022",
    "description": "Quỹ PHVSF đầu tư vào các loại chứng khoán niêm yết tại Việt Nam. Quỹ áp dụng nguyên tắc đầu tư thận trọng với chiến lược đầu tư giá trị nhằm đạt mục tiêu gia tăng ổn định giá trị tài sản cho Nhà đầu tư trong trung và dài hạn.",
    "holdings": [
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 5.02
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 4.6
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.3
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.24
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.18
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.02
      },
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.01
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.95
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 3.71
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 3.67
      }
    ]
  },
  {
    "id": "abbf",
    "fmarketId": 65,
    "code": "ABBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU AN BÌNH",
    "category": "bond",
    "issuer": "ABF",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN AN BÌNH",
    "nav": 14831.57,
    "navDate": "12/11/2026",
    "ytdReturn": 6.6,
    "return1Y": 7.48,
    "return3Y": 20.52,
    "returnInception": 48.32,
    "managementFee": 0.525,
    "inceptionDate": "03/11/2020",
    "description": "Quỹ trái phiếu có quy mô lớn nhất nền tảng Fmarket năm 2024 với chiến lược tăng trưởng lợi nhuận ổn định đề cao sự an toàn, đạt giải quốc tế \"Nhà đầu tư Trái phiếu tốt nhất VN\" của Asia Asset Management.",
    "holdings": [
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 20.5
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 18.63
      },
      {
        "symbol": "TNG124027",
        "name": "TNG124027",
        "industry": "Sản xuất Hàng gia dụng",
        "weight": 9.59
      },
      {
        "symbol": "VIC124003",
        "name": "VIC124003",
        "industry": "Bất động sản",
        "weight": 6.53
      },
      {
        "symbol": "VIC124005",
        "name": "VIC124005",
        "industry": "Bất động sản",
        "weight": 5.39
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 5.18
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 3.69
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 0.19
      },
      {
        "symbol": "CTG121031",
        "name": "CTG121031",
        "industry": "Ngân hàng",
        "weight": 0.16
      }
    ]
  },
  {
    "id": "lhbf",
    "fmarketId": 64,
    "code": "LHBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU LIGHTHOUSE",
    "category": "bond",
    "issuer": "LIGHTHOUSE CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ LIGHTHOUSE",
    "nav": 15456.38,
    "navDate": "12/11/2026",
    "ytdReturn": 5.47,
    "return1Y": 6.05,
    "return3Y": 27.08,
    "returnInception": 54.56,
    "managementFee": 1,
    "inceptionDate": "29/12/2022",
    "description": "Quỹ LHBF tập trung vào các tài sản có thu nhập cố định có chất lượng tốt. Quỹ có mức rủi ro thấp, phù hợp cho mục đích đầu tư trung và dài hạn.",
    "holdings": [
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 13.09
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 10.91
      },
      {
        "symbol": "CII425021",
        "name": "CII425021",
        "industry": "Xây dựng",
        "weight": 7.84
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 7.64
      },
      {
        "symbol": "CTG123019",
        "name": "CTG123019",
        "industry": "Ngân hàng",
        "weight": 7.14
      },
      {
        "symbol": "DSE125004",
        "name": "DSE125004",
        "industry": "Chứng khoán",
        "weight": 6.07
      },
      {
        "symbol": "CTD126006",
        "name": "CTD126006",
        "industry": "Xây dựng",
        "weight": 5.46
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 5.46
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 5.46
      },
      {
        "symbol": "TNG124027",
        "name": "TNG124027",
        "industry": "Sản xuất Hàng gia dụng",
        "weight": 4.92
      }
    ]
  },
  {
    "id": "vcamfi",
    "fmarketId": 63,
    "code": "VCAMFI",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU BẢN VIỆT",
    "category": "bond",
    "issuer": "VCAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN BẢN VIỆT",
    "nav": 12641.19,
    "navDate": "12/11/2026",
    "ytdReturn": 3.83,
    "return1Y": 4.34,
    "return3Y": 17.85,
    "returnInception": 26.41,
    "managementFee": 1,
    "inceptionDate": "22/09/2022",
    "description": "Mục tiêu đầu tư của Quỹ là mang lại lợi nhuận dài hạn bằng cách đầu tư chủ yếu vào trái phiếu, công cụ thị trường tiền tệ, tiền gửi có kỳ hạn và các công cụ có thu nhập cố định khác.",
    "holdings": [
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.5
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 2.41
      },
      {
        "symbol": "VBA121033",
        "name": "VBA121033",
        "industry": "Ngân hàng",
        "weight": 2.38
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 1.99
      },
      {
        "symbol": "CTG121031",
        "name": "CTG121031",
        "industry": "Ngân hàng",
        "weight": 1.5
      },
      {
        "symbol": "LPB121036",
        "name": "LPB121036",
        "industry": "Ngân hàng",
        "weight": 1.5
      },
      {
        "symbol": "VBA123036",
        "name": "VBA123036",
        "industry": "Ngân hàng",
        "weight": 1.5
      }
    ]
  },
  {
    "id": "hdbond",
    "fmarketId": 62,
    "code": "HDBOND",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU LỢI TỨC CAO HD",
    "category": "bond",
    "issuer": "HDCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ HD",
    "nav": 12243.96,
    "navDate": "12/11/2026",
    "ytdReturn": -0.35,
    "return1Y": 3.04,
    "return3Y": 13.62,
    "returnInception": 22.44,
    "managementFee": 0.95,
    "inceptionDate": "30/12/2022",
    "description": "Quỹ HDBOND đầu tư tập trung vào các tài sản có thu nhập cố định như Trái phiếu doanh nghiệp niêm yết, chứng chỉ tiền gửi có lợi suất cao nhằm tối đa hóa lợi nhuận trong dài hạn. Quản lý chủ động, hướng tới mục tiêu gia tăng tài sản ổn định cho khách hàng.",
    "holdings": [
      {
        "symbol": "HSG",
        "name": "Tập đoàn Hoa Sen",
        "industry": "Vật liệu xây dựng",
        "weight": 3.23
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 2.67
      },
      {
        "symbol": "MBS",
        "name": "Chứng khoán MB",
        "industry": "Chứng khoán",
        "weight": 1.91
      },
      {
        "symbol": "SSI",
        "name": "Chứng khoán SSI",
        "industry": "Chứng khoán",
        "weight": 1.03
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 16.8
      },
      {
        "symbol": "TDP124010",
        "name": "TDP124010",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 16.67
      },
      {
        "symbol": "CII425021",
        "name": "CII425021",
        "industry": "Xây dựng",
        "weight": 13.64
      },
      {
        "symbol": "TNG124027",
        "name": "TNG124027",
        "industry": "Sản xuất Hàng gia dụng",
        "weight": 12.76
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 9.36
      },
      {
        "symbol": "CII425002",
        "name": "CII425002",
        "industry": "Xây dựng",
        "weight": 3.04
      }
    ]
  },
  {
    "id": "pfgf",
    "fmarketId": 61,
    "code": "PFGF",
    "name": "QUỸ ĐẦU TƯ TĂNG TRƯỞNG LINH HOẠT PVCOM",
    "category": "balanced",
    "issuer": "PVCB CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ NGÂN HÀNG TMCP ĐẠI CHÚNG VIỆT NAM",
    "nav": 5977.2,
    "navDate": "12/11/2026",
    "ytdReturn": -41.16,
    "return1Y": -32.17,
    "return3Y": -42.13,
    "returnInception": -40.23,
    "managementFee": 1.3,
    "inceptionDate": "01/01/1970",
    "description": "Quỹ xây dựng một danh mục kết hợp tối ưu và linh hoạt giữa cổ phiếu, tập trung vào các cổ phiếu của doanh nghiệp có vốn hóa lớn, thanh khoản cao trên thị trường chứng khoán và các tài sản có thu nhập cố định nhằm tối đa hóa lợi nhuận cho nhà đầu tư.",
    "holdings": [
      {
        "symbol": "VND",
        "name": "Chứng khoán VNDIRECT",
        "industry": "Chứng khoán",
        "weight": 3.03
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 2.26
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 2.07
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 0.01
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 10.97
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 8.92
      }
    ]
  },
  {
    "id": "uveef",
    "fmarketId": 58,
    "code": "UVEEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU UNITED ESG VIỆT NAM",
    "category": "equity",
    "issuer": "UOBAM VIETNAM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ UOB ASSET MANAGEMENT (VIỆT NAM)",
    "nav": 16105.21,
    "navDate": "12/11/2026",
    "ytdReturn": -12.14,
    "return1Y": -5.55,
    "return3Y": 33.54,
    "returnInception": 61.05,
    "managementFee": 1.75,
    "inceptionDate": "30/09/2022",
    "description": "Quỹ UVEEF đầu tư vào cổ phiếu niêm yết có nền tảng cơ bản tốt, đạt tiêu chuẩn cao các chuẩn mực ESG và có triển vọng tăng trưởng bền vững trong dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 18.85
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.54
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.67
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 4.53
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.51
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.42
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.06
      },
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 3.71
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 3.71
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 3.37
      }
    ]
  },
  {
    "id": "vlbf",
    "fmarketId": 53,
    "code": "VLBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU THANH KHOẢN VINACAPITAL",
    "category": "bond",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 12871.2,
    "navDate": "12/11/2026",
    "ytdReturn": 4.71,
    "return1Y": 5.58,
    "return3Y": 15.06,
    "returnInception": 28.71,
    "managementFee": 0.9,
    "inceptionDate": "13/08/2021",
    "description": "Quỹ tối ưu lợi nhuận bằng cách đầu tư vào tài sản có thu nhập cố định tốt, thanh khoản linh hoạt, phù hợp với nhà đầu tư có mục đích đầu tư ngắn hoặc trung hạn.",
    "holdings": [
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 15.52
      },
      {
        "symbol": "VHM12612",
        "name": "VHM12612",
        "industry": "Bất động sản",
        "weight": 8.83
      },
      {
        "symbol": "HDC12501",
        "name": "HDC12501",
        "industry": "Bất động sản",
        "weight": 6.62
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 0.67
      }
    ]
  },
  {
    "id": "ntppf",
    "fmarketId": 52,
    "code": "NTPPF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TRIỂN VỌNG NTP",
    "category": "equity",
    "issuer": "NTP AM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ NTP",
    "nav": 9628.06,
    "navDate": "12/11/2026",
    "ytdReturn": -10.88,
    "return1Y": -9.94,
    "return3Y": -2.75,
    "returnInception": -3.72,
    "managementFee": 1.75,
    "inceptionDate": "12/06/2022",
    "description": "Quỹ áp dụng chiến lược đầu tư chủ động, phần lớn tài sản sẽ được phân bổ vào những doanh nghiệp vốn hóa lớn trên thị trường, mang tính tiêu biểu.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 12.3
      },
      {
        "symbol": "HCM",
        "name": "Chứng khoán HSC",
        "industry": "Chứng khoán",
        "weight": 7.6
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 5.2
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.9
      },
      {
        "symbol": "STB",
        "name": "Sacombank",
        "industry": "Ngân hàng",
        "weight": 4.8
      },
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 4.6
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.5
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 4.4
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.4
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.3
      }
    ]
  },
  {
    "id": "asbf",
    "fmarketId": 51,
    "code": "ASBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU AN TOÀN AMBER",
    "category": "bond",
    "issuer": "AMBER CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ AMBER",
    "nav": 13358.58,
    "navDate": "12/11/2026",
    "ytdReturn": 5.95,
    "return1Y": 6.67,
    "return3Y": 18.42,
    "returnInception": 33.59,
    "managementFee": 0.85,
    "inceptionDate": "25/05/2021",
    "description": "ASBF là quỹ đầu tư trái phiếu siêu an toàn trên thị trường với mục tiêu tối ưu hóa lợi nhuận và đảm bảo an toàn cho vốn ngay cả khi thị trường nhiều biến động.",
    "holdings": [
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 9.02
      }
    ]
  },
  {
    "id": "maff",
    "fmarketId": 50,
    "code": "MAFF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU LINH HOẠT MIRAE ASSET VIỆT NAM",
    "category": "bond",
    "issuer": "MIRAE ASSET",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MIREA ASSET VIỆT NAM",
    "nav": 14130.84,
    "navDate": "12/11/2026",
    "ytdReturn": 6.22,
    "return1Y": 6.93,
    "return3Y": 23.07,
    "returnInception": 41.31,
    "managementFee": 0.8,
    "inceptionDate": "17/12/2021",
    "description": "Mục tiêu của Quỹ là tạo ra lợi nhuận hấp dẫn, cạnh tranh hơn sản phẩm thu nhập cố định khác trên cơ sở linh hoạt kết hợp các nhóm sản phẩm có lợi suất hấp dẫn.",
    "holdings": [
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 11.44
      },
      {
        "symbol": "BVB125003",
        "name": "BVB125003",
        "industry": "Ngân hàng",
        "weight": 11.07
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 7.45
      },
      {
        "symbol": "LPB121036",
        "name": "LPB121036",
        "industry": "Ngân hàng",
        "weight": 6.49
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 5.95
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.87
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.03
      },
      {
        "symbol": "LPB122011",
        "name": "LPB122011",
        "industry": "Ngân hàng",
        "weight": 2.98
      },
      {
        "symbol": "LPB125027",
        "name": "LPB125027",
        "industry": "Ngân hàng",
        "weight": 2.71
      },
      {
        "symbol": "VBA123036",
        "name": "VBA123036",
        "industry": "Ngân hàng",
        "weight": 1.77
      }
    ]
  },
  {
    "id": "vlgf",
    "fmarketId": 49,
    "code": "VLGF",
    "name": "QUỸ ĐẦU TƯ TĂNG TRƯỞNG DÀI HẠN VIỆT NAM",
    "category": "equity",
    "issuer": "SSIAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ SSI",
    "nav": 11727.52,
    "navDate": "12/11/2026",
    "ytdReturn": -12.45,
    "return1Y": -10.59,
    "return3Y": 25.95,
    "returnInception": 17.28,
    "managementFee": 1.5,
    "inceptionDate": "16/11/2021",
    "description": "Quỹ đầu tư tập trung vào các cổ phiếu chất lượng cao của các công ty có quản trị tốt, có vị thế hàng đầu trong ngành, có triển vọng tăng trưởng dài hạn.",
    "holdings": [
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 14.8
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 7.77
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 7.47
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 7.3
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 4.83
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 4.68
      },
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 4.61
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.37
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.21
      },
      {
        "symbol": "DGW",
        "name": "Thế Giới Số (Digiworld)",
        "industry": "Bán buôn",
        "weight": 3.91
      }
    ]
  },
  {
    "id": "mbvf",
    "fmarketId": 47,
    "code": "MBVF",
    "name": "QUỸ ĐẦU TƯ GIÁ TRỊ MB CAPITAL",
    "category": "equity",
    "issuer": "MBCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ MB",
    "nav": 26777,
    "navDate": "12/11/2026",
    "ytdReturn": -0.4,
    "return1Y": -0.06,
    "return3Y": 49.29,
    "returnInception": 167.77,
    "managementFee": 1.5,
    "inceptionDate": "25/04/2014",
    "description": "Quỹ đầu tư trung và dài hạn vào các cổ phiếu được định giá rẻ so với lợi nhuận hoặc tài sản, nhằm tối ưu hóa hiệu quả đầu tư.",
    "holdings": [
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 12.21
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 10.63
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 5.34
      },
      {
        "symbol": "TPB",
        "name": "TPBank",
        "industry": "Ngân hàng",
        "weight": 5.22
      },
      {
        "symbol": "QTP",
        "name": "QTP",
        "industry": "Tiện ích",
        "weight": 4
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.75
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.71
      },
      {
        "symbol": "TCI",
        "name": "TCI",
        "industry": "Chứng khoán",
        "weight": 3.33
      },
      {
        "symbol": "DPR",
        "name": "DPR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 3.28
      },
      {
        "symbol": "QNS",
        "name": "Đường Quảng Ngãi",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.1
      }
    ]
  },
  {
    "id": "mbbond",
    "fmarketId": 48,
    "code": "MBBOND",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU MB",
    "category": "bond",
    "issuer": "MBCAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ MB",
    "nav": 17268,
    "navDate": "12/11/2026",
    "ytdReturn": 5.95,
    "return1Y": 6.88,
    "return3Y": 24.42,
    "returnInception": 72.68,
    "managementFee": 1.2,
    "inceptionDate": "26/03/2018",
    "description": "Quỹ MBBOND đầu tư vào các loại trái phiếu, các công cụ có thu nhập cố định mang đến cho Nhà đầu tư nguồn thu nhập hấp dẫn, ổn định và an toàn.",
    "holdings": [
      {
        "symbol": "NVL122001",
        "name": "NVL122001",
        "industry": "Bất động sản",
        "weight": 64.79
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 5.41
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 1.31
      }
    ]
  },
  {
    "id": "vcbf-mgf",
    "fmarketId": 46,
    "code": "VCBF-MGF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TĂNG TRƯỞNG VCBF",
    "category": "equity",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 13004.95,
    "navDate": "12/11/2026",
    "ytdReturn": -9.19,
    "return1Y": -6.18,
    "return3Y": 26.08,
    "returnInception": 30.05,
    "managementFee": 1.9,
    "inceptionDate": "29/10/2021",
    "description": "VCBF-MGF là quỹ mở cổ phiếu với mục tiêu đầu tư chính của Quỹ là tăng trưởng tài sản đầu tư trong trung và dài hạn.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 8.73
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 6.05
      },
      {
        "symbol": "DGW",
        "name": "Thế Giới Số (Digiworld)",
        "industry": "Bán buôn",
        "weight": 5.89
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.42
      },
      {
        "symbol": "BWE",
        "name": "BWE",
        "industry": "Tiện ích",
        "weight": 5.29
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 5.07
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 4.68
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 4.56
      },
      {
        "symbol": "PVS",
        "name": "Dịch vụ Kỹ thuật Dầu khí",
        "industry": "Khai khoáng",
        "weight": 3.69
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 3.59
      }
    ]
  },
  {
    "id": "pvbf",
    "fmarketId": 45,
    "code": "PVBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU PVCOM",
    "category": "bond",
    "issuer": "PVCB CAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ NGÂN HÀNG TMCP ĐẠI CHÚNG VIỆT NAM",
    "nav": 15739.92,
    "navDate": "12/11/2026",
    "ytdReturn": 3.86,
    "return1Y": -3.99,
    "return3Y": 18.92,
    "returnInception": 57.4,
    "managementFee": 0.5,
    "inceptionDate": "07/02/2020",
    "description": "Quỹ đầu tư chủ yếu vào trái phiếu Chính phủ, trái phiếu doanh nghiệp hàng đầu nhằm mang lại lợi nhuận kỳ vọng bền vững và độ an toàn cao.",
    "holdings": [
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 18.33
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 18.14
      },
      {
        "symbol": "KBCL12601",
        "name": "KBCL12601",
        "industry": "Bất động sản",
        "weight": 13.96
      }
    ]
  },
  {
    "id": "tblf",
    "fmarketId": 41,
    "code": "TBLF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TĂNG TRƯỞNG BALLAD VIỆT NAM",
    "category": "equity",
    "issuer": "SGIC",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ ĐẦU TƯ SGI",
    "nav": 11027.39,
    "navDate": "12/11/2026",
    "ytdReturn": 0.59,
    "return1Y": 1.99,
    "return3Y": 46.2,
    "returnInception": 10.27,
    "managementFee": 1.3,
    "inceptionDate": "30/09/2021",
    "description": "Quỹ Ballad Việt Nam hướng tới mục tiêu lợi nhuận vượt trội nhờ phân bổ tập trung vào những cổ phiếu hàng đầu có lợi thế cạnh tranh mạnh mẽ.",
    "holdings": [
      {
        "symbol": "TLG",
        "name": "TLG",
        "industry": "Sản xuất Phụ trợ",
        "weight": 4.85
      },
      {
        "symbol": "FMC",
        "name": "Thực phẩm Sao Ta",
        "industry": "Chế biến thủy sản",
        "weight": 4.77
      },
      {
        "symbol": "DPR",
        "name": "DPR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 4.68
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.56
      },
      {
        "symbol": "VIP",
        "name": "VIP",
        "industry": "Vận tải - Kho bãi",
        "weight": 3.05
      },
      {
        "symbol": "PNJ",
        "name": "Vàng bạc Phú Nhuận",
        "industry": "Sản xuất Phụ trợ",
        "weight": 2.91
      },
      {
        "symbol": "BWE",
        "name": "BWE",
        "industry": "Tiện ích",
        "weight": 2.89
      },
      {
        "symbol": "DRI",
        "name": "DRI",
        "industry": "Sản phẩm cao su",
        "weight": 2.51
      },
      {
        "symbol": "TV2",
        "name": "TV2",
        "industry": "Dịch vụ tư vấn, hỗ trợ",
        "weight": 2.08
      },
      {
        "symbol": "SIP",
        "name": "SIP",
        "industry": "Tiện ích",
        "weight": 1.82
      }
    ]
  },
  {
    "id": "vndbf",
    "fmarketId": 37,
    "code": "VNDBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU VND",
    "category": "bond",
    "issuer": "IPA PARTNER",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ IPA PARTNER",
    "nav": 16509.12,
    "navDate": "12/11/2026",
    "ytdReturn": 6.37,
    "return1Y": 7.09,
    "return3Y": 24.28,
    "returnInception": 65.09,
    "managementFee": 1.1,
    "inceptionDate": "05/07/2019",
    "description": "Quỹ tìm kiếm lợi nhuận ổn định và dài hạn cho Nhà đầu tư thông qua việc đầu tư vào các tài sản có thu nhập cố định có uy tín và có chất lượng tín dụng cao.",
    "holdings": [
      {
        "symbol": "CVT122009",
        "name": "CVT122009",
        "industry": "Vật liệu xây dựng",
        "weight": 19.68
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 12.9
      },
      {
        "symbol": "TCX126011",
        "name": "TCX126011",
        "industry": "Chứng khoán",
        "weight": 8.75
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 7.59
      },
      {
        "symbol": "KBCL12601",
        "name": "KBCL12601",
        "industry": "Bất động sản",
        "weight": 5.41
      },
      {
        "symbol": "DSE125004",
        "name": "DSE125004",
        "industry": "Chứng khoán",
        "weight": 4.51
      },
      {
        "symbol": "HDB125011",
        "name": "HDB125011",
        "industry": "Ngân hàng",
        "weight": 1.05
      },
      {
        "symbol": "CII426028",
        "name": "CII426028",
        "industry": "Xây dựng",
        "weight": 0.93
      },
      {
        "symbol": "CTG121031",
        "name": "CTG121031",
        "industry": "Ngân hàng",
        "weight": 0.12
      },
      {
        "symbol": "VBA124019",
        "name": "VBA124019",
        "industry": "Ngân hàng",
        "weight": 0.06
      }
    ]
  },
  {
    "id": "vndaf",
    "fmarketId": 38,
    "code": "VNDAF",
    "name": "QUỸ ĐẦU TƯ CHỦ ĐỘNG VND",
    "category": "equity",
    "issuer": "IPA PARTNER",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ IPA PARTNER",
    "nav": 17998.61,
    "navDate": "12/11/2026",
    "ytdReturn": -3,
    "return1Y": 6.19,
    "return3Y": 29.31,
    "returnInception": 79.99,
    "managementFee": 1.5,
    "inceptionDate": "12/01/2018",
    "description": "Quỹ đầu tư vào các doanh nghiệp niêm yết hàng đầu, có hiệu quả kinh doanh tốt nhất nhằm mang lại sự tăng trưởng tài sản trong dài hạn.",
    "holdings": [
      {
        "symbol": "VNM",
        "name": "Vinamilk",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 18.6
      },
      {
        "symbol": "KDH",
        "name": "Nhà Khang Điền",
        "industry": "Bất động sản",
        "weight": 9.41
      },
      {
        "symbol": "EIB",
        "name": "Eximbank",
        "industry": "Ngân hàng",
        "weight": 4.25
      },
      {
        "symbol": "NLG",
        "name": "Nam Long",
        "industry": "Bất động sản",
        "weight": 4.14
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 3.99
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.84
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 3.81
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 3.71
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 1.49
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 9.83
      }
    ]
  },
  {
    "id": "magef",
    "fmarketId": 35,
    "code": "MAGEF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TĂNG TRƯỞNG MIRAE ASSET VIỆT NAM",
    "category": "equity",
    "issuer": "MIRAE ASSET",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ MIREA ASSET VIỆT NAM",
    "nav": 20673.09,
    "navDate": "12/11/2026",
    "ytdReturn": -6.74,
    "return1Y": 1.64,
    "return3Y": 52.13,
    "returnInception": 106.73,
    "managementFee": 1.75,
    "inceptionDate": "23/07/2019",
    "description": "Quỹ đầu tư vào các cổ phiếu niêm yết có tiềm năng tăng trưởng tốt, cổ phiếu của các công ty đứng đầu ngành nhằm gia tăng giá trị tài sản ròng trong dài hạn.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 11.89
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 10.1
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 5.12
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.87
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.76
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.74
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.53
      },
      {
        "symbol": "VEA",
        "name": "VEA",
        "industry": "Sản xuất Thiết bị, máy móc",
        "weight": 4.38
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.34
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4
      }
    ]
  },
  {
    "id": "vcbf-bcf",
    "fmarketId": 32,
    "code": "VCBF-BCF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU HÀNG ĐẦU VCBF",
    "category": "equity",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 39752.13,
    "navDate": "12/11/2026",
    "ytdReturn": -9.56,
    "return1Y": -3.84,
    "return3Y": 45.38,
    "returnInception": 297.52,
    "managementFee": 1.9,
    "inceptionDate": "22/08/2014",
    "description": "Quỹ đầu tư chủ yếu vào cổ phiếu, sử dụng phân tích các chỉ số cơ bản để lựa chọn công ty đầu tư nhằm gia tăng tài sản của quỹ trong trung và dài hạn.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 9.71
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 6.33
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 6.21
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 5.79
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 5.79
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 4.62
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.42
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 4.22
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 3.97
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 3.59
      }
    ]
  },
  {
    "id": "vcbf-fif",
    "fmarketId": 33,
    "code": "VCBF-FIF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU VCBF",
    "category": "bond",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 16385.78,
    "navDate": "12/11/2026",
    "ytdReturn": 6.78,
    "return1Y": 7.45,
    "return3Y": 22.77,
    "returnInception": 63.86,
    "managementFee": 0.8,
    "inceptionDate": "09/08/2019",
    "description": "Quỹ đầu tư 100% tài sản vào các trái phiếu có chất lượng tín dụng tốt nhằm bảo toàn vốn ban đầu và mang lại thu nhập ổn định thường xuyên.",
    "holdings": [
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 14.44
      },
      {
        "symbol": "TNG124027",
        "name": "TNG124027",
        "industry": "Sản xuất Hàng gia dụng",
        "weight": 10.17
      },
      {
        "symbol": "CTD126006",
        "name": "CTD126006",
        "industry": "Xây dựng",
        "weight": 10.09
      },
      {
        "symbol": "VHM121025",
        "name": "VHM121025",
        "industry": "Bất động sản",
        "weight": 9.94
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 6.97
      },
      {
        "symbol": "BCM12406",
        "name": "BCM12406",
        "industry": "Bất động sản",
        "weight": 5.55
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.52
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 2.08
      },
      {
        "symbol": "HDC12501",
        "name": "HDC12501",
        "industry": "Bất động sản",
        "weight": 1.72
      },
      {
        "symbol": "VBA124019",
        "name": "VBA124019",
        "industry": "Ngân hàng",
        "weight": 0.78
      }
    ]
  },
  {
    "id": "vcbf-tbf",
    "fmarketId": 31,
    "code": "VCBF-TBF",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG CHIẾN LƯỢC VCBF",
    "category": "balanced",
    "issuer": "VIETCOMBANK FUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ ĐẦU TƯ CHỨNG KHOÁN VIETCOMBANK",
    "nav": 37192.82,
    "navDate": "12/11/2026",
    "ytdReturn": -3.44,
    "return1Y": 0.62,
    "return3Y": 38.24,
    "returnInception": 271.93,
    "managementFee": 1.5,
    "inceptionDate": "24/12/2013",
    "description": "Quỹ phân bổ tài sản vào Cổ phiếu và Tài sản có thu nhập cố định tùy thuộc vào điều kiện thị trường . Mục tiêu là mang lại lợi nhuận dài hạn.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 5.78
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.09
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.71
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.41
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.25
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 2.85
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 2.63
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.86
      },
      {
        "symbol": "CTD126006",
        "name": "CTD126006",
        "industry": "Xây dựng",
        "weight": 3.84
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.02
      }
    ]
  },
  {
    "id": "veof",
    "fmarketId": 20,
    "code": "VEOF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU DOANH NGHIỆP HÀNG ĐẦU VINACAPITAL",
    "category": "equity",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 32397.76,
    "navDate": "12/11/2026",
    "ytdReturn": -8.26,
    "return1Y": -6.81,
    "return3Y": 33.01,
    "returnInception": 223.98,
    "managementFee": 1.75,
    "inceptionDate": "01/07/2014",
    "description": "Quỹ VEOF đầu tư vào cổ phiếu của những công ty đầu ngành trong những lĩnh vực đại diện nền kinh tế Việt Nam, có quy mô lớn hoặc lợi thế cạnh tranh khác biệt. Thông qua chiến lược quản lý chủ động và xây dựng danh mục đầu tư một cách kỷ luật, Quỹ hướng tới mục tiêu mang lại lợi nhuận vượt trội trong trung và dài hạn cho nhà đầu tư, đồng thời tối ưu hóa mối tương quan giữa lợi nhuận và rủi ro. Quỹ tập trung lựa chọn cổ phiếu của các doanh nghiệp có tiềm năng tăng trưởng cao đang được định giá thấp so với giá trị nội tại, ưu tiên cổ phiếu vốn hóa lớn và vừa của các công ty đầu ngành, điều chỉnh tỷ trọng ngành nghề và cổ phiếu phù hợp với từng chu kỳ kinh tế dưới quy trình kiểm soát rủi ro kỷ luật.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 7.93
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 6.63
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.73
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 5.71
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.26
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 5.17
      },
      {
        "symbol": "FRT",
        "name": "Bán lẻ FPT (Long Châu)",
        "industry": "Bán lẻ",
        "weight": 4.75
      },
      {
        "symbol": "PHR",
        "name": "PHR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 4.37
      },
      {
        "symbol": "STB",
        "name": "Sacombank",
        "industry": "Ngân hàng",
        "weight": 4.33
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.01
      }
    ]
  },
  {
    "id": "vff",
    "fmarketId": 21,
    "code": "VFF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU NÂNG CAO VINACAPITAL",
    "category": "bond",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 27250.93,
    "navDate": "12/11/2026",
    "ytdReturn": 6.77,
    "return1Y": 8.32,
    "return3Y": 23.56,
    "returnInception": 172.51,
    "managementFee": 0.95,
    "inceptionDate": "01/04/2013",
    "description": "Quỹ VFF đầu tư vào các công cụ có thu nhập cố định như trái phiếu doanh nghiệp, chứng chỉ tiền gửi, tiền gửi. Thông qua xây dựng danh mục đa dạng chất lượng cao trên nền tảng kỷ luật quản trị rủi ro nghiêm ngặt, Quỹ hướng tới lợi nhuận bền vững. Quỹ tập trung phân bổ vào các tổ chức phát hành có nền tảng tài chính vững mạnh và dòng tiền ổn định, mọi tài sản đều phải vượt qua quy trình thẩm định nghiêm ngặt và đạt điểm tín nhiệm cao theo hệ thống xếp hạng nội bộ của VinaCapital nhằm đảm bảo chất lượng tín dụng tối ưu và bảo toàn vốn. Quỹ kết hợp phân tích định lượng và định tính cùng nguyên tắc đa dạng hóa nhiều ngành nghề để tối ưu hóa tỷ suất sinh lời trên mỗi đơn vị rủi ro, duy trì lợi nhuận ổn định dài hạn và thanh khoản hợp lý, chủ động ứng phó trước biến động thị trường.",
    "holdings": [
      {
        "symbol": "VHM12612",
        "name": "VHM12612",
        "industry": "Bất động sản",
        "weight": 12.41
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 12.11
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 9.91
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 9.46
      },
      {
        "symbol": "SHB125010",
        "name": "SHB125010",
        "industry": "Ngân hàng",
        "weight": 8.86
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 8.24
      },
      {
        "symbol": "SBT426026",
        "name": "SBT426026",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 8.22
      },
      {
        "symbol": "DSE125004",
        "name": "DSE125004",
        "industry": "Chứng khoán",
        "weight": 3.7
      },
      {
        "symbol": "HDC12501",
        "name": "HDC12501",
        "industry": "Bất động sản",
        "weight": 3.04
      },
      {
        "symbol": "HDC425001",
        "name": "HDC425001",
        "industry": "Bất động sản",
        "weight": 3.02
      }
    ]
  },
  {
    "id": "vibf",
    "fmarketId": 22,
    "code": "VIBF",
    "name": "QUỸ ĐẦU TƯ CÂN BẰNG GẮN KẾT VINACAPITAL",
    "category": "balanced",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 19000.99,
    "navDate": "12/11/2026",
    "ytdReturn": -4.09,
    "return1Y": -2.13,
    "return3Y": 27.24,
    "returnInception": 90.01,
    "managementFee": 1.75,
    "inceptionDate": "02/07/2019",
    "description": "Quỹ VIBF đầu tư vào cổ phiếu và các tài sản có thu nhập cố định. Thông qua chiến lược phân bổ linh hoạt kết hợp sự ổn định từ công cụ thu nhập cố định với tiềm năng tăng trưởng từ danh mục cổ phiếu trên nền tảng kỷ luật quản trị rủi ro nghiêm ngặt, Quỹ hướng tới mục tiêu tối ưu hóa lợi nhuận. Quỹ phân bổ linh hoạt giữa cổ phiếu và trái phiếu tùy theo điều kiện thị trường nhằm tối đa hóa lợi nhuận trên một đơn vị rủi ro. Danh mục cổ phiếu áp dụng chiến lược chủ động tăng trưởng với mức định giá hợp lý, ưu tiên doanh nghiệp có lợi thế cạnh tranh rõ rệt, khả năng gia tăng thị phần và đội ngũ lãnh đạo có năng lực quản trị tốt, minh bạch. Danh mục thu nhập cố định tập trung vào trái phiếu doanh nghiệp, chứng chỉ tiền gửi và các công cụ khác được thẩm định nghiêm ngặt qua Hệ thống xếp hạng tín nhiệm nội bộ của VinaCapital nhằm đảm bảo chất lượng tín dụng cao, giảm biến động và gia tăng hiệu quả danh mục.",
    "holdings": [
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.18
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.92
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.65
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 3.04
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 2.83
      },
      {
        "symbol": "MSN123010",
        "name": "MSN123010",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 14.08
      },
      {
        "symbol": "BCM12406",
        "name": "BCM12406",
        "industry": "Bất động sản",
        "weight": 4.06
      },
      {
        "symbol": "NLG12501",
        "name": "NLG12501",
        "industry": "Bất động sản",
        "weight": 4.06
      },
      {
        "symbol": "HDC12502",
        "name": "HDC12502",
        "industry": "Bất động sản",
        "weight": 3.73
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 3.27
      }
    ]
  },
  {
    "id": "vesaf",
    "fmarketId": 23,
    "code": "VESAF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TĂNG TRƯỞNG CHIẾN LƯỢC VINACAPITAL",
    "category": "equity",
    "issuer": "VINACAPITAL",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ VINACAPITAL",
    "nav": 30898.7,
    "navDate": "12/11/2026",
    "ytdReturn": -7.96,
    "return1Y": -7.27,
    "return3Y": 22.09,
    "returnInception": 208.99,
    "managementFee": 1.75,
    "inceptionDate": "18/04/2017",
    "description": "Quỹ VESAF đầu tư vào cổ phiếu của những doanh nghiệp có nền tảng vững chắc và những công ty chưa được thị trường đánh giá hợp lý. Thông qua chiến lược quản lý chủ động và xây dựng danh mục đầu tư một cách kỷ luật, Quỹ hướng tới mục tiêu mang lại lợi nhuận vượt trội trong trung và dài hạn cho nhà đầu tư, đồng thời tối ưu hóa mối tương quan giữa lợi nhuận và rủi ro. Quỹ tập trung lựa chọn hai nhóm chính: (1) cổ phiếu của các doanh nghiệp có nền tảng vững chắc, khả năng tăng trưởng kép cao trong nhiều năm và đang giao dịch ở mức định giá hợp lý; (2) cổ phiếu chưa được thị trường chú ý nhưng có nhiều chất xúc tác gia tăng giá trị doanh nghiệp, điều chỉnh tỷ trọng ngành nghề và cổ phiếu phù hợp với từng chu kỳ kinh tế dưới quy trình kiểm soát rủi ro kỷ luật.",
    "holdings": [
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 6.42
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 6.36
      },
      {
        "symbol": "BVH",
        "name": "Tập đoàn Bảo Việt",
        "industry": "Bảo hiểm",
        "weight": 6.15
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.96
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 5.43
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.98
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 4.46
      },
      {
        "symbol": "CTR",
        "name": "Công trình Viettel",
        "industry": "Công nghệ và thông tin",
        "weight": 4.28
      },
      {
        "symbol": "REE",
        "name": "Cơ Điện Lạnh",
        "industry": "Thiết bị điện",
        "weight": 4.27
      },
      {
        "symbol": "VRE",
        "name": "Vincom Retail",
        "industry": "Bất động sản",
        "weight": 4.24
      }
    ]
  },
  {
    "id": "dcbf",
    "fmarketId": 27,
    "code": "DCBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU DC",
    "category": "bond",
    "issuer": "DCVFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ DRAGON CAPITAL VIỆT NAM",
    "nav": 30922.83,
    "navDate": "12/11/2026",
    "ytdReturn": 6.67,
    "return1Y": 7.76,
    "return3Y": 23.76,
    "returnInception": 209.23,
    "managementFee": 1.2,
    "inceptionDate": "10/06/2013",
    "description": "Quỹ DCBF đầu tư vào trái phiếu chính phủ, trái phiếu doanh nghiệp và các công cụ tiền tệ khác để tạo ra thu nhập ổn định.",
    "holdings": [
      {
        "symbol": "VPI124001",
        "name": "VPI124001",
        "industry": "Bất động sản",
        "weight": 12.5
      },
      {
        "symbol": "DSE125018",
        "name": "DSE125018",
        "industry": "Chứng khoán",
        "weight": 10.99
      },
      {
        "symbol": "MSN123008",
        "name": "MSN123008",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 10.5
      },
      {
        "symbol": "BAF126003",
        "name": "BAF126003",
        "industry": "Nông - Lâm - Ngư",
        "weight": 8.75
      },
      {
        "symbol": "CIIL12601",
        "name": "CIIL12601",
        "industry": "Xây dựng",
        "weight": 7.67
      },
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 6.07
      },
      {
        "symbol": "VHM12612",
        "name": "VHM12612",
        "industry": "Bất động sản",
        "weight": 5.43
      },
      {
        "symbol": "KBCL12601 bond",
        "name": "KBCL12601 bond",
        "industry": "Bất động sản",
        "weight": 4.38
      }
    ]
  },
  {
    "id": "dcde",
    "fmarketId": 25,
    "code": "DCDE",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TẬP TRUNG CỔ TỨC DC",
    "category": "equity",
    "issuer": "DCVFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ DRAGON CAPITAL VIỆT NAM",
    "nav": 24044.48,
    "navDate": "12/11/2026",
    "ytdReturn": -16.32,
    "return1Y": -14.19,
    "return3Y": 17.99,
    "returnInception": 186.44,
    "managementFee": 1.93,
    "inceptionDate": "28/02/2008",
    "description": "Quỹ DCDE ưu tiên lựa chọn các doanh nghiệp có mức chi trả cổ tức tăng trưởng đều đặn vào danh mục.",
    "holdings": [
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.82
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 5.79
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 4.63
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.62
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 4.09
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 3.3
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.27
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 3.25
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.15
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 2.94
      }
    ]
  },
  {
    "id": "dcds",
    "fmarketId": 28,
    "code": "DCDS",
    "name": "QUỸ ĐẦU TƯ CHỨNG KHOÁN NĂNG ĐỘNG DC",
    "category": "equity",
    "issuer": "DCVFM",
    "issuerFullName": "CÔNG TY CỔ PHẦN QUẢN LÝ QUỸ DRAGON CAPITAL VIỆT NAM",
    "nav": 92561.04,
    "navDate": "12/11/2026",
    "ytdReturn": -13.6,
    "return1Y": -6.79,
    "return3Y": 46.95,
    "returnInception": 825.61,
    "managementFee": 1.95,
    "inceptionDate": "20/05/2004",
    "description": "DCDS là quỹ cổ phiếu có danh mục gồm cổ phiếu tăng trưởng và các tài sản tài chính đa dạng nhằm hướng đến lợi nhuận vượt trội và linh hoạt thích ứng thị trường.",
    "holdings": [
      {
        "symbol": "VIC",
        "name": "Tập đoàn Vingroup",
        "industry": "Bất động sản",
        "weight": 11.75
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 6.98
      },
      {
        "symbol": "BID",
        "name": "BIDV",
        "industry": "Ngân hàng",
        "weight": 6.96
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 6.14
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.59
      },
      {
        "symbol": "VHM",
        "name": "CTCP Vinhomes",
        "industry": "Bất động sản",
        "weight": 4.56
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.4
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 4.24
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.32
      },
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 2.79
      }
    ]
  },
  {
    "id": "bvpf",
    "fmarketId": 14,
    "code": "BVPF",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU TRIỂN VỌNG BẢO VIỆT",
    "category": "equity",
    "issuer": "BAOVIETFUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ BẢO VIỆT",
    "nav": 20497,
    "navDate": "12/11/2026",
    "ytdReturn": -9.81,
    "return1Y": -8.99,
    "return3Y": 23.77,
    "returnInception": 104.97,
    "managementFee": 1.5,
    "inceptionDate": "29/12/2016",
    "description": "Quỹ hướng tới mục tiêu tạo ra lợi nhuận có tính chất bền vững và dài hạn cho nhà đầu tư thông qua việc khai thác hiệu quả cơ hội đầu tư vào các doanh nghiệp có nền tảng hoạt động tốt và triển vọng phát triển tại Việt Nam.",
    "holdings": [
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 8.94
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 8.83
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 7.81
      },
      {
        "symbol": "QTP",
        "name": "QTP",
        "industry": "Tiện ích",
        "weight": 6.51
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 5.94
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.08
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 4.92
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 4.67
      },
      {
        "symbol": "REE",
        "name": "Cơ Điện Lạnh",
        "industry": "Thiết bị điện",
        "weight": 4.63
      },
      {
        "symbol": "VIB",
        "name": "VIBank",
        "industry": "Ngân hàng",
        "weight": 4.47
      }
    ]
  },
  {
    "id": "bvbf",
    "fmarketId": 13,
    "code": "BVBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU BẢO VIỆT ",
    "category": "bond",
    "issuer": "BAOVIETFUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ BẢO VIỆT",
    "nav": 22941,
    "navDate": "12/11/2026",
    "ytdReturn": 5.36,
    "return1Y": 6.32,
    "return3Y": 20.11,
    "returnInception": 139.41,
    "managementFee": 0.5,
    "inceptionDate": "20/05/2016",
    "description": "Là sản phẩm đầu tư trong lĩnh vực Trái phiếu, phục vụ nhà đầu tư đại chúng, hướng tới mục tiêu tối ưu hóa lợi nhuận cho nhà đầu tư trên cơ sở tận dụng hiệu quả các cơ hội đầu tư lãi suất cố định.",
    "holdings": [
      {
        "symbol": "VBA124019",
        "name": "VBA124019",
        "industry": "Ngân hàng",
        "weight": 11.75
      },
      {
        "symbol": "NAB125004",
        "name": "NAB125004",
        "industry": "Ngân hàng",
        "weight": 9.83
      },
      {
        "symbol": "SHB125010",
        "name": "SHB125010",
        "industry": "Ngân hàng",
        "weight": 8.88
      }
    ]
  },
  {
    "id": "bvfed",
    "fmarketId": 12,
    "code": "BVFED",
    "name": "QUỸ ĐẦU TƯ CỔ PHIẾU NĂNG ĐỘNG BẢO VIỆT",
    "category": "equity",
    "issuer": "BAOVIETFUND",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ BẢO VIỆT",
    "nav": 29196,
    "navDate": "12/11/2026",
    "ytdReturn": -5.93,
    "return1Y": -2.21,
    "return3Y": 50.81,
    "returnInception": 191.96,
    "managementFee": 1,
    "inceptionDate": "08/01/2014",
    "description": "Là sản phẩm đầu tư vào rổ cổ phiếu VN30 gồm những cổ phiếu lớn, đầu ngành và có chất lượng tốt nhất. Mục tiêu của quỹ là tối đa hóa lợi nhuận dài hạn cho nhà đầu tư\ntrên cơ sở kết hợp giữa tăng trưởng vốn đầu tư và các dòng thu nhập từ tài sản đầu tư.",
    "holdings": [
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 10
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 6.36
      },
      {
        "symbol": "ACB",
        "name": "Ngân hàng Á Châu",
        "industry": "Ngân hàng",
        "weight": 5.72
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 5.63
      },
      {
        "symbol": "FPT",
        "name": "Tập đoàn FPT",
        "industry": "Công nghệ và thông tin",
        "weight": 5.4
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 5.32
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 5.27
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 4.42
      },
      {
        "symbol": "SHB",
        "name": "SHB",
        "industry": "Ngân hàng",
        "weight": 4.17
      },
      {
        "symbol": "MSN",
        "name": "Tập đoàn Masan",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 2.73
      }
    ]
  },
  {
    "id": "dfvn-caf",
    "fmarketId": 29,
    "code": "DFVN-CAF",
    "name": "QUỸ ĐẦU TƯ TĂNG TRƯỞNG DFVN",
    "category": "equity",
    "issuer": "DFVN",
    "issuerFullName": "CÔNG TY TNHH MTV QUẢN LÝ QUỸ DAIICHI LIFE VIỆT NAM",
    "nav": 15805.46,
    "navDate": "12/11/2026",
    "ytdReturn": -10.45,
    "return1Y": -7.68,
    "return3Y": 17.86,
    "returnInception": 58.05,
    "managementFee": 1.5,
    "inceptionDate": "03/01/2019",
    "description": "Quỹ đầu tư vào danh mục cổ phiếu niêm yết trên TTCK VN một cách chủ động và linh hoạt, nhằm tăng trưởng tài sản cao hơn mức tăng của Thị trường trong dài hạn.",
    "holdings": [
      {
        "symbol": "GMD",
        "name": "Gemadept",
        "industry": "Vận tải - Kho bãi",
        "weight": 5.02
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 5.01
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.87
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 4.84
      },
      {
        "symbol": "SAB",
        "name": "Sabeco",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 4.56
      },
      {
        "symbol": "VPB",
        "name": "VPBank",
        "industry": "Ngân hàng",
        "weight": 4.27
      },
      {
        "symbol": "PVD",
        "name": "Khoan Dầu khí",
        "industry": "Khai khoáng",
        "weight": 3.85
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 3.85
      },
      {
        "symbol": "BSR",
        "name": "Lọc hóa dầu Bình Sơn",
        "industry": "Sản xuất",
        "weight": 3.82
      },
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 3.48
      }
    ]
  },
  {
    "id": "dfvn-fix",
    "fmarketId": 30,
    "code": "DFVN-FIX",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU DFVN",
    "category": "bond",
    "issuer": "DFVN",
    "issuerFullName": "CÔNG TY TNHH MTV QUẢN LÝ QUỸ DAIICHI LIFE VIỆT NAM",
    "nav": 12542.68,
    "navDate": "12/11/2026",
    "ytdReturn": 5.17,
    "return1Y": 6.07,
    "return3Y": 14.21,
    "returnInception": 25.43,
    "managementFee": 0.9,
    "inceptionDate": "04/02/2021",
    "description": "Quỹ đầu tư vào các tài sản có thu nhập cố định có chất lượng tín dụng tốt hướng tới mục tiêu tăng trưởng bền vững trong trung và dài hạn.",
    "holdings": [
      {
        "symbol": "HDB125011",
        "name": "HDB125011",
        "industry": "Ngân hàng",
        "weight": 12.42
      },
      {
        "symbol": "VBA123036",
        "name": "VBA123036",
        "industry": "Ngân hàng",
        "weight": 10.41
      },
      {
        "symbol": "VBA124019",
        "name": "VBA124019",
        "industry": "Ngân hàng",
        "weight": 7.24
      },
      {
        "symbol": "CTG121031",
        "name": "CTG121031",
        "industry": "Ngân hàng",
        "weight": 2.09
      },
      {
        "symbol": "CTG123019",
        "name": "CTG123019",
        "industry": "Ngân hàng",
        "weight": 0.22
      },
      {
        "symbol": "CTG123033",
        "name": "CTG123033",
        "industry": "Ngân hàng",
        "weight": 0.03
      }
    ]
  },
  {
    "id": "ssibf",
    "fmarketId": 8,
    "code": "SSIBF",
    "name": "QUỸ ĐẦU TƯ TRÁI PHIẾU SSI",
    "category": "bond",
    "issuer": "SSIAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ SSI",
    "nav": 17214.91,
    "navDate": "12/11/2026",
    "ytdReturn": 4.41,
    "return1Y": 4.95,
    "return3Y": 18.19,
    "returnInception": 72.15,
    "managementFee": 1,
    "inceptionDate": "30/08/2017",
    "description": "Mục tiêu đầu tư của Quỹ là tối ưu hóa lợi nhuận cho Nhà Đầu Tư trên cơ sở tận dụng hiệu quả các cơ hội đầu tư vào các công cụ có thu nhập cố định.",
    "holdings": [
      {
        "symbol": "MSN123009",
        "name": "MSN123009",
        "industry": "Thực phẩm - Đồ uống",
        "weight": 17.32
      },
      {
        "symbol": "BCM12406",
        "name": "BCM12406",
        "industry": "Bất động sản",
        "weight": 17.09
      }
    ]
  },
  {
    "id": "ssisca",
    "fmarketId": 11,
    "code": "SSISCA",
    "name": "QUỸ ĐẦU TƯ LỢI THẾ CẠNH TRANH BỀN VỮNG SSI",
    "category": "equity",
    "issuer": "SSIAM",
    "issuerFullName": "CÔNG TY TNHH QUẢN LÝ QUỸ SSI",
    "nav": 40787.12,
    "navDate": "12/11/2026",
    "ytdReturn": -10.49,
    "return1Y": -7.47,
    "return3Y": 38.45,
    "returnInception": 307.87,
    "managementFee": 1.75,
    "inceptionDate": "26/09/2014",
    "description": "Quỹ tăng trưởng NAV thông qua việc chủ động và linh hoạt đầu tư vào cổ phiếu của các công ty có lợi thế cạnh trạnh bền vững và các tài sản có thu nhập cố định.",
    "holdings": [
      {
        "symbol": "HDB",
        "name": "HDBank",
        "industry": "Ngân hàng",
        "weight": 7.58
      },
      {
        "symbol": "TCB",
        "name": "Techcombank",
        "industry": "Ngân hàng",
        "weight": 7.31
      },
      {
        "symbol": "MWG",
        "name": "Thế Giới Di Động",
        "industry": "Bán lẻ",
        "weight": 6.96
      },
      {
        "symbol": "MBB",
        "name": "Ngân hàng Quân Đội",
        "industry": "Ngân hàng",
        "weight": 4.69
      },
      {
        "symbol": "VCB",
        "name": "Vietcombank",
        "industry": "Ngân hàng",
        "weight": 4.44
      },
      {
        "symbol": "TCX",
        "name": "TCX",
        "industry": "Chứng khoán",
        "weight": 3.99
      },
      {
        "symbol": "CTG",
        "name": "VietinBank",
        "industry": "Ngân hàng",
        "weight": 3.46
      },
      {
        "symbol": "CTD",
        "name": "CTD",
        "industry": "Xây dựng",
        "weight": 3.26
      },
      {
        "symbol": "PHR",
        "name": "PHR",
        "industry": "Sản xuất Nhựa - Hóa chất",
        "weight": 3.24
      },
      {
        "symbol": "HPG",
        "name": "Tập đoàn Hòa Phát",
        "industry": "Vật liệu xây dựng",
        "weight": 2.66
      }
    ]
  }
]

export const TOP_STOCK_HOLDINGS: StockHoldingStats[] = [
  {
    "rank": 1,
    "symbol": "MBB",
    "name": "Ngân hàng Quân Đội",
    "industry": "Ngân hàng",
    "fundCount": 33,
    "avgWeight": 5.14
  },
  {
    "rank": 2,
    "symbol": "HPG",
    "name": "Tập đoàn Hòa Phát",
    "industry": "Vật liệu xây dựng",
    "fundCount": 31,
    "avgWeight": 4.66
  },
  {
    "rank": 3,
    "symbol": "TCB",
    "name": "Techcombank",
    "industry": "Ngân hàng",
    "fundCount": 31,
    "avgWeight": 4.48
  },
  {
    "rank": 4,
    "symbol": "MWG",
    "name": "Thế Giới Di Động",
    "industry": "Bán lẻ",
    "fundCount": 30,
    "avgWeight": 4.9
  },
  {
    "rank": 5,
    "symbol": "CTG",
    "name": "VietinBank",
    "industry": "Ngân hàng",
    "fundCount": 27,
    "avgWeight": 4.29
  },
  {
    "rank": 6,
    "symbol": "VCB",
    "name": "Vietcombank",
    "industry": "Ngân hàng",
    "fundCount": 26,
    "avgWeight": 4.89
  },
  {
    "rank": 7,
    "symbol": "VPB",
    "name": "VPBank",
    "industry": "Ngân hàng",
    "fundCount": 18,
    "avgWeight": 3.75
  },
  {
    "rank": 8,
    "symbol": "HDB",
    "name": "HDBank",
    "industry": "Ngân hàng",
    "fundCount": 17,
    "avgWeight": 4.28
  },
  {
    "rank": 9,
    "symbol": "MSN",
    "name": "Tập đoàn Masan",
    "industry": "Thực phẩm - Đồ uống",
    "fundCount": 15,
    "avgWeight": 4.05
  },
  {
    "rank": 10,
    "symbol": "ACB",
    "name": "Ngân hàng Á Châu",
    "industry": "Ngân hàng",
    "fundCount": 14,
    "avgWeight": 5.83
  }
]

export const TOP_INDUSTRY_HOLDINGS: IndustryHoldingStats[] = [
  {
    "rank": 1,
    "industry": "Ngân hàng",
    "fundCount": 43,
    "avgWeight": 26.34
  },
  {
    "rank": 2,
    "industry": "Thực phẩm - Đồ uống",
    "fundCount": 42,
    "avgWeight": 6.68
  },
  {
    "rank": 3,
    "industry": "Vật liệu xây dựng",
    "fundCount": 42,
    "avgWeight": 4.59
  },
  {
    "rank": 4,
    "industry": "Bất động sản",
    "fundCount": 41,
    "avgWeight": 11.77
  },
  {
    "rank": 5,
    "industry": "Vận tải - Kho bãi",
    "fundCount": 39,
    "avgWeight": 3
  },
  {
    "rank": 6,
    "industry": "Bán lẻ",
    "fundCount": 38,
    "avgWeight": 5.23
  },
  {
    "rank": 7,
    "industry": "Chứng khoán",
    "fundCount": 37,
    "avgWeight": 4.12
  },
  {
    "rank": 8,
    "industry": "Công nghệ và thông tin",
    "fundCount": 36,
    "avgWeight": 2.78
  },
  {
    "rank": 9,
    "industry": "Tiện ích",
    "fundCount": 34,
    "avgWeight": 3.48
  },
  {
    "rank": 10,
    "industry": "Sản xuất Nhựa - Hóa chất",
    "fundCount": 32,
    "avgWeight": 4.16
  }
]
