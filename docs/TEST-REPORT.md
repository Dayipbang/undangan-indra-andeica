# Laporan Pemeriksaan

- Sintaks `js/app.js`: lulus `node --check`.
- Sintaks `js/config-loader.js`: lulus `node --check`.
- JavaScript data klien: sintaks valid.
- Tidak ada lagi `fetch()` lokal, sehingga `index.html` dapat dibuka melalui `file://`.
- Referensi ID HTML dari JavaScript: seluruhnya ditemukan.
- Fungsi inline HTML: seluruhnya tersedia.
- Referensi aset lokal: seluruhnya ditemukan.
- Folder `.git` dihapus dari paket distribusi.
- Media duplikat di root `assets` dihapus.
- Data lokasi yang saling bertentangan dihapus dan diarahkan ke tautan Maps resmi.
- Delete Firestore dibatasi untuk pengguna admin yang terautentikasi.

## Revisi final
- Indra berlabel Mempelai Pria.
- Ande Ica berlabel Mempelai Wanita.
- Ustad Abdullah Somad berlabel Ustaz / Pengisi Acara, bukan mempelai.
- Composer chat responsif untuk lebar 320-480 px.
- Tombol kirim fixed-width agar tidak terdorong keluar layar.
- `100dvh` dan safe-area bawah ditambahkan untuk HP.
- Event klik tombol kirim tetap terhubung.
