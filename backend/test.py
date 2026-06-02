from backend.be import (
    load_bahan_dari_sheets, 
    load_resep_dari_sheet, 
    load_parameter_dari_sheets,
    jalankan_optimasi,
    data_store
)

def test_jalankan_optimasi_dari_sheets():
    """Test jalankan_optimasi menggunakan data real dari Google Sheets"""
    
    print("\n" + "="*60)
    print("TEST JALANKAN_OPTIMASI DENGAN DATA DARI SHEETS")
    print("="*60 + "\n")
    
    # Load data dari sheets
    print("1. Loading data dari Google Sheets...")
    load_bahan_dari_sheets()
    load_resep_dari_sheet()
    load_parameter_dari_sheets()
    
    print(f"\n2. Data loaded:")
    print(f"   - Bahan: {len(data_store.harga_bahan)} items")
    print(f"   - Resep: {len(data_store.resep)} produk")
    print(f"   - Parameter: {len(data_store.parameter)} items")
    
    # Ambil margin dari sheets, atau gunakan default
    margin = data_store.parameter.get('margin', 0.0)
    print(f"   - Margin: {margin}")
    
    # Validasi data
    if not data_store.harga_bahan:
        print("\nERROR: Harga bahan tidak tersedia")
        return False
    
    if not data_store.stok_bahan:
        print("\nERROR: Stok bahan tidak tersedia")
        return False
    
    if not data_store.resep:
        print("\nERROR: Resep tidak tersedia")
        return False
    
    # Jalankan optimasi
    print("\n3. Menjalankan optimasi...")
    hasil = jalankan_optimasi(data_store.harga_bahan, data_store.stok_bahan, data_store.resep, margin)
    
    # Tampilkan hasil
    print(f"\n4. HASIL OPTIMASI:")
    print(f"   Status: {hasil['status']}")
    print(f"   Profit Maksimum: Rp {hasil['profit_maksimum']:,.0f}")
    
    print(f"\n5. Jumlah Produksi Optimal:")
    for produk, qty in hasil['jumlah_produksi_optimal'].items():
        print(f"   - {produk}: {qty} unit")
    
    print(f"\n6. Biaya Per Produk:")
    for produk, biaya in hasil['biaya_produk'].items():
        print(f"   - {produk}: Rp {biaya:,.0f}")
    
    print(f"\n7. Harga Per Produk:")
    for produk, harga in hasil['harga_produk_bulat'].items():
        print(f"   - {produk}: Rp {harga:,.0f}")
    
    print(f"\n8. Profit Per Produk:")
    for produk, profit in hasil['profit_per_produk'].items():
        print(f"   - {produk}: Rp {profit:,.0f}")
    
    # Validasi hasil
    print(f"\n9. Validasi Hasil:")
    assert hasil["status"] == "Optimal", f"❌ Status tidak optimal: {hasil['status']}"
    print("   ✓ Status optimal")
    
    assert hasil["profit_maksimum"] > 0, "❌ Profit harus positif"
    print("   ✓ Profit positif")
    
    assert all(isinstance(v, int) for v in hasil["jumlah_produksi_optimal"].values()), "❌ Jumlah produksi harus integer"
    print("   ✓ Jumlah produksi valid (integer)")
    
    assert len(hasil["jumlah_produksi_optimal"]) == len(data_store.resep), "❌ Jumlah produk tidak sesuai"
    print("   ✓ Jumlah produk sesuai")
    
    print("\n" + "="*60)
    print("✅ SEMUA TEST PASSED!")
    print("="*60 + "\n")
    
    return True

if __name__ == "__main__":
    test_jalankan_optimasi_dari_sheets()


