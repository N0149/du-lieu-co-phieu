import re
import unicodedata
from typing import Any

def clean_vessel_name(raw: str) -> str:
    """
    Standardize vessel names by removing status markers, garbage symbols,
    trailing parenthetical notes, and extra whitespace.
    """
    if not raw:
        return ""
    
    # Truncate overly long strings to prevent quadratic regex issues
    s = str(raw).strip()[:200]
    
    # Remove leading asterisks, dashes, dots or symbols (e.g. "* HAIAN BELL")
    s = re.sub(r"^[^0-9A-Za-zÀ-ỹ]+", "", s)
    
    # Remove trailing parenthetical remarks like (SB), (HP), (VN), etc.
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    
    # Collapse multiple whitespaces
    s = re.sub(r"\s+", " ", s).strip()
    
    return s.upper()

def vessel_slug(name: str) -> str:
    """
    Convert a vessel name into a clean, URL-safe slug.
    Example: 'NEW MINGZHOU 60' -> 'new-mingzhou-60'
             'HẢI AN BELL' -> 'hai-an-bell'
    """
    if not name:
        return ""
    
    # Normalize unicode (decompose accents)
    nfkd = unicodedata.normalize('NFKD', name)
    no_accents = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    
    # Lowercase and replace non-alphanumeric with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', no_accents.lower()).strip('-')
    return slug

def parse_tonnage(value: Any) -> int:
    """Safely parse numbers like '13.295', '13,295', '13295', 13295 -> integer."""
    if value is None:
        return 0
    s = str(value).strip()
    if not s or s == '-' or s == '—':
        return 0
    # If standard Vietnamese formatting with dot as thousand separator (e.g. 13.295)
    s = s.replace('.', '').replace(',', '')
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 0

def parse_float(value: Any) -> float:
    """Safely parse floats like '6,9', '6.9' -> 6.9"""
    if value is None:
        return 0.0
    s = str(value).strip().replace(',', '.')
    if not s or s == '-' or s == '—':
        return 0.0
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0
