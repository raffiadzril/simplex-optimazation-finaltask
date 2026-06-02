from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from pulp import *
import math
import pandas as pd
from datetime import datetime
import traceback as tb
from contextlib import asynccontextmanager

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load data saat aplikasi mulai
    print("lfg")
    load_all_data()
    yield
    # Shutdown: Cleanup (jika diperlukan)
    print("bye")

app = FastAPI(
    title="Bakery Optimization API",
    description="API",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sheets Configuration
SHEET_ID = "1rj8Ayd35jzFpiMnMvlftJU8MlwuZgbulH3zH7mQ6e9A"
GID_BAHAN = 0
GID_RESEP = 1567387597
GID_PARAMETER = 799126135

def get_sheet_url(gid: int):
    return f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"

def parse_indonesian_number(value: str) ->float:
    if isinstance(value,(int, float)):
        return float(value)
    value = str(value).strip()

    if value.startswith("Rp"):
        value = value[2:].strip()
    value = value.replace(',', '.')
    parts = value.split('.')

    if len(parts) > 2:
        decimal_part = parts[-1]
        if len(decimal_part) == 2:
            integer_parts = ''.join(parts[:-1])
            value = f"{integer_parts}.{decimal_part}"
        else:
            value = ''.join(parts)
    elif len(parts) == 2 and len(parts[-1]) == 2:
        pass
    else:
        if len(parts) == 2 and len(parts[-1]) > 2:
            value = ''.join(parts)
    return float(value)

class OptimasiRequest(BaseModel):
    margin:Optional[float] = None
    stok_bahan: Optional[Dict[str, float]] = None
    harga_bahan: Optional[Dict[str, float]] = None

class OptimasiResponse(BaseModel):
    status: str
    jumlah_produksi_optimal: Dict[str, int]
    profit_maksimum: float
    biaya_produk: Dict[str, float]
    harga_produk: Dict[str, float]
    harga_produk_bulat: Dict[str, float]
    profit_per_produk: Dict[str, float]

class DataStatus(BaseModel):
    bahan_loaded: bool
    resep_loaded: bool
    parameter_loaded: bool
    last_update: str
    total_produk: int
    total_bahan: int

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

def load_bahan_dari_sheets():
    try:
        url = get_sheet_url(GID_BAHAN)
        df =pd.read_csv(url)

        data_store.harga_bahan = {}
        data_store.stok_bahan = {}

        for _, row in df.iterrows():
            nama = row['nama_bahan'].strip().lower()
            data_store.harga_bahan[nama] = parse_indonesian_number(row['harga'])
            data_store.stok_bahan[nama] = parse_indonesian_number(row['stok'])
            print(f"{nama} | harga: {data_store.harga_bahan[nama]} | stok: {data_store.stok_bahan[nama]}")

        data_store.bahan_loaded = True
        print(f"Bahan loaded: {len(data_store.harga_bahan)} items")

        return True
    except Exception as e:
        print(f"Error loading bahan: {str(e)}")
        tb.print_exc()
        data_store.bahan_loaded = False
        return False
    

def load_resep_dari_sheet():
    try:
        url = get_sheet_url(GID_RESEP)
        print(f"loading resep from: {url}")
        df = pd.read_csv(url)
        print(f"colums found: {df.columns.to_list()}")

        data_store.resep = {}
        
        for _, row in df.iterrows():
            produk = row['produk'].strip().lower()
            bahan = row['bahan'].strip().lower()

            # Parse gram dulu, baru konversi ke kg
            jumlah_gram = parse_indonesian_number(row['jumlah (gram)'])
            jumlah_kg = jumlah_gram / 1000
            
            if produk not in data_store.resep:
                data_store.resep[produk] = {}
            data_store.resep[produk][bahan] = jumlah_kg

            print(f"data resep: {data_store.resep}" )

        data_store.resep_loaded = True
        print(f"Resep Loaded {len(data_store.resep)} produk")
        return True
    
    except Exception as e:
        print(f"Error loading resep: {str(e)}")
        tb.print_exc()
        data_store.resep_loaded = False
        return False

def load_parameter_dari_sheets():
    try:
        url = get_sheet_url(GID_PARAMETER)
        print(f"Loading parameter from: {url}")
        df = pd.read_csv(url)
        print(f"Columns found: {df.columns.tolist()}")

        data_store.parameter = {}

        for _, row in df.iterrows():
            param_name = row['parameter'].strip().lower()
            param_value = row['nilai']

            try:
                # Gunakan parse_indonesian_number untuk handle format Indonesia (comma)
                data_store.parameter[param_name] = parse_indonesian_number(param_value)
            except:
                data_store.parameter[param_name] = param_value
            print(data_store.parameter)
            
        data_store.parameter_loaded = True
        print(f"Parameter loaded: {len(data_store.parameter)} items")
        return True
    except Exception as e:
        print(f"Error loading parameter: {str(e)}")
        tb.print_exc()
        data_store.parameter_loaded = False
        return False

def load_all_data():
    print("Loading Data from Google Sheets")
    load_bahan_dari_sheets()
    load_resep_dari_sheet()
    load_parameter_dari_sheets()
    data_store.last_update = datetime.now().isoformat()
    print(f"Data loaded at {data_store.last_update}\n")

def hitung_biaya_produk(harga_bahan: Dict[str, float], resep: Dict) -> Dict[str, float]:
    biaya = {}
    for produk, bahan in resep.items():
        total = 0
        for nama_bahan, jumlah in bahan.items():
            harga = harga_bahan.get(nama_bahan, 0)
            total += harga * jumlah
        biaya[produk] = total
    return biaya

def hitung_harga_produk(biaya: Dict[str, float], margin: float) -> Dict[str, float]:
    harga_produk = {}
    for produk, biaya_produk in biaya.items():
        print(biaya_produk, type(biaya_produk))
        print(margin, type(margin))
        harga_produk[produk] = biaya_produk + biaya_produk * margin
    return harga_produk

def hitung_harga_bulat(harga_produk: Dict[str, float]) -> Dict[str, float]:
    harga_bulat = {}
    for produk, harga in harga_produk.items():
        harga_bulat[produk] = math.ceil(harga/1000) * 1000
    return harga_bulat

def hitung_profit(harga_bulat: Dict[str, float], biaya: Dict[str, float]) -> Dict[str, float]:
    profit = {}
    for produk, harga in harga_bulat.items():
        profit[produk] = harga - biaya[produk]
    return profit

def jalankan_optimasi(harga_bahan: Dict[str, float], stok_bahan: Dict[str, float], resep: Dict, margin: float):
    biaya = hitung_biaya_produk(harga_bahan, resep)
    harga_produk = hitung_harga_produk(biaya, margin)
    harga_bulat = hitung_harga_bulat(harga_produk)
    profit = hitung_profit(harga_bulat, biaya)

    model = LpProblem("optimasi_bakery", LpMaximize)

    produk_list = list(resep.keys())
    x = LpVariable.dicts(
        "Produksi",
        produk_list,
        lowBound=0,
        cat="Integer"
    )

    model += lpSum(
        profit[p] * x[p] for p in produk_list
    )

    for bahan in stok_bahan:
        model += lpSum(
            resep[produk].get(bahan, 0) * x[produk]
            for produk in produk_list
        ) <= stok_bahan[bahan]

    model.solve()

    hasil_produksi = {produk: int (x[produk].varValue if x[produk].varValue is not None else 0) for produk in produk_list}
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

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Bakery Optimization API v2.0",
        "version": "2.0.0",
        "docs": "/docs",
        "data_source": "Google Sheets",
        "sheet_id": SHEET_ID
    }

@app.get("/data-status", response_model=DataStatus, tags=["Data"])
async def get_data_status():
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
@app.get("/optimize", response_model=OptimasiResponse, tags=["Optimization"])
async def optimize():
    """
    Jalankan optimasi menggunakan data dari Google Sheets
    """
    try:
        # Validasi data sudah loaded
        if not data_store.bahan_loaded or not data_store.resep_loaded:
            raise HTTPException(
                status_code=503,
                detail="Data not fully loaded from Google Sheets. Try /reload-data"
            )
        
        # Ambil data dari spreadsheet
        harga_bahan = data_store.harga_bahan
        stok_bahan = data_store.stok_bahan
        margin_raw = data_store.parameter.get("margin", 0.3)
        
        # Konversi margin ke float jika masih string
        if isinstance(margin_raw, str):
            margin = parse_indonesian_number(margin_raw)
        else:
            margin = float(margin_raw)
        
        resep = data_store.resep
        
        # Validasi data lengkap
        if not harga_bahan:
            raise HTTPException(status_code=400, detail="Harga bahan tidak tersedia")
        if not stok_bahan:
            raise HTTPException(status_code=400, detail="Stok bahan tidak tersedia")
        if not resep:
            raise HTTPException(status_code=400, detail="Resep tidak tersedia")
        
        # Jalankan optimasi
        hasil = jalankan_optimasi(harga_bahan, stok_bahan, resep, margin)
        
        # Validasi status optimasi
        if hasil["status"] != "Optimal":
            raise HTTPException(
                status_code=400,
                detail=f"Optimization failed with status: {hasil['status']}"
            )
        
        # Return hasil
        return OptimasiResponse(
            status=hasil["status"],
            jumlah_produksi_optimal=hasil["jumlah_produksi_optimal"],
            profit_maksimum=hasil["profit_maksimum"],
            biaya_produk=hasil["biaya_produk"],
            harga_produk=hasil["harga_produk"],
            harga_produk_bulat=hasil["harga_produk_bulat"],
            profit_per_produk=hasil["profit_per_produk"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during optimization: {str(e)}"
        )




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)