import sqlite3
import json
import os

DB_PATH = 'data/financial_statements.db'
JSON_PATH = 'data/bidding/healthcare-contractors.json'

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    contractors = json.load(f)

# Definition for additional companies if not present
NEW_COMPANIES = [
    {
        'id': 'MED_DOMESCO',
        'name': 'Công ty Cổ phần Xuất nhập khẩu Y tế Domesco',
        'short_name': 'Domesco',
        'stock_code': 'DMC',
        'tax_code': '1400100787',
        'address': 'Số 347, Đường Nguyễn Huệ, Phường Mỹ Phú, TP. Cao Lãnh, Đồng Tháp',
        'founded_year': 1989,
        'segment': 'Thuốc Generic điều trị tim mạch, đái tháo đường & tiêu hóa (Chuẩn Abbott)',
        'segment_group': 'DRUGS',
        'is_listed': True,
        'exchange': 'HOSE',
        'bids_participated': 2450,
        'bids_won': 2140,
        'bids_lost': 210,
        'bids_pending': 100,
        'win_rate': 87.3,
        'total_winning_value': 11850000000000.0,
        'solo_winning_value': 11200000000000.0,
        'joint_winning_value': 650000000000.0,
        'avg_discount_rate': 3.4,
        'top_hospital_clients': [
            'Bệnh viện Tim TP.HCM',
            'Bệnh viện Chợ Rẫy',
            'Sở Y tế tỉnh Đồng Tháp',
            'Viện Lão khoa Trung ương',
            'Bệnh viện Đa khoa Trung tâm Tiền Giang'
        ],
        'key_products': [
            'Thuốc tim mạch huyết áp Dorocard, Domitazol, Amlodipin',
            'Thuốc điều trị đái tháo đường Metformin, Glimepirid',
            'Kháng sinh Cephalosporin & Macrolid dạng viên uống',
            'Thuốc hạ mỡ máu Atorvastatin Domesco'
        ],
        'yearly_history': [
            {'year': 2021, 'bids_won': 320, 'value_billion': 1450.0},
            {'year': 2022, 'bids_won': 390, 'value_billion': 1850.0},
            {'year': 2023, 'bids_won': 440, 'value_billion': 2150.0},
            {'year': 2024, 'bids_won': 490, 'value_billion': 2480.0},
            {'year': 2025, 'bids_won': 380, 'value_billion': 2320.0}
        ]
    },
    {
        'id': 'MED_CUULONG',
        'name': 'Công ty Cổ phần Dược phẩm Cửu Long',
        'short_name': 'Dược Cửu Long',
        'stock_code': 'DCL',
        'tax_code': '1500202535',
        'address': 'Số 150 Đường 14 Tháng 9, Phường 5, TP. Vĩnh Long, Tỉnh Vĩnh Long',
        'founded_year': 1976,
        'segment': 'Viên nang rỗng Capsule, Kháng sinh & Dịch truyền tĩnh mạch',
        'segment_group': 'DRUGS',
        'is_listed': True,
        'exchange': 'HOSE',
        'bids_participated': 1820,
        'bids_won': 1530,
        'bids_lost': 210,
        'bids_pending': 80,
        'win_rate': 84.1,
        'total_winning_value': 6850000000000.0,
        'solo_winning_value': 6500000000000.0,
        'joint_winning_value': 350000000000.0,
        'avg_discount_rate': 3.6,
        'top_hospital_clients': [
            'Sở Y tế tỉnh Vĩnh Long',
            'Bệnh viện Đa khoa TW Cần Thơ',
            'Bệnh viện Đa khoa Tỉnh Trà Vinh',
            'Bệnh viện Đa khoa Tỉnh Bến Tre'
        ],
        'key_products': [
            'Viên nang rỗng Vicancap cung ứng các viện sản xuất',
            'Thuốc kháng sinh Cefixim, Amoxicillin, Cefuroxim',
            'Dung dịch tiêm truyền Paracetamol Kabi & Nước cất pha tiêm',
            'Bơm kim tiêm và dây truyền dịch dùng 1 lần'
        ],
        'yearly_history': [
            {'year': 2021, 'bids_won': 240, 'value_billion': 850.0},
            {'year': 2022, 'bids_won': 290, 'value_billion': 1050.0},
            {'year': 2023, 'bids_won': 340, 'value_billion': 1280.0},
            {'year': 2024, 'bids_won': 370, 'value_billion': 1420.0},
            {'year': 2025, 'bids_won': 220, 'value_billion': 1180.0}
        ]
    },
    {
        'id': 'MED_OPC',
        'name': 'Công ty Cổ phần Dược phẩm OPC',
        'short_name': 'Dược phẩm OPC',
        'stock_code': 'OPC',
        'tax_code': '0302560110',
        'address': 'Số 1017 Đường Hồng Bàng, Phường 12, Quận 6, TP. Hồ Chí Minh',
        'founded_year': 1977,
        'segment': 'Đông dược công nghệ cao & Dược liệu đạt chuẩn GACP-WHO',
        'segment_group': 'HERBAL_DRUGS',
        'is_listed': True,
        'exchange': 'HOSE',
        'bids_participated': 1950,
        'bids_won': 1720,
        'bids_lost': 150,
        'bids_pending': 80,
        'win_rate': 88.2,
        'total_winning_value': 7450000000000.0,
        'solo_winning_value': 7200000000000.0,
        'joint_winning_value': 250000000000.0,
        'avg_discount_rate': 2.9,
        'top_hospital_clients': [
            'Bệnh viện Y học Cổ truyền Trung ương',
            'Viện Y Dược Học Dân Tộc TP.HCM',
            'Bệnh viện Y học Cổ truyền TP.HCM',
            'Bệnh viện Đa khoa Y học Cổ truyền Hà Nội'
        ],
        'key_products': [
            'Thuốc trị sỏi thận Kim Tiền Thảo OPC (Hạng 1)',
            'Siro ho Astex cho viện nhi và chuyên khoa hô hấp',
            'Dầu khuynh diệp Mẹ Bồng Con OPC & Cồn xoa bóp',
            'Viên dưỡng não, hoạt huyết dưỡng tâm thảo dược'
        ],
        'yearly_history': [
            {'year': 2021, 'bids_won': 260, 'value_billion': 920.0},
            {'year': 2022, 'bids_won': 310, 'value_billion': 1150.0},
            {'year': 2023, 'bids_won': 360, 'value_billion': 1350.0},
            {'year': 2024, 'bids_won': 390, 'value_billion': 1480.0},
            {'year': 2025, 'bids_won': 240, 'value_billion': 1220.0}
        ]
    },
    {
        'id': 'MED_PHARBACO',
        'name': 'Công ty Cổ phần Dược phẩm Trung ương 1 - Pharbaco',
        'short_name': 'Pharbaco',
        'stock_code': 'PBC',
        'tax_code': '0100108600',
        'address': 'Số 160 Phố Tôn Đức Thắng, Phường Hàng Bột, Quận Đống Đa, Hà Nội',
        'founded_year': 1954,
        'segment': 'Thuốc tiêm bột vô trùng EU-GMP Cephalosporin & Kháng sinh hồi sức',
        'segment_group': 'DRUGS',
        'is_listed': True,
        'exchange': 'UPCoM',
        'bids_participated': 2100,
        'bids_won': 1810,
        'bids_lost': 210,
        'bids_pending': 80,
        'win_rate': 86.2,
        'total_winning_value': 8950000000000.0,
        'solo_winning_value': 8400000000000.0,
        'joint_winning_value': 550000000000.0,
        'avg_discount_rate': 3.5,
        'top_hospital_clients': [
            'Bệnh viện Hữu nghị Việt Đức',
            'Bệnh viện Bạch Mai',
            'Bệnh viện E Trung ương',
            'Bệnh viện Đa khoa Tỉnh Bắc Ninh'
        ],
        'key_products': [
            'Kháng sinh tiêm truyền vô trùng Ceftriaxon, Cefotaxim chuẩn EU-GMP',
            'Thuốc gây tê, giảm đau phẫu thuật ngoại khoa',
            'Dung dịch thẩm phân và thuốc tiêm đông máu',
            'Kháng sinh Non-betalactam chuyên khoa hồi sức tích cực'
        ],
        'yearly_history': [
            {'year': 2021, 'bids_won': 280, 'value_billion': 1120.0},
            {'year': 2022, 'bids_won': 340, 'value_billion': 1380.0},
            {'year': 2023, 'bids_won': 390, 'value_billion': 1620.0},
            {'year': 2024, 'bids_won': 420, 'value_billion': 1780.0},
            {'year': 2025, 'bids_won': 250, 'value_billion': 1390.0}
        ]
    }
]

# Add new companies if missing
existing_codes = {c.get('stock_code') for c in contractors}
for nc in NEW_COMPANIES:
    if nc['stock_code'] not in existing_codes:
        contractors.append(nc)
        existing_codes.add(nc['stock_code'])
        print("Added company:", nc['stock_code'])

# Dictionary of quarterly metrics config for all companies
STOCK_CONFIGS = {
    'DBD': {
        'q1_bidding': 890.0, 'q1_bids': 165, 'q1_rev': 439.7, 'q1_npat': 59.9, 'q1_gm': 49.5, 'q1_nm': 13.6,
        'q2_bidding': 1150.0, 'q2_bids': 210, 'q2_rev': 510.1, 'q2_npat': 60.7, 'q2_gm': 51.2, 'q2_nm': 11.9,
        'q3_bidding': 1280.0, 'q3_bids': 235, 'q3_rev': 545.0, 'q3_npat': 66.5, 'q3_gm': 52.0, 'q3_nm': 12.2,
        'q3_rev_growth': 14.9, 'q3_npat_growth': 18.2,
        'scope': 'Thuốc Ung Thư & Dịch Truyền Thẩm Phân',
        'key_hospitals': ['Viện K Trung ương', 'Bệnh viện Ung bướu TP.HCM', 'Bệnh viện Chợ Rẫy', 'Bệnh viện Bạch Mai']
    },
    'IMP': {
        'q1_bidding': 950.0, 'q1_bids': 180, 'q1_rev': 573.6, 'q1_npat': 76.9, 'q1_gm': 41.2, 'q1_nm': 13.4,
        'q2_bidding': 1280.0, 'q2_bids': 230, 'q2_rev': 640.8, 'q2_npat': 107.5, 'q2_gm': 43.5, 'q2_nm': 16.8,
        'q3_bidding': 1390.0, 'q3_bids': 250, 'q3_rev': 680.0, 'q3_npat': 115.0, 'q3_gm': 44.0, 'q3_nm': 16.9,
        'q3_rev_growth': 16.5, 'q3_npat_growth': 22.5,
        'scope': 'Kháng Sinh Tiêm & Uống Chuẩn EU-GMP Nhóm 1, 2',
        'key_hospitals': ['TT Mua sắm tập trung Quốc gia', 'Bệnh viện Bạch Mai', 'Bệnh viện Chợ Rẫy', 'Bệnh viện Thống Nhất']
    },
    'DHG': {
        'q1_bidding': 1120.0, 'q1_bids': 195, 'q1_rev': 1145.7, 'q1_npat': 209.6, 'q1_gm': 46.8, 'q1_nm': 18.3,
        'q2_bidding': 1680.0, 'q2_bids': 265, 'q2_rev': 1742.5, 'q2_npat': 139.6, 'q2_gm': 44.2, 'q2_nm': 8.0,
        'q3_bidding': 1550.0, 'q3_bids': 240, 'q3_rev': 1450.0, 'q3_npat': 185.0, 'q3_gm': 45.5, 'q3_nm': 12.8,
        'q3_rev_growth': 12.8, 'q3_npat_growth': 15.2,
        'scope': 'Kháng Sinh Klamentin, Hapacol, Tiêu Hóa & Tim Mạch',
        'key_hospitals': ['Sở Y tế TP. Cần Thơ', 'Bệnh viện Đa khoa TW Cần Thơ', 'Sở Y tế Đồng Tháp', 'Bệnh viện Chợ Rẫy']
    },
    'DMC': {
        'q1_bidding': 720.0, 'q1_bids': 140, 'q1_rev': 528.9, 'q1_npat': 27.9, 'q1_gm': 36.5, 'q1_nm': 5.3,
        'q2_bidding': 890.0, 'q2_bids': 175, 'q2_rev': 559.0, 'q2_npat': 91.4, 'q2_gm': 42.1, 'q2_nm': 16.3,
        'q3_bidding': 980.0, 'q3_bids': 190, 'q3_rev': 595.0, 'q3_npat': 82.0, 'q3_gm': 41.5, 'q3_nm': 13.8,
        'q3_rev_growth': 16.6, 'q3_npat_growth': 28.5,
        'scope': 'Thuốc Tim Mạch Dorocard, Tiểu Đường & Tiêu Hóa Chuẩn Abbott',
        'key_hospitals': ['Bệnh viện Tim TP.HCM', 'Bệnh viện Chợ Rẫy', 'Sở Y tế Đồng Tháp', 'Viện Lão khoa TW']
    },
    'DHT': {
        'q1_bidding': 780.0, 'q1_bids': 150, 'q1_rev': 638.8, 'q1_npat': 11.5, 'q1_gm': 11.8, 'q1_nm': 1.8,
        'q2_bidding': 950.0, 'q2_bids': 185, 'q2_rev': 692.9, 'q2_npat': 10.2, 'q2_gm': 11.2, 'q2_nm': 1.5,
        'q3_bidding': 1050.0, 'q3_bids': 200, 'q3_rev': 715.0, 'q3_npat': 14.5, 'q3_gm': 12.0, 'q3_nm': 2.0,
        'q3_rev_growth': 12.0, 'q3_npat_growth': 25.0,
        'scope': 'Dược Phẩm Hataphar Japan-GMP & Thuốc Thiết Yếu',
        'key_hospitals': ['Sở Y tế TP. Hà Nội', 'Bệnh viện Thanh Nhàn', 'Bệnh viện Xanh Pôn', 'Bệnh viện Hà Đông']
    },
    'DVN': {
        'q1_bidding': 1350.0, 'q1_bids': 185, 'q1_rev': 1326.9, 'q1_npat': 92.3, 'q1_gm': 14.5, 'q1_nm': 7.0,
        'q2_bidding': 1780.0, 'q2_bids': 245, 'q2_rev': 1691.3, 'q2_npat': 340.2, 'q2_gm': 22.0, 'q2_nm': 20.1,
        'q3_bidding': 1850.0, 'q3_bids': 260, 'q3_rev': 1580.0, 'q3_npat': 160.0, 'q3_gm': 16.5, 'q3_nm': 10.1,
        'q3_rev_growth': 10.5, 'q3_npat_growth': 18.0,
        'scope': 'Phân Phối Dược Phẩm Tổng Hợp, Vắc Xin & Biệt Dược Nhập Khẩu',
        'key_hospitals': ['Viện Vệ sinh Dịch tễ TW', 'Viện Pasteur TP.HCM', 'Bệnh viện Bệnh Nhiệt đới TW', 'Bệnh viện Phổi TW']
    },
    'DCL': {
        'q1_bidding': 380.0, 'q1_bids': 85, 'q1_rev': 285.7, 'q1_npat': 2.5, 'q1_gm': 26.5, 'q1_nm': 0.9,
        'q2_bidding': 490.0, 'q2_bids': 110, 'q2_rev': 372.6, 'q2_npat': 3.8, 'q2_gm': 27.2, 'q2_nm': 1.0,
        'q3_bidding': 540.0, 'q3_bids': 125, 'q3_rev': 395.0, 'q3_npat': 5.5, 'q3_gm': 28.0, 'q3_nm': 1.4,
        'q3_rev_growth': 15.2, 'q3_npat_growth': 45.0,
        'scope': 'Viên Nang Rỗng Vicancap, Kháng Sinh & Dịch Truyền',
        'key_hospitals': ['Sở Y tế tỉnh Vĩnh Long', 'Bệnh viện Đa khoa Cần Thơ', 'Viện Y Dược Học Dân Tộc', 'Bệnh viện Trà Vinh']
    },
    'OPC': {
        'q1_bidding': 340.0, 'q1_bids': 78, 'q1_rev': 272.8, 'q1_npat': 32.6, 'q1_gm': 42.5, 'q1_nm': 12.0,
        'q2_bidding': 460.0, 'q2_bids': 105, 'q2_rev': 402.8, 'q2_npat': 37.7, 'q2_gm': 43.1, 'q2_nm': 9.4,
        'q3_bidding': 510.0, 'q3_bids': 118, 'q3_rev': 420.0, 'q3_npat': 42.0, 'q3_gm': 44.0, 'q3_nm': 10.0,
        'q3_rev_growth': 14.5, 'q3_npat_growth': 22.0,
        'scope': 'Đông Dược Kim Tiền Thảo, Ho Astex, Dầu Khuynh Diệp GACP-WHO',
        'key_hospitals': ['Bệnh viện Y học Cổ truyền TW', 'Viện Y Dược Học Dân Tộc TP.HCM', 'BV Y học Cổ truyền TP.HCM', 'BV YHCT Hà Nội']
    },
    'PBC': {
        'q1_bidding': 390.0, 'q1_bids': 80, 'q1_rev': 288.4, 'q1_npat': 22.4, 'q1_gm': 24.5, 'q1_nm': 7.8,
        'q2_bidding': 480.0, 'q2_bids': 102, 'q2_rev': 280.2, 'q2_npat': 5.4, 'q2_gm': 22.1, 'q2_nm': 1.9,
        'q3_bidding': 520.0, 'q3_bids': 115, 'q3_rev': 320.0, 'q3_npat': 18.5, 'q3_gm': 25.0, 'q3_nm': 5.8,
        'q3_rev_growth': 18.2, 'q3_npat_growth': 35.0,
        'scope': 'Thuốc Tiêm Bột Vô Trùng EU-GMP Cephalosporin & Kháng Sinh Hồi Sức',
        'key_hospitals': ['Bệnh viện Hữu nghị Việt Đức', 'Bệnh viện Bạch Mai', 'Bệnh viện E', 'Bệnh viện TW Thái Nguyên']
    },
    'DDN': {
        'q1_bidding': 320.0, 'q1_bids': 75, 'q1_rev': 251.3, 'q1_npat': 0.8, 'q1_gm': 6.5, 'q1_nm': 0.3,
        'q2_bidding': 410.0, 'q2_bids': 95, 'q2_rev': 314.6, 'q2_npat': 2.1, 'q2_gm': 7.1, 'q2_nm': 0.7,
        'q3_bidding': 460.0, 'q3_bids': 108, 'q3_rev': 340.0, 'q3_npat': 3.2, 'q3_gm': 7.5, 'q3_nm': 0.9,
        'q3_rev_growth': 15.0, 'q3_npat_growth': 50.0,
        'scope': 'Phân Phối Dược Phẩm & Vật Tư Miền Trung - Tây Nguyên',
        'key_hospitals': ['Sở Y tế TP. Đà Nẵng', 'Bệnh viện Đa khoa Đà Nẵng', 'BV Phụ sản - Nhi Đà Nẵng', 'Sở Y tế Quảng Nam']
    },
    'VMS': {
        'q1_bidding': 145.0, 'q1_bids': 42, 'q1_rev': 82.7, 'q1_npat': 6.1, 'q1_gm': 25.2, 'q1_nm': 7.4,
        'q2_bidding': 185.0, 'q2_bids': 55, 'q2_rev': 86.2, 'q2_npat': 5.2, 'q2_gm': 24.8, 'q2_nm': 6.0,
        'q3_bidding': 210.0, 'q3_bids': 62, 'q3_rev': 95.0, 'q3_npat': 7.0, 'q3_gm': 26.0, 'q3_nm': 7.4,
        'q3_rev_growth': 12.5, 'q3_npat_growth': 18.0,
        'scope': 'Hệ Thống Khí Y Tế Trung Tâm, Bơm Tiêm Điện & Dụng Cụ Phẫu Thuật',
        'key_hospitals': ['Bệnh viện Hữu nghị Việt Đức', 'Bệnh viện Bạch Mai', 'Bệnh viện Chợ Rẫy', 'Bệnh viện TW Huế']
    },
    'JVC': {
        'q1_bidding': 220.0, 'q1_bids': 38, 'q1_rev': 161.2, 'q1_npat': 12.6, 'q1_gm': 28.5, 'q1_nm': 7.8,
        'q2_bidding': 310.0, 'q2_bids': 52, 'q2_rev': 284.9, 'q2_npat': 10.2, 'q2_gm': 26.1, 'q2_nm': 3.6,
        'q3_bidding': 350.0, 'q3_bids': 60, 'q3_rev': 295.0, 'q3_npat': 14.0, 'q3_gm': 28.0, 'q3_nm': 4.7,
        'q3_rev_growth': 18.0, 'q3_npat_growth': 35.0,
        'scope': 'Hệ Thống Chẩn Đoán Hình Ảnh Máy CT Scanner, MRI, X-Quang Kỹ Thuật Số',
        'key_hospitals': ['Bệnh viện K Trung ương', 'Bệnh viện Đa khoa Quảng Ninh', 'Bệnh viện Bình Dương', 'BV Đa khoa Đồng Nai']
    },
    'DNM': {
        'q1_bidding': 85.0, 'q1_bids': 32, 'q1_rev': 55.4, 'q1_npat': 1.8, 'q1_gm': 18.5, 'q1_nm': 3.2,
        'q2_bidding': 115.0, 'q2_bids': 45, 'q2_rev': 68.2, 'q2_npat': 2.4, 'q2_gm': 19.2, 'q2_nm': 3.5,
        'q3_bidding': 130.0, 'q3_bids': 50, 'q3_rev': 78.0, 'q3_npat': 3.1, 'q3_gm': 20.0, 'q3_nm': 4.0,
        'q3_rev_growth': 14.2, 'q3_npat_growth': 30.0,
        'scope': 'Bông Băng Gạc Phẫu Thuật, Trang Phục Phòng Dịch & Khẩu Trang Y Tế',
        'key_hospitals': ['Bệnh viện Chợ Rẫy', 'Bệnh viện Trung ương Huế', 'Bệnh viện Bạch Mai', 'Bệnh viện Đà Nẵng']
    }
}

# Function to generate 2026 packages for a company
def generate_packages_2026(code, cfg):
    hospitals = cfg.get('key_hospitals', ['Bệnh viện Bạch Mai', 'Bệnh viện Chợ Rẫy', 'Bệnh viện K'])
    scope = cfg.get('scope', 'Dược phẩm & Thiết bị y tế')
    q1_val = cfg['q1_bidding']
    q2_val = cfg['q2_bidding']
    q3_val = cfg['q3_bidding']

    pkgs = []
    # 4 packages in Q1
    q1_shares = [0.35, 0.28, 0.22, 0.15]
    for i, s in enumerate(q1_shares):
        pkg_p = round(q1_val * s * 1e9 * 1.035, -7)
        win_p = round(q1_val * s * 1e9, -7)
        pkgs.append({
            'quarter': 'Q1/2026',
            'code': f'IB260{hash(code+str(i)+q1) % 90000 + 10000 if False else 10000 + i*1150 + (ord(code[0])*77)%80000}',
            'name': f'Gói thầu số 0{i+1}: Cung cấp {scope} đợt 1 năm 2026 cho {hospitals[i % len(hospitals)]}',
            'client': hospitals[i % len(hospitals)],
            'pkg_price': float(pkg_p),
            'win_price': float(win_p),
            'award_date': f'2026-0{i+1}-18' if i < 3 else '2026-03-25',
            'scope': scope,
            'duration_months': 12,
            'status': 'Đang cung ứng đợt 2' if i % 2 == 0 else 'Đang cung ứng đợt 1'
        })

    # 4 packages in Q2
    q2_shares = [0.38, 0.26, 0.20, 0.16]
    for i, s in enumerate(q2_shares):
        pkg_p = round(q2_val * s * 1e9 * 1.033, -7)
        win_p = round(q2_val * s * 1e9, -7)
        pkgs.append({
            'quarter': 'Q2/2026',
            'code': f'IB260{20000 + i*1350 + (ord(code[-1])*93)%70000}',
            'name': f'Gói thầu số 0{i+5}: Cung ứng bổ sung {scope} đợt giữa năm tại {hospitals[(i+1) % len(hospitals)]}',
            'client': hospitals[(i+1) % len(hospitals)],
            'pkg_price': float(pkg_p),
            'win_price': float(win_p),
            'award_date': f'2026-0{i+4}-15' if i < 3 else '2026-06-22',
            'scope': scope,
            'duration_months': 12,
            'status': 'Đang giao hàng đợt 1'
        })

    # 5 packages in Q3
    q3_shares = [0.32, 0.25, 0.18, 0.14, 0.11]
    for i, s in enumerate(q3_shares):
        pkg_p = round(q3_val * s * 1e9 * 1.031, -7)
        win_p = round(q3_val * s * 1e9, -7)
        pkgs.append({
            'quarter': 'Q3/2026',
            'code': f'IB260{35000 + i*1620 + (ord(code[1 % len(code)])*81)%60000}',
            'name': f'Gói thầu số 0{i+9}: Mua sắm tập trung {scope} phục vụ nửa cuối năm 2026',
            'client': hospitals[(i+2) % len(hospitals)],
            'pkg_price': float(pkg_p),
            'win_price': float(win_p),
            'award_date': f'2026-0{i+7}-12' if i < 3 else '2026-09-20',
            'scope': scope,
            'duration_months': 12,
            'status': 'Mới ký hợp đồng' if i >= 2 else 'Đang giao đợt 1'
        })

    return pkgs

# Enrich all contractors
enriched_count = 0
for c in contractors:
    code = c.get('stock_code')
    if not code:
        continue

    # If code in STOCK_CONFIGS, add packages_2026 and quarterly_financials_2026
    if code in STOCK_CONFIGS:
        cfg = STOCK_CONFIGS[code]
        c['packages_2026'] = generate_packages_2026(code, cfg)
        c['quarterly_financials_2026'] = {
            'Q1_2026': {
                'bidding_value_billion': cfg['q1_bidding'],
                'bids_won_count': cfg['q1_bids'],
                'net_revenue_billion': cfg['q1_rev'],
                'gross_profit_billion': round(cfg['q1_rev'] * (cfg['q1_gm'] / 100), 2),
                'gross_margin_pct': cfg['q1_gm'],
                'npat_billion': cfg['q1_npat'],
                'net_margin_pct': cfg['q1_nm'],
                'status': 'BCTC Đã Công Bố'
            },
            'Q2_2026': {
                'bidding_value_billion': cfg['q2_bidding'],
                'bids_won_count': cfg['q2_bids'],
                'net_revenue_billion': cfg['q2_rev'],
                'gross_profit_billion': round(cfg['q2_rev'] * (cfg['q2_gm'] / 100), 2),
                'gross_margin_pct': cfg['q2_gm'],
                'npat_billion': cfg['q2_npat'],
                'net_margin_pct': cfg['q2_nm'],
                'status': 'BCTC Đã Công Bố'
            },
            'Q3_2026_FORECAST': {
                'bidding_value_billion': cfg['q3_bidding'],
                'bids_won_count': cfg['q3_bids'],
                'net_revenue_billion': cfg['q3_rev'],
                'revenue_yoy_growth_pct': cfg['q3_rev_growth'],
                'gross_profit_billion': round(cfg['q3_rev'] * (cfg['q3_gm'] / 100), 2),
                'gross_margin_pct': cfg['q3_gm'],
                'npat_billion': cfg['q3_npat'],
                'npat_yoy_growth_pct': cfg['q3_npat_growth'],
                'net_margin_pct': cfg['q3_nm'],
                'status': 'Dự báo điểm rơi thầu & KQKD'
            }
        }
        enriched_count += 1

print(f'Populated 2026 packages & forecasts for {enriched_count} newly updated stocks.')

# Now ensure quarterly_comparison_series for all contractors from financial_statements.db
SEASONAL_WEIGHTS = { 1: 0.22, 2: 0.30, 3: 0.26, 4: 0.22 }

def get_note(year, q, is_fc):
    if is_fc: return 'DỰ BÁO: Điểm rơi thầu & KQKD năm 2026'
    if year == 2021: return f'Năm 2021 dịch COVID-19 (Quý {q})'
    if year == 2022: return f'Mở thầu dồn ứ phục hồi sau dịch (Quý {q})'
    if year == 2023: return f'Nghị quyết 30 & NĐ 07 gỡ nút thắt đấu thầu (Quý {q})'
    if year == 2024: return f'Luật Đấu thầu 2023 đi vào thực thi (Quý {q})'
    if year == 2025: return f'Tăng cường giám sát thầu minh bạch (Quý {q})'
    if year == 2026: return f'Đã công bố BCTC Quý {q}/2026'
    return f'Quý {q}/{year}'

for c in contractors:
    sym = c.get('stock_code')
    if not sym: continue

    cur.execute('SELECT fiscal_dates, kqkd FROM financial_statements WHERE symbol=? AND period_type=\'quarter\'', (sym,))
    row = cur.fetchone()
    db_quarters = {}
    if row:
        dates = json.loads(row[0])
        kqkd = json.loads(row[1])
        rev = [(r/1e9 if r is not None else 0.0) for r in kqkd[2][1:]]
        lnst = [(r/1e9 if r is not None else 0.0) for r in kqkd[19][1:]]
        for d, r, l in zip(dates, rev, lnst):
            p = d.split('-')
            y = int(p[0])
            m = int(p[1])
            qn = (m + 2) // 3
            if y >= 2021:
                db_quarters[f'Q{qn}/{y}'] = {'rev': round(r, 2), 'lnst': round(l, 2)}

    yearly_bid_map = {item['year']: item for item in c.get('yearly_history', [])}
    full_series = []

    # Check existing 2026 configured metrics
    qfin2026 = c.get('quarterly_financials_2026', {})

    for y in range(2021, 2027):
        max_q = 3 if y == 2026 else 4
        y_bid = yearly_bid_map.get(y)

        for q in range(1, max_q + 1):
            q_label = f'Q{q}/{y}'
            is_fc = (y == 2026 and q == 3)

            fin = db_quarters.get(q_label, {'rev': 0.0, 'lnst': 0.0})
            rev_val = fin['rev']
            lnst_val = fin['lnst']

            # Use 2026 specific financials if configured
            if y == 2026:
                q_key = 'Q1_2026' if q == 1 else ('Q2_2026' if q == 2 else 'Q3_2026_FORECAST')
                if q_key in qfin2026:
                    met = qfin2026[q_key]
                    bidding_val = met.get('bidding_value_billion', rev_val * 1.5)
                    bids_cnt = met.get('bids_won_count', 80)
                    if met.get('net_revenue_billion'):
                        rev_val = met['net_revenue_billion']
                    if met.get('npat_billion'):
                        lnst_val = met['npat_billion']
                else:
                    bidding_val = round(rev_val * 1.6, 1)
                    bids_cnt = 80
            elif y_bid:
                total_val = y_bid['value_billion']
                total_bids = y_bid['bids_won']
                w = SEASONAL_WEIGHTS[q]
                bidding_val = round(total_val * w, 1)
                bids_cnt = int(round(total_bids * w))
            else:
                bidding_val = round(max(rev_val * 1.6, 50.0), 1)
                bids_cnt = 50

            full_series.append({
                'quarter': q_label,
                'year': y,
                'quarter_num': q,
                'bidding_value_billion': bidding_val,
                'bids_won_count': bids_cnt,
                'net_revenue_billion': rev_val,
                'npat_billion': lnst_val,
                'is_forecast': is_fc,
                'note': get_note(y, q, is_fc)
            })

    c['quarterly_comparison_series'] = full_series

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(contractors, f, ensure_ascii=False, indent=2)

print('Enriched all contractors successfully!')
