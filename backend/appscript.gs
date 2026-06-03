function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var target = data.target || "bahan"; // fallback ke "bahan" jika kosong
  var itemData = data.data;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet;
  
  if (target === "resep") {
    sheet = ss.getSheetByName("resep");
    if (!sheet) {
      sheet = ss.getSheets()[1] || ss.getActiveSheet();
    }
  } else {
    sheet = ss.getSheetByName("bahan");
    if (!sheet) {
      sheet = ss.getSheets()[0] || ss.getActiveSheet();
    }
  }
  
  if (target === "resep") {
    if (action === "create") {
      // Tambah baris baru resep: produk, bahan, jumlah_gram
      sheet.appendRow([
        itemData.produk,
        itemData.bahan,
        itemData.jumlah_gram
      ]);
      return response("success", "Resep berhasil ditambahkan");
      
    } else if (action === "update") {
      // Update resep berdasarkan produk_old dan bahan_old
      var range = sheet.getRange("A:B");
      var values = range.getValues();
      
      var oldProduk = itemData.produk_old.toLowerCase();
      var oldBahan = itemData.bahan_old.toLowerCase();
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString().toLowerCase() === oldProduk && 
            values[i][1].toString().toLowerCase() === oldBahan) {
          // Replace kolom (produk, bahan, jumlah_gram)
          sheet.getRange(i + 1, 1, 1, 3).setValues([[
            itemData.produk_new,
            itemData.bahan_new,
            itemData.jumlah_gram
          ]]);
          return response("success", "Resep berhasil diupdate");
        }
      }
      return response("error", "Resep tidak ditemukan");
      
    } else if (action === "delete") {
      // Hapus resep berdasarkan produk dan bahan
      var range = sheet.getRange("A:B");
      var values = range.getValues();
      
      var produk = itemData.produk.toLowerCase();
      var bahan = itemData.bahan.toLowerCase();
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString().toLowerCase() === produk && 
            values[i][1].toString().toLowerCase() === bahan) {
          sheet.deleteRow(i + 1);
          return response("success", "Resep berhasil dihapus");
        }
      }
      return response("error", "Resep tidak ditemukan");
    }
  } else {
    // target === "bahan"
    if (action === "create") {
      // Tambah baris baru bahan
      sheet.appendRow([
        itemData.nama_bahan,
        itemData.harga,
        itemData.stok
      ]);
      return response("success", "Bahan berhasil ditambahkan");
      
    } else if (action === "update") {
      // Update baris yang ada
      var range = sheet.getRange("A:A");
      var values = range.getValues();
      
      // Cari baris dengan nama_bahan_old
      var oldName = itemData.nama_bahan_old.toLowerCase();
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString().toLowerCase() === oldName) {
          // Replace semua kolom (nama, harga, stok)
          sheet.getRange(i + 1, 1, 1, 3).setValues([[
            itemData.nama_bahan_new,
            itemData.harga,
            itemData.stok
          ]]);
          return response("success", "Bahan berhasil diupdate");
        }
      }
      return response("error", "Bahan tidak ditemukan");
      
    } else if (action === "delete") {
      // Hapus baris yang ada
      var range = sheet.getRange("A:A");
      var values = range.getValues();
      
      var name = itemData.nama_bahan.toLowerCase();
      
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString().toLowerCase() === name) {
          sheet.deleteRow(i + 1);
          return response("success", "Bahan berhasil dihapus");
        }
      }
      return response("error", "Bahan tidak ditemukan");
    }
  }
}

function response(status, message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}