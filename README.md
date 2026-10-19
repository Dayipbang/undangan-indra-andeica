# Template Undangan Digital - Grup Hajatan

Versi final hasil penggabungan tampilan baru dengan struktur proyek yang rapi.

## Edit data klien

Semua data utama diedit dari satu file:

`data/wedding-data.js`

Data yang tersedia: nama pasangan, tanggal, waktu, lokasi, Maps, rekening, e-wallet, foto, musik, video, dan galeri.

## Struktur

- `index.html`: struktur tampilan.
- `css/style.css`: seluruh desain dan animasi.
- `js/config-loader.js`: memvalidasi data lalu menjalankan aplikasi.
- `js/app.js`: seluruh interaksi undangan.
- `js/firebase-config.js`: konfigurasi Firebase Web App.
- `data/wedding-data.js`: satu-satunya sumber data klien.
- `assets/`: media yang sudah dikelompokkan.
- `admin.html`: dashboard admin.
- `firebase/firestore.rules`: aturan keamanan Firestore.

## Cara menjalankan

Website sekarang bisa dites dengan membuka `index.html` langsung dari file manager. Tidak perlu server lokal. Untuk fitur realtime Firebase, perangkat tetap memerlukan koneksi internet.

## Deploy

1. Upload seluruh isi folder ini ke root repository GitHub.
2. Buka Settings > Pages.
3. Pilih branch `main` dan folder `/ (root)`.
4. Pasang isi `firebase/firestore.rules` melalui Firebase Console.
5. Aktifkan Email/Password Authentication untuk dashboard admin.

## Catatan keamanan

Firebase Web App config boleh berada di frontend. Jangan pernah mengunggah service account, private key, atau password admin ke repository.
