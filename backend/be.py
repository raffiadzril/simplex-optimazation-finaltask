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
import requests
import json

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
GID_PRODUK = 1739691874

# Google Apps Script Configuration (untuk write ke spreadsheet)
GAS_BAHAN_URL = "https://script.google.com/macros/s/AKfycbxkDalNBVR5aqdGXWFnLxqrB4Hec7N6oVaKbLiNwOflFKbVsiL4pofo7DDe1C315igoCg/exec"

def get_sheet_url(gid: int):
    return f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"

# Helper function untuk POST ke Google Apps Script
def post_to_google_sheets(target: str, action: str, data: dict) -> bool:
    """
    Post data ke Google Apps Script untuk disimpan ke spreadsheet
    target: 'bahan', 'resep'
    action: 'create', 'update', 'delete'
    """
    try:
        payload = {
            "target": target,
            "action": action,
            "data": data
        }
        response = requests.post(GAS_BAHAN_URL, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"✓ Data {target} berhasil di-{action} ke spreadsheet")
            return True
        else:
            print(f"✗ Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error posting to Google Sheets: {str(e)}")
        return False

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
    minimal_produksi: Dict[str, int]

class DataStatus(BaseModel):
    bahan_loaded: bool
    resep_loaded: bool
    parameter_loaded: bool
    produk_loaded: bool
    last_update: str
    total_produk: int
    total_bahan: int

class ProdukCreate(BaseModel):
    produk: str
    minimal_produksi: float

class ProdukResponse(BaseModel):
    produk: str
    minimal_produksi: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# ============ Model untuk CRUD Bahan ============
class BahanCreate(BaseModel):
    """Model untuk membuat/update bahan"""
    nama_bahan: str
    harga: float
    stok: float

class BahanResponse(BaseModel):
    """Model response bahan"""
    nama_bahan: str
    harga: float
    stok: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ResepCreate(BaseModel):
    produk: str
    bahan: str
    jumlah_gram: float

class ResepResponse(BaseModel):
    produk: str
    bahan: str
    jumlah_gram: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ParameterCreate(BaseModel):
    parameter: str
    nilai: float

class ParameterResponse(BaseModel):
    parameter: str
    nilai: float


class DataStore:
    def __init__(self):
        self.harga_bahan = {}
        self.stok_bahan = {}
        self.resep = {}
        self.parameter = {}
        self.minimal_produksi = {}
        self.last_update = None
        self.bahan_loaded = False
        self.resep_loaded = False
        self.parameter_loaded = False
        self.produk_loaded = False
        # Storage untuk CRUD bahan (key: nama_bahan)
        self.bahan_list = {}  # Dict[str, dict]
        self.resep_list = {}
        self.produk_list = {}

data_store = DataStore()

def load_bahan_dari_sheets():
    try:
        url = get_sheet_url(GID_BAHAN)
        df =pd.read_csv(url)

        data_store.harga_bahan = {}
        data_store.stok_bahan = {}
        data_store.bahan_list = {}  # Reset bahan_list

        now = datetime.now().isoformat()
        for _, row in df.iterrows():
            nama = row['nama_bahan'].strip().lower()
            harga = parse_indonesian_number(row['harga'])
            stok = parse_indonesian_number(row['stok'])
            
            data_store.harga_bahan[nama] = harga
            data_store.stok_bahan[nama] = stok
            
            # Populate ke bahan_list juga
            data_store.bahan_list[nama] = {
                "harga": harga,
                "stok": stok,
                "created_at": now,
                "updated_at": now
            }
            
            print(f"{nama} | harga: {harga} | stok: {stok}")

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
            key = f"{produk}|{bahan}"

            data_store.resep_list[key] = {
                "produk": produk,
                "bahan": bahan,
                "jumlah_gram": jumlah_gram,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

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

def load_produk_dari_sheets():
    try:
        url = get_sheet_url(GID_PRODUK)
        print(f"Loading produk from: {url}")
        df = pd.read_csv(url)
        print(f"Columns found: {df.columns.tolist()}")

        data_store.minimal_produksi = {}
        data_store.produk_list = {}
        now = datetime.now().isoformat()

        for _, row in df.iterrows():
            produk = row['produk'].strip().lower()
            minimal = parse_indonesian_number(row['minimal_produksi'])
            data_store.minimal_produksi[produk] = minimal
            data_store.produk_list[produk] = {
                "minimal_produksi": minimal,
                "created_at": now,
                "updated_at": now
            }
            print(f"{produk} | minimal_produksi: {minimal}")
            
        data_store.produk_loaded = True
        print(f"Produk loaded: {len(data_store.minimal_produksi)} items")
        return True
    except Exception as e:
        print(f"Error loading produk: {str(e)}")
        tb.print_exc()
        data_store.produk_loaded = False
        return False

def load_all_data():
    print("Loading Data from Google Sheets")
    load_bahan_dari_sheets()
    load_resep_dari_sheet()
    load_parameter_dari_sheets()
    load_produk_dari_sheets()
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

def jalankan_optimasi(harga_bahan: Dict[str, float], stok_bahan: Dict[str, float], resep: Dict, margin: float, minimal_produksi: Dict[str, int]):
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

    # Constraints - minimal produksi
    for produk in produk_list:
        min_prod = minimal_produksi.get(produk, 0)
        if min_prod > 0:
            model += x[produk] >= min_prod

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
        "profit_per_produk": profit,
        "minimal_produksi": minimal_produksi
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
        produk_loaded=data_store.produk_loaded,
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
        
        minimal_produksi = data_store.minimal_produksi
        
        # Jalankan optimasi
        hasil = jalankan_optimasi(harga_bahan, stok_bahan, resep, margin, minimal_produksi)
        
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
            profit_per_produk=hasil["profit_per_produk"],
            minimal_produksi=hasil["minimal_produksi"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during optimization: {str(e)}"
        )

# ============ CRUD Endpoints untuk BAHAN ============

@app.get("/api/bahan", response_model=list[BahanResponse], tags=["Bahan"])
async def get_all_bahan():
    """Ambil semua data bahan"""
    if not data_store.bahan_list:
        return []
    return [
        BahanResponse(
            nama_bahan=nama,
            harga=bahan["harga"],
            stok=bahan["stok"],
            created_at=bahan.get("created_at"),
            updated_at=bahan.get("updated_at")
        )
        for nama, bahan in sorted(data_store.bahan_list.items())
    ]

@app.get("/api/bahan/{nama_bahan}", response_model=BahanResponse, tags=["Bahan"])
async def get_bahan(nama_bahan: str):
    """Ambil bahan berdasarkan nama"""
    nama_clean = nama_bahan.strip().lower()
    if nama_clean not in data_store.bahan_list:
        raise HTTPException(status_code=404, detail=f"Bahan '{nama_bahan}' tidak ditemukan")
    
    bahan = data_store.bahan_list[nama_clean]
    return BahanResponse(
        nama_bahan=nama_clean,
        harga=bahan["harga"],
        stok=bahan["stok"],
        created_at=bahan.get("created_at"),
        updated_at=bahan.get("updated_at")
    )

@app.post("/api/bahan", response_model=BahanResponse, status_code=201, tags=["Bahan"])
async def create_bahan(request: BahanCreate):
    """Tambah bahan baru"""
    # Validasi input
    if not request.nama_bahan or not request.nama_bahan.strip():
        raise HTTPException(status_code=400, detail="Nama bahan tidak boleh kosong")
    if request.harga < 0:
        raise HTTPException(status_code=400, detail="Harga tidak boleh negatif")
    if request.stok < 0:
        raise HTTPException(status_code=400, detail="Stok tidak boleh negatif")
    
    nama_clean = request.nama_bahan.strip().lower()
    
    # Cek apakah sudah ada
    if nama_clean in data_store.bahan_list:
        raise HTTPException(status_code=409, detail=f"Bahan '{request.nama_bahan}' sudah ada")
    
    # Simpan data bahan
    now = datetime.now().isoformat()
    data_store.bahan_list[nama_clean] = {
        "harga": float(request.harga),
        "stok": float(request.stok),
        "created_at": now,
        "updated_at": now
    }
    
    # Post ke Google Sheets
    post_to_google_sheets("bahan", "create", {
        "nama_bahan": nama_clean,
        "harga": float(request.stok),
        "stok": float(request.harga)
    })
    
    return BahanResponse(
        nama_bahan=nama_clean,
        harga=request.harga,
        stok=request.stok,
        created_at=now,
        updated_at=now
    )

@app.put("/api/bahan/{nama_bahan}", response_model=BahanResponse, tags=["Bahan"])
async def update_bahan(nama_bahan: str, request: BahanCreate):
    """Update bahan yang sudah ada"""
    nama_clean = nama_bahan.strip().lower()
    if nama_clean not in data_store.bahan_list:
        raise HTTPException(status_code=404, detail=f"Bahan '{nama_bahan}' tidak ditemukan")
    
    # Validasi input
    if not request.nama_bahan or not request.nama_bahan.strip():
        raise HTTPException(status_code=400, detail="Nama bahan tidak boleh kosong")
    if request.harga < 0:
        raise HTTPException(status_code=400, detail="Harga tidak boleh negatif")
    if request.stok < 0:
        raise HTTPException(status_code=400, detail="Stok tidak boleh negatif")
    
    nama_baru = request.nama_bahan.strip().lower()
    now = datetime.now().isoformat()
    
    # Jika nama berubah, perlu update key di dictionary
    if nama_clean != nama_baru:
        # Cek apakah nama baru sudah ada
        if nama_baru in data_store.bahan_list:
            raise HTTPException(status_code=409, detail=f"Bahan '{request.nama_bahan}' sudah ada")
        
        # Move ke key baru
        data_store.bahan_list[nama_baru] = data_store.bahan_list.pop(nama_clean)
    
    # Update data
    data_store.bahan_list[nama_baru].update({
        "harga": float(request.harga),
        "stok": float(request.stok),
        "updated_at": now
    })
    
    # Post update ke Google Sheets (kirim nama lama dan baru)
    post_to_google_sheets("bahan", "update", {
        "nama_bahan_old": nama_clean,
        "nama_bahan_new": nama_baru,
        "harga": float(request.stok),
        "stok": float(request.harga)
    })
    
    bahan = data_store.bahan_list[nama_baru]
    return BahanResponse(
        nama_bahan=nama_baru,
        harga=bahan["harga"],
        stok=bahan["stok"],
        created_at=bahan.get("created_at"),
        updated_at=bahan.get("updated_at")
    )

@app.delete("/api/bahan/{nama_bahan}", status_code=204, tags=["Bahan"])
async def delete_bahan(nama_bahan: str):
    """Hapus bahan"""
    nama_clean = nama_bahan.strip().lower()
    if nama_clean not in data_store.bahan_list:
        raise HTTPException(status_code=404, detail=f"Bahan '{nama_bahan}' tidak ditemukan")
    
    del data_store.bahan_list[nama_clean]
    
    # Post delete ke Google Sheets
    post_to_google_sheets("bahan", "delete", {
        "nama_bahan": nama_clean
    })
    
    return None


# ============ CRUD Endpoints untuk RESEP ============

@app.get("/api/resep", response_model=list[ResepResponse], tags=["Resep"])
async def get_all_resep():
    """Ambil semua data resep"""
    if not data_store.resep_list:
        return []
    return [
        ResepResponse(
            produk=resep["produk"],
            bahan=resep["bahan"],
            jumlah_gram=resep["jumlah_gram"],
            created_at=resep.get("created_at"),
            updated_at=resep.get("updated_at")
        )
        for key, resep in sorted(data_store.resep_list.items())
    ]

@app.get("/api/resep/{produk}/{bahan}", response_model=ResepResponse, tags=["Resep"])
async def get_resep(produk: str, bahan: str):
    """Ambil resep berdasarkan produk dan bahan"""
    produk_clean = produk.strip().lower()
    bahan_clean = bahan.strip().lower()
    key = f"{produk_clean}|{bahan_clean}"
    if key not in data_store.resep_list:
        raise HTTPException(status_code=404, detail=f"Resep untuk produk '{produk}' dengan bahan '{bahan}' tidak ditemukan")
    
    resep = data_store.resep_list[key]
    return ResepResponse(
        produk=resep["produk"],
        bahan=resep["bahan"],
        jumlah_gram=resep["jumlah_gram"],
        created_at=resep.get("created_at"),
        updated_at=resep.get("updated_at")
    )

@app.post("/api/resep", response_model=ResepResponse, status_code=201, tags=["Resep"])
async def create_resep(request: ResepCreate):
    """Tambah resep baru"""
    if not request.produk or not request.produk.strip():
        raise HTTPException(status_code=400, detail="Nama produk tidak boleh kosong")
    if not request.bahan or not request.bahan.strip():
        raise HTTPException(status_code=400, detail="Nama bahan tidak boleh kosong")
    if request.jumlah_gram <= 0:
        raise HTTPException(status_code=400, detail="Jumlah gram harus lebih besar dari 0")
        
    produk_clean = request.produk.strip().lower()
    bahan_clean = request.bahan.strip().lower()
    
    # Validasi keberadaan bahan
    if bahan_clean not in data_store.bahan_list:
        raise HTTPException(status_code=400, detail=f"Bahan '{request.bahan}' tidak terdaftar")
        
    key = f"{produk_clean}|{bahan_clean}"
    
    if key in data_store.resep_list:
        raise HTTPException(status_code=409, detail=f"Resep untuk produk '{request.produk}' dengan bahan '{request.bahan}' sudah ada")
        
    now = datetime.now().isoformat()
    # Simpan di resep_list
    data_store.resep_list[key] = {
        "produk": produk_clean,
        "bahan": bahan_clean,
        "jumlah_gram": float(request.jumlah_gram),
        "created_at": now,
        "updated_at": now
    }
    
    # Update juga di data_store.resep (untuk kalkulasi/optimasi)
    if produk_clean not in data_store.resep:
        data_store.resep[produk_clean] = {}
    data_store.resep[produk_clean][bahan_clean] = float(request.jumlah_gram) / 1000.0
    
    # Post ke Google Sheets
    post_to_google_sheets("resep", "create", {
        "produk": produk_clean,
        "bahan": bahan_clean,
        "jumlah_gram": float(request.jumlah_gram)
    })
    
    return ResepResponse(
        produk=produk_clean,
        bahan=bahan_clean,
        jumlah_gram=request.jumlah_gram,
        created_at=now,
        updated_at=now
    )

@app.put("/api/resep/{produk}/{bahan}", response_model=ResepResponse, tags=["Resep"])
async def update_resep(produk: str, bahan: str, request: ResepCreate):
    """Update resep yang sudah ada"""
    produk_clean = produk.strip().lower()
    bahan_clean = bahan.strip().lower()
    key_old = f"{produk_clean}|{bahan_clean}"
    
    if key_old not in data_store.resep_list:
        raise HTTPException(status_code=404, detail=f"Resep untuk produk '{produk}' dengan bahan '{bahan}' tidak ditemukan")
        
    if not request.produk or not request.produk.strip():
        raise HTTPException(status_code=400, detail="Nama produk tidak boleh kosong")
    if not request.bahan or not request.bahan.strip():
        raise HTTPException(status_code=400, detail="Nama bahan tidak boleh kosong")
    if request.jumlah_gram <= 0:
        raise HTTPException(status_code=400, detail="Jumlah gram harus lebih besar dari 0")
        
    produk_baru = request.produk.strip().lower()
    bahan_baru = request.bahan.strip().lower()
    
    # Validasi keberadaan bahan
    if bahan_baru not in data_store.bahan_list:
        raise HTTPException(status_code=400, detail=f"Bahan '{request.bahan}' tidak terdaftar")
        
    key_new = f"{produk_baru}|{bahan_baru}"
    
    now = datetime.now().isoformat()
    created_at = data_store.resep_list[key_old].get("created_at", now)
    
    # Jika key berubah (nama produk atau nama bahan berubah)
    if key_old != key_new:
        if key_new in data_store.resep_list:
            raise HTTPException(status_code=409, detail=f"Resep untuk produk '{request.produk}' dengan bahan '{request.bahan}' sudah ada")
        
        # Hapus yang lama dari list dan dari resep dict
        data_store.resep_list.pop(key_old)
        if produk_clean in data_store.resep and bahan_clean in data_store.resep[produk_clean]:
            data_store.resep[produk_clean].pop(bahan_clean)
            if not data_store.resep[produk_clean]:
                data_store.resep.pop(produk_clean)
                
    # Update data di resep_list
    data_store.resep_list[key_new] = {
        "produk": produk_baru,
        "bahan": bahan_baru,
        "jumlah_gram": float(request.jumlah_gram),
        "created_at": created_at,
        "updated_at": now
    }
    
    # Update data di data_store.resep (untuk kalkulasi/optimasi)
    if produk_baru not in data_store.resep:
        data_store.resep[produk_baru] = {}
    data_store.resep[produk_baru][bahan_baru] = float(request.jumlah_gram) / 1000.0
    
    # Post ke Google Sheets
    post_to_google_sheets("resep", "update", {
        "produk_old": produk_clean,
        "bahan_old": bahan_clean,
        "produk_new": produk_baru,
        "bahan_new": bahan_baru,
        "jumlah_gram": float(request.jumlah_gram)
    })
    
    return ResepResponse(
        produk=produk_baru,
        bahan=bahan_baru,
        jumlah_gram=request.jumlah_gram,
        created_at=created_at,
        updated_at=now
    )

@app.delete("/api/resep/{produk}/{bahan}", status_code=204, tags=["Resep"])
async def delete_resep(produk: str, bahan: str):
    """Hapus resep"""
    produk_clean = produk.strip().lower()
    bahan_clean = bahan.strip().lower()
    key = f"{produk_clean}|{bahan_clean}"
    
    if key not in data_store.resep_list:
        raise HTTPException(status_code=404, detail=f"Resep untuk produk '{produk}' dengan bahan '{bahan}' tidak ditemukan")
        
    del data_store.resep_list[key]
    
    # Hapus dari data_store.resep juga
    if produk_clean in data_store.resep and bahan_clean in data_store.resep[produk_clean]:
        data_store.resep[produk_clean].pop(bahan_clean)
        if not data_store.resep[produk_clean]:
            data_store.resep.pop(produk_clean)
            
    # Post ke Google Sheets
    post_to_google_sheets("resep", "delete", {
        "produk": produk_clean,
        "bahan": bahan_clean
    })
    
    return None


# ============ CRUD Endpoints untuk PRODUK ============

@app.get("/api/produk", response_model=list[ProdukResponse], tags=["Produk"])
async def get_all_produk():
    """Ambil semua data produk"""
    if not data_store.produk_list:
        return []
    return [
        ProdukResponse(
            produk=nama,
            minimal_produksi=data["minimal_produksi"],
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
        for nama, data in sorted(data_store.produk_list.items())
    ]

@app.get("/api/produk/{nama_produk}", response_model=ProdukResponse, tags=["Produk"])
async def get_produk(nama_produk: str):
    """Ambil produk berdasarkan nama"""
    nama_clean = nama_produk.strip().lower()
    if nama_clean not in data_store.produk_list:
        raise HTTPException(status_code=404, detail=f"Produk '{nama_produk}' tidak ditemukan")
    
    data = data_store.produk_list[nama_clean]
    return ProdukResponse(
        produk=nama_clean,
        minimal_produksi=data["minimal_produksi"],
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at")
    )

@app.post("/api/produk", response_model=ProdukResponse, status_code=201, tags=["Produk"])
async def create_produk(request: ProdukCreate):
    """Tambah produk baru"""
    if not request.produk or not request.produk.strip():
        raise HTTPException(status_code=400, detail="Nama produk tidak boleh kosong")
    if request.minimal_produksi < 0:
        raise HTTPException(status_code=400, detail="Minimal produksi tidak boleh negatif")
    
    nama_clean = request.produk.strip().lower()
    
    if nama_clean in data_store.produk_list:
        raise HTTPException(status_code=409, detail=f"Produk '{request.produk}' sudah ada")
    
    now = datetime.now().isoformat()
    data_store.produk_list[nama_clean] = {
        "minimal_produksi": float(request.minimal_produksi),
        "created_at": now,
        "updated_at": now
    }
    data_store.minimal_produksi[nama_clean] = float(request.minimal_produksi)
    
    # Post ke Google Sheets
    post_to_google_sheets("produk", "create", {
        "produk": nama_clean,
        "minimal_produksi": float(request.minimal_produksi)
    })
    
    return ProdukResponse(
        produk=nama_clean,
        minimal_produksi=request.minimal_produksi,
        created_at=now,
        updated_at=now
    )

@app.put("/api/produk/{nama_produk}", response_model=ProdukResponse, tags=["Produk"])
async def update_produk(nama_produk: str, request: ProdukCreate):
    """Update produk yang sudah ada"""
    nama_clean = nama_produk.strip().lower()
    if nama_clean not in data_store.produk_list:
        raise HTTPException(status_code=404, detail=f"Produk '{nama_produk}' tidak ditemukan")
    
    if not request.produk or not request.produk.strip():
        raise HTTPException(status_code=400, detail="Nama produk tidak boleh kosong")
    if request.minimal_produksi < 0:
        raise HTTPException(status_code=400, detail="Minimal produksi tidak boleh negatif")
    
    nama_baru = request.produk.strip().lower()
    now = datetime.now().isoformat()
    
    if nama_clean != nama_baru:
        if nama_baru in data_store.produk_list:
            raise HTTPException(status_code=409, detail=f"Produk '{request.produk}' sudah ada")
        data_store.produk_list[nama_baru] = data_store.produk_list.pop(nama_clean)
        data_store.minimal_produksi.pop(nama_clean, None)
    
    data_store.produk_list[nama_baru].update({
        "minimal_produksi": float(request.minimal_produksi),
        "updated_at": now
    })
    data_store.minimal_produksi[nama_baru] = float(request.minimal_produksi)
    
    post_to_google_sheets("produk", "update", {
        "produk_old": nama_clean,
        "produk_new": nama_baru,
        "minimal_produksi": float(request.minimal_produksi)
    })
    
    data = data_store.produk_list[nama_baru]
    return ProdukResponse(
        produk=nama_baru,
        minimal_produksi=data["minimal_produksi"],
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at")
    )

@app.delete("/api/produk/{nama_produk}", status_code=204, tags=["Produk"])
async def delete_produk(nama_produk: str):
    """Hapus produk"""
    nama_clean = nama_produk.strip().lower()
    if nama_clean not in data_store.produk_list:
        raise HTTPException(status_code=404, detail=f"Produk '{nama_produk}' tidak ditemukan")
    
    del data_store.produk_list[nama_clean]
    data_store.minimal_produksi.pop(nama_clean, None)
    
    post_to_google_sheets("produk", "delete", {
        "produk": nama_clean
    })
    
    return None


# ============ CRUD Endpoints untuk PARAMETER ============

@app.get("/api/parameter", response_model=list[ParameterResponse], tags=["Parameter"])
async def get_all_parameter():
    """Ambil semua parameter"""
    if not data_store.parameter:
        return []
    return [
        ParameterResponse(
            parameter=k,
            nilai=v
        )
        for k, v in sorted(data_store.parameter.items())
    ]

@app.get("/api/parameter/{nama_parameter}", response_model=ParameterResponse, tags=["Parameter"])
async def get_parameter(nama_parameter: str):
    """Ambil parameter berdasarkan nama"""
    param_clean = nama_parameter.strip().lower()
    if param_clean not in data_store.parameter:
        raise HTTPException(status_code=404, detail=f"Parameter '{nama_parameter}' tidak ditemukan")
    
    return ParameterResponse(
        parameter=param_clean,
        nilai=data_store.parameter[param_clean]
    )


@app.put("/api/parameter/{nama_parameter}", response_model=ParameterResponse, tags=["Parameter"])
async def update_parameter(nama_parameter: str, request: ParameterCreate):
    """Update parameter yang sudah ada"""
    param_clean = nama_parameter.strip().lower()
    if param_clean not in data_store.parameter:
        raise HTTPException(status_code=404, detail=f"Parameter '{nama_parameter}' tidak ditemukan")
        
    if not request.parameter or not request.parameter.strip():
        raise HTTPException(status_code=400, detail="Nama parameter tidak boleh kosong")
        
    param_baru = request.parameter.strip().lower()
    
    # Jika nama parameter berubah
    if param_clean != param_baru:
        if param_baru in data_store.parameter:
            raise HTTPException(status_code=409, detail=f"Parameter '{request.parameter}' sudah ada")
        data_store.parameter.pop(param_clean)
        
    data_store.parameter[param_baru] = float(request.nilai)
    
    # Post ke Google Sheets
    post_to_google_sheets("parameter", "update", {
        "parameter_old": param_clean,
        "parameter_new": param_baru,
        "nilai": float(request.nilai)
    })
    
    return ParameterResponse(
        parameter=param_baru,
        nilai=float(request.nilai)
    )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)