# User Flow: Dashboard Optimasi Produksi Bakery

## Tujuan Flow

Dashboard ini membantu pengguna memahami hasil perhitungan optimasi produksi bakery berdasarkan data bahan, resep, dan parameter yang aktif. Fokus flow adalah membaca hasil algoritma, memeriksa data input, mengubah data bila perlu, lalu melihat ulang hasil perhitungan.

## Aktor Utama

- **Admin**: membuka dashboard untuk memahami hasil optimasi dan memastikan data pendukungnya jelas.
- **Mahasiswa / operator simulasi**: mengubah bahan, resep, atau parameter untuk melihat dampaknya pada hasil produksi optimal.

## Struktur Layar

- **Header**: judul dashboard, status data, tombol muat ulang data.
- **Ringkasan status**: update terakhir, total produk, total bahan, margin.
- **Tabs utama**:
  - `Optimasi`
  - `Bahan`
  - `Resep`
  - `Parameter`

## Flow Utama: Membaca Hasil Optimasi

```mermaid
flowchart TD
  A[Pengguna membuka dashboard] --> B[Sistem memuat status, bahan, resep, parameter]
  B --> C[Sistem menjalankan optimasi awal]
  C --> D{Data dan hasil berhasil dimuat?}
  D -->|Ya| E[Pengguna melihat tab Optimasi]
  D -->|Tidak| F[Dashboard menampilkan error backend atau data]
  F --> G[Pengguna klik Muat ulang data]
  G --> B
  E --> H[Pengguna membaca total produksi optimal]
  H --> I[Pengguna membaca status solver dan profit maksimum]
  I --> J[Pengguna mengecek produk yang diproduksi]
  J --> K[Pengguna melihat Alasan hasil]
  K --> L[Pengguna memeriksa chart produksi dan tabel produk]
  L --> M[Pengguna memeriksa pemakaian bahan]
```

### Detail Langkah

1. Pengguna membuka dashboard.
2. Sistem mengambil data dari backend:
   - status data
   - bahan
   - resep
   - parameter
3. Sistem menjalankan optimasi awal.
4. Pengguna membaca hasil utama:
   - total produksi optimal
   - status solver
   - profit maksimum
   - jumlah produk yang diproduksi
5. Pengguna melihat interpretasi singkat:
   - bahan pembatas
   - profit per unit tertinggi
   - produk yang tidak diproduksi
6. Pengguna mengecek detail:
   - chart produksi optimal
   - tabel ringkasan produk
   - tabel pemakaian bahan

## Flow Muat Ulang Data

```mermaid
flowchart TD
  A[Pengguna klik Muat ulang data] --> B[Sistem memanggil reload data]
  B --> C[Sistem mengambil ulang status, bahan, resep, parameter]
  C --> D[Sistem menjalankan ulang optimasi]
  D --> E{Berhasil?}
  E -->|Ya| F[Dashboard memperbarui tabel dan hasil optimasi]
  E -->|Tidak| G[Dashboard menampilkan error]
```

### Tujuan

Flow ini dipakai ketika pengguna ingin memastikan data dari backend dan Google Sheets sudah paling baru.

## Flow Kelola Bahan

```mermaid
flowchart TD
  A[Pengguna buka tab Bahan] --> B[Pengguna melihat daftar bahan]
  B --> C{Aksi pengguna}
  C -->|Tambah| D[Pengguna isi form bahan]
  C -->|Edit| E[Pengguna ubah data bahan]
  C -->|Hapus| F[Pengguna melihat konfirmasi hapus]
  D --> G[Sistem validasi nama, stok, harga]
  E --> G
  F --> H[Pengguna konfirmasi hapus]
  G -->|Valid| I[Sistem simpan bahan]
  G -->|Tidak valid| J[Sistem menampilkan pesan error form]
  H --> K[Sistem hapus bahan]
  I --> L[Sistem mengambil ulang data dan optimasi]
  K --> L
  L --> M[Dashboard menampilkan data dan hasil terbaru]
```

### Validasi

- Nama bahan tidak boleh kosong.
- Stok harus angka nol atau lebih.
- Harga harus angka nol atau lebih.

## Flow Kelola Resep

```mermaid
flowchart TD
  A[Pengguna buka tab Resep] --> B[Pengguna melihat daftar resep]
  B --> C[Pengguna dapat memfilter berdasarkan produk]
  C --> D{Aksi pengguna}
  D -->|Tambah| E[Pengguna isi produk, bahan, jumlah gram]
  D -->|Edit| F[Pengguna ubah baris resep]
  D -->|Hapus| G[Pengguna melihat konfirmasi hapus]
  E --> H[Sistem validasi produk, bahan, jumlah gram]
  F --> H
  G --> I[Pengguna konfirmasi hapus]
  H -->|Valid| J[Sistem simpan resep]
  H -->|Tidak valid| K[Sistem menampilkan pesan error form]
  I --> L[Sistem hapus resep]
  J --> M[Sistem mengambil ulang data dan optimasi]
  L --> M
  M --> N[Dashboard menampilkan resep dan hasil terbaru]
```

### Validasi

- Nama produk tidak boleh kosong.
- Bahan harus dipilih.
- Jumlah gram harus lebih besar dari nol.

## Flow Ubah Parameter

```mermaid
flowchart TD
  A[Pengguna buka tab Parameter] --> B[Pengguna melihat daftar parameter]
  B --> C[Pengguna mengubah nilai parameter]
  C --> D[Pengguna klik simpan]
  D --> E{Nilai berupa angka?}
  E -->|Ya| F[Sistem menyimpan parameter]
  E -->|Tidak| G[Dashboard menampilkan error nilai parameter]
  F --> H[Sistem mengambil ulang data dan optimasi]
  H --> I[Dashboard menampilkan hasil optimasi terbaru]
```

### Catatan

Parameter yang paling relevan saat ini adalah `margin`. Perubahan nilai parameter akan memicu pengambilan ulang data dan optimasi ulang setelah berhasil disimpan.

## Flow Error dan Empty State

```mermaid
flowchart TD
  A[Sistem gagal mengambil data atau optimasi] --> B[Dashboard menampilkan pesan error]
  B --> C[Pengguna dapat klik Muat ulang data]
  C --> D[Sistem mencoba mengambil ulang data]
  D --> E{Berhasil?}
  E -->|Ya| F[Dashboard kembali menampilkan data]
  E -->|Tidak| B
```

Empty state muncul ketika:

- hasil optimasi belum tersedia
- tabel bahan kosong
- tabel resep kosong atau filter tidak menemukan baris
- parameter belum tersedia
- pemakaian bahan belum bisa dihitung

## Flow Mobile

Pada layar kecil:

1. Header, status, dan tabs disusun satu kolom.
2. Tabel berubah menjadi baris bertumpuk dengan label dan nilai.
3. Aksi edit dan hapus tetap berada di baris data yang sama.
4. Chart, ringkasan, dan interpretasi hasil turun menjadi satu kolom.

Tujuannya agar pengguna tetap bisa membaca data tanpa horizontal scroll dan tanpa text overlap.

## Acceptance Criteria Flow

- Pengguna bisa memahami hasil optimasi dari tab pertama tanpa membuka tab lain.
- Pengguna bisa menelusuri data input melalui tab Bahan, Resep, dan Parameter.
- Setelah create, update, delete, reload, atau save parameter, dashboard memperbarui data dan menjalankan ulang optimasi.
- Jika backend bermasalah, pengguna melihat pesan error yang jelas.
- Semua flow tetap tersedia di desktop dan mobile.
