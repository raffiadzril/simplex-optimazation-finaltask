# User Flow: Dashboard Optimasi Produksi Bakery

## Tujuan Flow

Dashboard membantu pengguna memahami hasil optimasi produksi bakery berdasarkan data bahan, resep, dan parameter aktif. Flow utama adalah melihat hasil optimal, memahami model Operational Research di baliknya, memeriksa penggunaan bahan, mengubah data bila perlu, lalu menghitung ulang.

## Struktur Layar

- Header: judul dashboard, status data, tombol muat ulang.
- Ringkasan: update terakhir, total produk, total bahan, margin.
- Tabs utama:
  - Hasil Optimasi
  - Model OR
  - Analisis Bahan
  - Data Bahan
  - Data Resep
  - Pengaturan

## Flow Utama

1. Pengguna membuka dashboard.
2. Sistem mengambil status, bahan, resep, parameter, lalu menjalankan optimasi.
3. Pengguna melihat ringkasan hasil optimal:
   - status solver
   - profit maksimum
   - total produksi
   - rekomendasi jumlah produksi per produk
4. Pengguna membuka tab Model OR untuk melihat:
   - variabel keputusan
   - fungsi tujuan
   - batasan bahan
   - status proses solver
   - solusi optimal
5. Pengguna membuka tab Analisis Bahan untuk melihat:
   - stok tersedia
   - stok terpakai
   - sisa stok
   - bahan pembatas
6. Jika data perlu diubah, pengguna membuka Data Bahan, Data Resep, atau Pengaturan.
7. Setelah perubahan berhasil, dashboard mengambil ulang data dan menjalankan optimasi ulang.

## Flow Model OR

Model OR tidak menampilkan iterasi simplex palsu. UI menjelaskan proses yang benar:

1. Data dimuat dari backend dan Google Sheets.
2. Produk diubah menjadi variabel keputusan `x1`, `x2`, dan seterusnya.
3. Profit per produk membentuk fungsi tujuan.
4. Resep dan stok bahan membentuk constraints.
5. Backend menjalankan solver library.
6. UI menampilkan solusi optimal dan interpretasi hasil.

## Flow CRUD Bahan

1. Pengguna membuka tab Data Bahan.
2. Pengguna melihat tabel bahan.
3. Pengguna memilih Tambah atau Edit, lalu drawer form terbuka.
4. Sistem memvalidasi nama bahan, harga, dan stok.
5. Setelah simpan berhasil, sistem mengambil ulang data dan optimasi.
6. Untuk hapus, sistem menampilkan dialog konfirmasi terlebih dahulu.

## Flow CRUD Resep

1. Pengguna membuka tab Data Resep.
2. Pengguna dapat memfilter resep berdasarkan produk.
3. Pengguna memilih Tambah atau Edit, lalu drawer form terbuka.
4. Sistem memvalidasi nama produk, bahan, dan jumlah gram.
5. Setelah simpan berhasil, sistem mengambil ulang data dan optimasi.
6. Untuk hapus, sistem menampilkan dialog konfirmasi terlebih dahulu.

## Flow Pengaturan

1. Pengguna membuka tab Pengaturan.
2. Pengguna melihat parameter margin dan status data backend.
3. Pengguna mengubah nilai margin lalu menyimpan.
4. Sistem mengambil ulang data dan optimasi.
5. Pengguna dapat melakukan muat ulang data dengan dialog konfirmasi.

## Error, Loading, Empty State

- Loading awal menggunakan skeleton.
- Error backend menggunakan alert dengan aksi pemulihan.
- Empty table menampilkan pesan yang menjelaskan data belum tersedia.
- Validasi form menampilkan pesan dekat aksi simpan.
- Toast menampilkan hasil aksi berhasil atau gagal.

## Acceptance Criteria

- Tab pertama cukup untuk memahami hasil optimasi.
- Tab Model OR cukup untuk menjelaskan proses kepada evaluator UAS.
- Analisis Bahan menunjukkan stok terpakai, sisa, dan indikator pembatas.
- CRUD bahan, CRUD resep, margin update, reload data, dan optimize memiliki feedback.
- Layout tetap terbaca di desktop dan mobile.
