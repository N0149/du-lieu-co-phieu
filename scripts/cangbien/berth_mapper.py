import unicodedata
import re
from typing import Optional, Dict, Tuple, Any

def normalize_key(text: str) -> str:
    """Normalize a berth or string to uppercase ASCII without punctuation."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', str(text))
    no_accents = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    clean = re.sub(r'[^a-zA-Z0-9\s]+', ' ', no_accents)
    return re.sub(r'\s+', ' ', clean).strip().upper()

# Master Dictionary of known berths and stock mappings
BERTH_RULES = [
    # --- Hải Phòng ---
    {"patterns": ["DINH VU", "CANG DINH VU"], "ticker": "DVP", "slug": "dinh-vu", "name": "Cảng Đình Vũ", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["DOAN XA", "CANG DOAN XA"], "ticker": "DXP", "slug": "doan-xa", "name": "Cảng Đoạn Xá", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["TAN VU", "TÂN VŨ", "CANG TAN VU"], "ticker": "PHP", "slug": "tan-vu", "name": "Tân Vũ", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["CHUA VE", "CHÙA VẼ"], "ticker": "PHP", "slug": "chua-ve", "name": "Chùa Vẽ", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["HOANG DIEU", "HOÀNG DIỆU"], "ticker": "PHP", "slug": "hoang-dieu", "name": "Hoàng Diệu", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["HTIT", "LACH HUYEN 3", "LACH HUYEN 4", "LACH HUYEN 3 4", "HHIT"], "ticker": "PHP", "slug": "htit", "name": "HTIT (Lạch Huyện 3-4)", "authority": "haiphong", "deep_sea": True},
    {"patterns": ["VIP GREEN", "VIP GREEN PORT", "VIPGREEN"], "ticker": "VGR", "slug": "vip-green-port", "name": "VIP Green Port", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["NAM DINH VU", "NAM ĐÌNH VŨ", "NDV"], "ticker": "GMD", "slug": "nam-dinh-vu", "name": "Nam Đình Vũ", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["NAM HAI DINH VU", "NHDV"], "ticker": "GMD", "slug": "nam-hai-dinh-vu", "name": "Nam Hải Đình Vũ (cũ)", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["HAI AN", "CANG HAI AN", "HAH"], "ticker": "HAH", "slug": "hai-an", "name": "Cảng Hải An", "authority": "haiphong", "deep_sea": False},
    {"patterns": ["MIPEC", "CANG MIPEC", "MIPEC PORT", "MIPEC DINH VU", "CANG QUAN DOI MIPEC"], "ticker": "MIPEC", "slug": "mipec", "name": "Cảng MIPEC (Đình Vũ)", "authority": "haiphong", "deep_sea": False},
    
    # --- Quảng Ninh ---
    {"patterns": ["CAI LAN", "CÁI LÂN", "TONG HOP CAI LAN"], "ticker": "CQN", "slug": "ben-cang-tong-hop-cai-lan", "name": "Cái Lân (bến tổng hợp)", "authority": "quangninh", "deep_sea": True},
    {"patterns": ["CICT", "CONTAINER CAI LAN"], "ticker": None, "slug": "cict-cai-lan", "name": "Cảng Container Quốc tế Cái Lân (CICT)", "authority": "quangninh", "deep_sea": True},
    
    # --- TP.HCM & Cái Mép ---
    {"patterns": ["GEMALINK", "GEMALINK CAI MEP"], "ticker": "GMD", "slug": "gemalink-gemadept-cai-mep", "name": "Gemalink (Cái Mép)", "authority": "hcm", "deep_sea": True},
    {"patterns": ["PHUOC LONG", "ICD PHUOC LONG"], "ticker": "GMD", "slug": "phuoc-long", "name": "Phước Long", "authority": "hcm", "deep_sea": False},
    {"patterns": ["K12", "K12A", "K12B", "K12C", "K12C1", "TAN THUAN", "TÂN THUẬN"], "ticker": "SGP", "slug": "k12", "name": "Tân Thuận (K12)", "authority": "hcm", "deep_sea": False},
    {"patterns": ["K17", "TAN THUAN 2", "TÂN THUẬN 2"], "ticker": "SGP", "slug": "tan-t-2", "name": "Tân Thuận 2 (K17)", "authority": "hcm", "deep_sea": False},
    {"patterns": ["H PHUOC", "HIEP PHUOC", "HIỆP PHƯỚC", "SG HP", "SAI GON HIEP PHUOC"], "ticker": "SGP", "slug": "h-phuoc", "name": "Hiệp Phước", "authority": "hcm", "deep_sea": True},
    {"patterns": ["SPCT", "SAI GON PREMIER"], "ticker": "SGP", "slug": "spct", "name": "Cảng SPCT", "authority": "hcm", "deep_sea": True},
    {"patterns": ["VICT", "VIETNAM INTERNATIONAL CONTAINER"], "ticker": None, "slug": "vict", "name": "Cảng VICT", "authority": "hcm", "deep_sea": False},
    {"patterns": ["C LAI", "CAT LAI", "CÁT LÁI", "TAN CANG CAT LAI"], "ticker": "TCL", "slug": "cat-lai", "name": "Tân Cảng Cát Lái", "authority": "hcm", "deep_sea": False},
    {"patterns": ["SP ITC", "SPITC"], "ticker": None, "slug": "sp-itc", "name": "Cảng Quốc tế SP-ITC", "authority": "hcm", "deep_sea": False},
    
    # --- Đồng Nai ---
    {"patterns": ["LONG BINH TAN", "LONG BÌNH TÂN"], "ticker": "PDN", "slug": "ben-cang-dong-nai-phan-cang-long-binh-tan", "name": "Long Bình Tân", "authority": "dongnai", "deep_sea": False},
    {"patterns": ["GO DAU A", "GÒ DẦU A"], "ticker": "PDN", "slug": "ben-cang-go-dau-a", "name": "Gò Dầu A", "authority": "dongnai", "deep_sea": False},
    {"patterns": ["GO DAU B", "GÒ DẦU B", "GO DAU"], "ticker": "PDN", "slug": "ben-cang-go-dau-b", "name": "Gò Dầu B", "authority": "dongnai", "deep_sea": False},
    {"patterns": ["BINH DUONG", "BÌNH DƯƠNG", "CANG BINH DUONG"], "ticker": "GMD", "slug": "cang-binh-duong", "name": "Cảng Bình Dương", "authority": "dongnai", "deep_sea": False},

    # --- Đà Nẵng ---
    {"patterns": ["TIEN SA", "TIÊN SA", "CANG TIEN SA"], "ticker": "CDN", "slug": "ben-cang-tien-sa", "name": "Tiên Sa", "authority": "danang", "deep_sea": True},
    {"patterns": ["SON TRA", "SƠN TRÀ", "THO QUANG", "THỌ QUANG"], "ticker": "CDN", "slug": "ben-cang-son-tra", "name": "Sơn Trà / Thọ Quang", "authority": "danang", "deep_sea": False},
]

def map_berth_to_stock(raw_berth_name: str, fallback_authority: Optional[str] = None) -> Dict[str, Any]:
    """
    Given a raw berth string from a port authority schedule or manifest,
    map it to the corresponding stock ticker, standardized berth name, slug, and authority.
    """
    if not raw_berth_name:
        return {
            "berth_name": "Không xác định",
            "berth_slug": "unknown",
            "stock_ticker": None,
            "authority_id": fallback_authority or "haiphong",
            "is_deep_sea": False
        }
    
    norm = normalize_key(raw_berth_name)
    
    # Try exact or substring match in patterns
    for rule in BERTH_RULES:
        for p in rule["patterns"]:
            p_norm = normalize_key(p)
            if p_norm == norm or f" {p_norm} " in f" {norm} " or norm.startswith(p_norm) or norm.endswith(p_norm):
                return {
                    "berth_name": rule["name"],
                    "berth_slug": rule["slug"],
                    "stock_ticker": rule["ticker"],
                    "authority_id": rule["authority"],
                    "is_deep_sea": rule["deep_sea"]
                }
    
    # Default fallback
    slug = re.sub(r'[^a-z0-9]+', '-', norm.lower()).strip('-')
    return {
        "berth_name": raw_berth_name.strip(),
        "berth_slug": slug or "berth-unknown",
        "stock_ticker": None,
        "authority_id": fallback_authority or "haiphong",
        "is_deep_sea": False
    }
