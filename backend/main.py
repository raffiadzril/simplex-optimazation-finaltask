from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from pulp import *
import math
import pandas as pd
from datetime import datetime

app = FastAPI(
    title="Bakery Optimization API",
    description="API untuk optimasi produksi bakery dengan data dari Google Sheets",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Google Sheets Configuration ============
SHEET_ID = "1rj8Ayd35jzFpiMnMvlftJU8MlwuZgbulH3zH7mQ6e9A"
GID_BAHAN = 0
GID_RESEP = 1567387597
GID_PARAMETER = 799126135

def get_sheet_url(gid: int) -> str:
    """Generate CSV export URL for Google Sheet"""
    return f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"

def parse_indonesian_number(value: str) -> float:
    """Parse Indonesian format number (comma as decimal, dots as thousand separator)
    Contoh: '0,03' -> 0.03 atau '27.000' -> 27000
    """
    if isinstance(value, (int, float)):
        return float(value)
    
    value = str(value).strip()
    # Remove Rp prefix if exists
    if value.startswith('Rp'):
        value = value[2:].strip()
    # Replace comma with dot for decimal
    value = value.replace(',', '.')
    # Remove dots used as thousand separator (dots before 3 digits from end)
    # e.g., 1.234.567,89 -> 1234567.89
    parts = value.split('.')
    if len(parts) > 2:
        # Multiple dots - last part should be decimal, rest are thousand separators
        decimal_part = parts[-1]
        if len(decimal_part) == 2:  # likely decimal
            integer_parts = ''.join(parts[:-1])
            value = f"{integer_parts}.{decimal_part}"
        else:
            value = ''.join(parts)
    elif len(parts) == 2 and len(parts[-1]) == 2:
        # Single dot - could be decimal separator or thousand separator
        # If last part has 2 digits, likely decimal
        pass  # keep as is with dot
    else:
        # Single dot with 3+ digits after = thousand separator
        if len(parts) == 2 and len(parts[-1]) > 2:
            value = ''.join(parts)
    
    return float(value)

# ============ Data Model ============
class StokBahan(BaseModel):
    telur: float = 10
    tepung: float = 15
    coklat: float = 9
    keju: float = 7
    gula: float = 7
    mentega: float = 10

class HargaBahan(BaseModel):
    telur: float = 32000
    tepung: float = 15000
    coklat: float = 12000
    keju: float = 15000
    gula: float = 20000
    mentega: float = 15000

class OptimasiRequest(BaseModel):
    margin: Optional[float] = None
    stok_bahan: Optional[StokBahan] = None
    harga_bahan: Optional[HargaBahan] = None

class ProduktionResult(BaseModel):
    roti_coklat: int = 0
    roti_keju: int = 0
    croissant_coklat: int = 0
    croissant_keju: int = 0

class BiayaProduk(BaseModel):
    roti_coklat: float = 0
    roti_keju: float = 0
    croissant_coklat: float = 0
    croissant_keju: float = 0

class OptimasiResponse(BaseModel):
    status: str
    jumlah_produksi_optimal: ProduktionResult
    profit_maksimum: float
    biaya_produk: BiayaProduk
    harga_produk: BiayaProduk
    harga_produk_bulat: BiayaProduk
    profit_per_produk: BiayaProduk

class DataStatus(BaseModel):
    bahan_loaded: bool
    resep_loaded: bool
    parameter_loaded: bool
    last_update: str
    total_produk: int
    total_bahan: int

# ============ Global Data Storage ============
class DataStore:
    def __init__(self):
        self.harga_bahan = {}
        self.stok_bahan = {}
        self.resep = {}
        self.parameter = {}
        self.last_update = None
        self.bahan_loaded = False
        self.resep_loaded = False
        self.parameter_loaded = False

data_store = DataStore()

# ============ Data Loading Functions ============
def load_bahan_dari_sheets():
    """Load bahan data dari Google Sheets"""
    try:
        url = get_sheet_url(GID_BAHAN)
        df = pd.read_csv(url)
        
        # Reset data
        data_store.harga_bahan = {}
        data_store.stok_bahan = {}
        
        # Populate dari CSV
        for _, row in df.iterrows():
            nama = row['nama_bahan'].strip().lower()
            data_store.harga_bahan[nama] = parse_indonesian_number(row['harga'])
            data_store.stok_bahan[nama] = parse_indonesian_number(row['stok'])
        
        data_store.bahan_loaded = True
        print(f"Bahan loaded: {len(data_store.harga_bahan)} items")
        return True
    except Exception as e:
        print(f"Error loading bahan: {str(e)}")
        import traceback
        traceback.print_exc()
        data_store.bahan_loaded = False
        return False

def load_resep_dari_sheets():
    """Load resep data dari Google Sheets"""
    try:
        url = get_sheet_url(GID_RESEP)
        print(f"Loading resep from: {url}")
        df = pd.read_csv(url)
        print(f"Columns found: {df.columns.tolist()}")
        
        # Reset data
        data_store.resep = {}
        
        # Populate dari CSV
        for _, row in df.iterrows():
            produk = row['produk'].strip().lower()
            bahan = row['bahan'].strip().lower()
            
            # Try different column names and convert to kg
            jumlah = None
            if 'jumlah (gram)' in df.columns and pd.notna(row['jumlah (gram)']):
                # Convert from gram to kg
                jumlah = parse_indonesian_number(row['jumlah (gram)']) / 1000
            elif 'jumlah(kg)' in df.columns and pd.notna(row['jumlah(kg)']):
                jumlah = parse_indonesian_number(row['jumlah(kg)'])
            elif 'jumlah' in df.columns and pd.notna(row['jumlah']):
                jumlah = parse_indonesian_number(row['jumlah'])
            else:
                raise ValueError(f"Column 'jumlah' atau 'jumlah(kg)' atau 'jumlah (gram)' tidak ditemukan. Kolom: {df.columns.tolist()}")
            
            if produk not in data_store.resep:
                data_store.resep[produk] = {}
            
            data_store.resep[produk][bahan] = jumlah
        
        data_store.resep_loaded = True
        print(f"Resep loaded: {len(data_store.resep)} produk")
        return True
    except Exception as e:
        print(f"Error loading resep: {str(e)}")
        import traceback
        traceback.print_exc()
        data_store.resep_loaded = False
        return False

def load_parameter_dari_sheets():
    """Load parameter data dari Google Sheets"""
    try:
        url = get_sheet_url(GID_PARAMETER)
        print(f"Loading parameter from: {url}")
        df = pd.read_csv(url)
        print(f"Columns found: {df.columns.tolist()}")
        
        # Reset data
        data_store.parameter = {}
        
        # Populate dari CSV
        for _, row in df.iterrows():
            param_name = row['parameter'].strip().lower()
            param_value = row['nilai']
            
            # Try to convert to float if possible
            try:
                data_store.parameter[param_name] = float(param_value)
            except:
                data_store.parameter[param_name] = param_value
        
        data_store.parameter_loaded = True
        print(f"Parameter loaded: {len(data_store.parameter)} items")
        return True
    except Exception as e:
        print(f"❌ Error loading parameter: {str(e)}")
        import traceback
        traceback.print_exc()
        data_store.parameter_loaded = False
        return False

def load_all_data():
    """Load semua data dari Google Sheets"""
    print("\n📥 Loading data from Google Sheets...")
    load_bahan_dari_sheets()
    load_resep_dari_sheets()
    load_parameter_dari_sheets()
    data_store.last_update = datetime.now().isoformat()
    print(f"✅ All data loaded at {data_store.last_update}\n")

# ============ Data Default ============
RESEP = {
    "roti_coklat": {
        "tepung": 1/8,
        "telur": 1,
        "coklat": 1/4,
        "gula": 1/10,
        "mentega": 1/12
    },
    "roti_keju": {
        "tepung": 1/8,
        "telur": 1,
        "keju": 1/5,
        "gula": 1/10,
        "mentega": 1/12
    },
    "croissant_coklat": {
        "tepung": 1/6,
        "telur": 2,
        "coklat": 1/3,
        "mentega": 1/5
    },
    "croissant_keju": {
        "tepung": 1/6,
        "telur": 2,
        "keju": 1/4,
        "mentega": 1/5
    }
}

# ============ Fungsi Helper ============
def hitung_biaya_produk(harga_bahan: Dict[str, float], resep: Dict) -> Dict[str, float]:
    """Menghitung biaya produksi setiap produk"""
    biaya = {}
    for produk, bahan in resep.items():
        total = 0
        for nama_bahan, jumlah in bahan.items():
            harga = harga_bahan.get(nama_bahan, 0)
            total += harga * jumlah
        biaya[produk] = total
    return biaya

def hitung_harga_produk(biaya: Dict[str, float], margin: float) -> Dict[str, float]:
    """Menghitung harga jual dengan margin"""
    harga_produk = {}
    for produk, biaya_produk in biaya.items():
        harga_produk[produk] = biaya_produk + biaya_produk * margin
    return harga_produk

def hitung_harga_bulat(harga_produk: Dict[str, float]) -> Dict[str, float]:
    """Membulatkan harga ke kelipatan 1000 terdekat"""
    harga_bulat = {}
    for produk, harga in harga_produk.items():
        harga_bulat[produk] = math.ceil(harga / 1000) * 1000
    return harga_bulat

def hitung_profit(harga_bulat: Dict[str, float], biaya: Dict[str, float]) -> Dict[str, float]:
    """Menghitung profit per produk"""
    profit = {}
    for produk in harga_bulat:
        profit[produk] = harga_bulat[produk] - biaya[produk]
    return profit

def jalankan_optimasi(harga_bahan: Dict[str, float], stok_bahan: Dict[str, float], resep: Dict, margin: float):
    """Menjalankan linear programming optimization"""
    
    # Hitung biaya, harga, dan profit
    biaya = hitung_biaya_produk(harga_bahan, resep)
    harga_produk = hitung_harga_produk(biaya, margin)
    harga_bulat = hitung_harga_bulat(harga_produk)
    profit = hitung_profit(harga_bulat, biaya)
    
    # Setup model LP
    model = LpProblem("optimasi_bakery", LpMaximize)
    
    produk_list = list(resep.keys())
    x = LpVariable.dicts(
        "Produksi",
        produk_list,
        lowBound=0,
        cat="Integer"
    )
    
    # Objective function - maximize profit
    model += lpSum(
        profit[p] * x[p]
        for p in produk_list
    )
    
    # Constraints - bahan tidak boleh melebihi stok
    for bahan in stok_bahan:
        model += lpSum(
            resep[produk].get(bahan, 0) * x[produk]
            for produk in produk_list
        ) <= stok_bahan[bahan]
    
    # Solve
    model.solve()
    
    # Ekstrak hasil
    hasil_produksi = {produk: int(x[produk].varValue if x[produk].varValue is not None else 0) for produk in produk_list}
    profit_maksimum = float(value(model.objective)) if value(model.objective) is not None else 0
    
    return {
        "status": LpStatus[model.status],
        "jumlah_produksi_optimal": hasil_produksi,
        "profit_maksimum": profit_maksimum,
        "biaya_produk": biaya,
        "harga_produk": harga_produk,
        "harga_produk_bulat": harga_bulat,
        "profit_per_produk": profit
    }

# ============ Startup Event ============
@app.on_event("startup")
async def startup_event():
    """Load data saat startup"""
    load_all_data()

# ============ Endpoints ============
@app.get("/", tags=["Root"])
async def root():
    """Endpoint root"""
    return {
        "message": "Bakery Optimization API v2.0",
        "version": "2.0.0",
        "docs": "/docs",
        "data_source": "Google Sheets",
        "sheet_id": SHEET_ID
    }

@app.get("/data-status", response_model=DataStatus, tags=["Data"])
async def get_data_status():
    """Mendapatkan status data loading"""
    return DataStatus(
        bahan_loaded=data_store.bahan_loaded,
        resep_loaded=data_store.resep_loaded,
        parameter_loaded=data_store.parameter_loaded,
        last_update=data_store.last_update or "Not loaded yet",
        total_produk=len(data_store.resep),
        total_bahan=len(data_store.harga_bahan)
    )

@app.post("/reload-data", tags=["Data"])
async def reload_data():
    """Reload semua data dari Google Sheets"""
    try:
        load_all_data()
        return {
            "status": "success",
            "message": "Data reloaded successfully",
            "last_update": data_store.last_update,
            "total_produk": len(data_store.resep),
            "total_bahan": len(data_store.harga_bahan)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reloading data: {str(e)}"
        )

@app.post("/optimize", response_model=OptimasiResponse, tags=["Optimization"])
async def optimize(request: OptimasiRequest):
    """
    Endpoint untuk menjalankan optimasi produksi bakery
    Data diambil dari Google Sheets, bisa di-override dengan request body
    """
    try:
        # Check if data loaded
        if not data_store.bahan_loaded or not data_store.resep_loaded:
            raise HTTPException(
                status_code=503,
                detail="Data not fully loaded from Google Sheets. Try /reload-data"
            )
        
        # Gunakan nilai dari sheets, atau override dengan request
        harga_bahan = request.harga_bahan.dict() if request.harga_bahan else data_store.harga_bahan
        stok_bahan = request.stok_bahan.dict() if request.stok_bahan else data_store.stok_bahan
        margin = request.margin if request.margin is not None else data_store.parameter.get('margin', 0.3)
        
        # Validasi
        if not harga_bahan:
            raise HTTPException(status_code=400, detail="Harga bahan tidak tersedia")
        if not stok_bahan:
            raise HTTPException(status_code=400, detail="Stok bahan tidak tersedia")
        if not data_store.resep:
            raise HTTPException(status_code=400, detail="Resep tidak tersedia")
        
        hasil = jalankan_optimasi(harga_bahan, stok_bahan, data_store.resep, margin)
        
        if hasil["status"] != "Optimal":
            raise HTTPException(
                status_code=400,
                detail=f"Optimization failed with status: {hasil['status']}"
            )
        
        return OptimasiResponse(
            status=hasil["status"],
            jumlah_produksi_optimal=ProduktionResult(**hasil["jumlah_produksi_optimal"]),
            profit_maksimum=hasil["profit_maksimum"],
            biaya_produk=BiayaProduk(**hasil["biaya_produk"]),
            harga_produk=BiayaProduk(**hasil["harga_produk"]),
            harga_produk_bulat=BiayaProduk(**hasil["harga_produk_bulat"]),
            profit_per_produk=BiayaProduk(**hasil["profit_per_produk"])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )

@app.get("/bahan", tags=["Data"])
async def get_bahan():
    """Mendapatkan data bahan dari sheets"""
    if not data_store.bahan_loaded:
        raise HTTPException(status_code=503, detail="Bahan data not loaded")
    
    return {
        "harga_bahan": data_store.harga_bahan,
        "stok_bahan": data_store.stok_bahan,
        "total_items": len(data_store.harga_bahan)
    }

@app.get("/resep", tags=["Data"])
async def get_resep():
    """Mendapatkan data resep dari sheets"""
    if not data_store.resep_loaded:
        raise HTTPException(status_code=503, detail="Resep data not loaded")
    
    return {
        "resep": data_store.resep,
        "total_produk": len(data_store.resep)
    }

@app.get("/parameter", tags=["Data"])
async def get_parameter():
    """Mendapatkan data parameter dari sheets"""
    if not data_store.parameter_loaded:
        raise HTTPException(status_code=503, detail="Parameter data not loaded")
    
    return {
        "parameter": data_store.parameter,
        "total_items": len(data_store.parameter)
    }

@app.post("/calculate-costs", tags=["Utilities"])
async def calculate_costs(harga_bahan: Optional[HargaBahan] = None):
    """Menghitung biaya produk tanpa optimasi"""
    try:
        harga = harga_bahan.dict() if harga_bahan else data_store.harga_bahan
        
        if not harga:
            raise HTTPException(status_code=400, detail="Harga bahan tidak tersedia")
        if not data_store.resep:
            raise HTTPException(status_code=400, detail="Resep tidak tersedia")
        
        biaya = hitung_biaya_produk(harga, data_store.resep)
        
        return {
            "biaya_produk": biaya
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )

@app.get("/default-values", tags=["Reference"])
async def get_default_values():
    """Mendapatkan nilai-nilai default"""
    return {
        "resep": RESEP,
        "harga_bahan_default": {
            "telur": 32000,
            "tepung": 15000,
            "coklat": 12000,
            "keju": 15000,
            "gula": 20000,
            "mentega": 15000
        },
        "stok_bahan_default": {
            "telur": 10,
            "tepung": 15,
            "coklat": 9,
            "keju": 7,
            "gula": 7,
            "mentega": 10
        },
        "margin_default": 0.3
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
