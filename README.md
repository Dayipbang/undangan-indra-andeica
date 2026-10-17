# Template Undangan Digital Indra & Ande Ica

Versi proyek yang dirapikan untuk GitHub Pages dan pengembangan produk undangan digital.

## Mulai cepat
1. Edit data utama di `js/wedding-config.js`.
2. Ganti media di folder `assets/` dengan nama file yang sama, atau perbarui jalurnya di konfigurasi.
3. Isi `js/firebase-config.js` untuk mengaktifkan Firestore.
4. Unggah seluruh isi folder ini ke root repository GitHub Pages.

## Struktur
- `index.html`: markup utama, jangan menaruh data rahasia.
- `css/style.css`: tampilan utama.
- `js/wedding-config.js`: pusat data dan jalur media yang benar-benar dipakai situs.
- `data/wedding-data.json`: salinan data terstruktur untuk dokumentasi/integrasi produk. Jika mengubah data, sinkronkan juga `js/wedding-config.js`.
- `js/firebase-config.js`: konfigurasi Web App Firebase, bukan service account.
- `js/app.js`: logika undangan.
- `admin.html`: dashboard admin awal.
- `firebase/firestore.rules`: rules awal yang harus dipasang di Firebase Console.

## Firebase
Tempel objek Web App config ke `js/firebase-config.js`. Jangan pernah upload file service-account atau private key. Saat config belum diisi, komentar/RSVP tetap memakai localStorage sebagai fallback.

## Deploy GitHub Pages
Pastikan `index.html` berada di root repository. Aktifkan Pages dari branch `main` folder `/ (root)`.

## Catatan lokasi
Alamat tebakan Blok Mekar Rahayu/RT/RW telah dihapus. Tombol lokasi memakai `https://maps.app.goo.gl/prhjbbGHY4yetqcA8`.

## Versi
`2.0.0-structured`
