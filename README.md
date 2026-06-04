# Simplex Optimization Final Task

Aplikasi produksi bakery dengan backend FastAPI dan frontend React + Vite.

## Struktur

- `backend/`: FastAPI API dan solver optimasi.
- `frontend/`: Dashboard React + TypeScript.
- `backend/appscript.gs`: Google Apps Script untuk sinkronisasi data Google Sheets.



## Backend

```bash
pip install -r requirements.txt
uvicorn backend.be:app --reload
```

API lokal berjalan di `http://127.0.0.1:8000`.

## Frontend

Frontend berada di `frontend/` dan memakai React + Vite + TypeScript, Tailwind CSS, dan shadcn/ui-style components.

```bash
cd frontend
npm install
npm run dev
```

Frontend lokal berjalan di `http://127.0.0.1:5173` atau port Vite berikutnya.

Backend deploy dipakai sebagai default:

```text
https://simplex-optimazation-finaltask.onrender.com
```

Untuk mengganti backend API:

```bash
cp .env.example .env
```

Lalu ubah `VITE_API_BASE_URL` sesuai endpoint backend.

## Verifikasi

```bash
cd frontend
npm run build
npm run test
```

## Catatan Push

Jangan commit:

- `node_modules/`
- `dist/`
- `__pycache__/`
- file `.env`
- log lokal Vite

Pastikan `git status` hanya berisi file source dan dokumen yang memang ingin dipush.
