# Spesifikasi dan Prompt Aplikasi Photobooth (Dynamic Frame)

Dokumen ini berisi *prompt* yang dapat Anda gunakan untuk AI Coding Assistant, beserta rincian kebutuhan sistem (System Requirements) untuk membangun aplikasi Photobooth mandiri.

## 1. Prompt untuk AI / AI Coding Assistant

Gunakan *prompt* ini untuk meminta AI merancang fitur *dynamic frame selection* beserta *dashboard admin*-nya:

> **Peran:** Bertindaklah sebagai Senior Fullstack Software Engineer. 
> 
> **Konteks:** Saya sedang membangun aplikasi sistem Photobooth mandiri (Self-Photo Studio) menggunakan React/Next.js untuk frontend dan Node.js (Express) untuk backend. Saya membutuhkan rancangan arsitektur dan kode untuk fitur **Dynamic Frame Selection**. 
> 
> **Alur yang diinginkan:**
> 1. **Sisi Admin (Web Dashboard):** Admin dapat mengunggah file gambar *frame* (format PNG transparan), memberikan nama *frame*, dan menentukan koordinat (*x, y, width, height*) untuk penempatan lubang foto (grid) di dalam *frame* tersebut. Data ini disimpan di *database* lokal (seperti SQLite atau JSON).
> 2. **Sisi Pengguna (Kiosk Layar Sentuh):** Sebelum sesi pemotretan dimulai, aplikasi mengambil daftar *frame* aktif dari backend via API dan menampilkannya dalam bentuk *carousel* atau *grid* yang bisa di-*swipe*. Pengguna memilih salah satu *frame* favorit mereka.
> 3. **Sisi Pemrosesan (Backend/Canvas):** Setelah sesi foto selesai, sistem menggabungkan foto-foto yang diambil ke dalam lubang *frame* PNG tersebut sesuai koordinat yang sudah diatur admin, lalu menyimpannya menjadi satu gambar final yang siap dikirim ke printer (seperti Epson EcoTank) secara otomatis.
> 
> **Tugas:** Tolong buatkan:
> 1. Struktur *database* (schema) untuk menyimpan data *frame* dan koordinatnya.
> 2. Contoh API endpoint di Express.js untuk *upload* file *frame* dan menyimpannya.
> 3. Komponen React/Next.js untuk menampilkan UI pemilihan *frame* bagi pengguna.

---

## 2. Rincian Requirement: Fitur Upload & Pilihan Frame

Untuk merealisasikan fitur ini, sistem dibagi menjadi dua antarmuka (UI) dengan kebutuhan fungsional masing-masing:

### A. Admin Dashboard (Manajemen Template)
Antarmuka ini diakses melalui browser pada PC yang sama atau via jaringan lokal.
* **Upload File Berbasis PNG:** Sistem harus menerima file PNG dengan area transparan (saluran *alpha*) yang akan menjadi "lubang" tempat foto pengguna disisipkan.
* **Konfigurasi Layout (Grid Coordinates):** Karena setiap *frame* memiliki tata letak berbeda (misal: 3 foto vertikal vs 4 foto kotak), admin harus bisa mendefinisikan array koodinat untuk setiap *frame*. 
    * *Contoh:* Foto 1 berada di titik X: 50px, Y: 100px, dengan ukuran 400x300px.
* **Status Aktif/Nonaktif:** Admin dapat mematikan atau menyalakan *frame* tertentu (misalnya *frame* edisi Halloween hanya diaktifkan di bulan Oktober) tanpa harus menghapus filenya.
* **Preview Template:** Admin dapat melihat simulasi bagaimana *frame* tersebut terlihat jika diisi dengan foto *dummy*.

### B. Kiosk Frontend (User Flow)
Antarmuka layar sentuh yang digunakan oleh pelanggan di dalam studio.
* **Fetch Data Dinamis:** Saat layar "Tap to Start" disentuh, aplikasi langsung memanggil API backend (`GET /api/frames`) untuk memuat daftar *frame* yang berstatus *aktif*.
* **UI Pemilihan Frame (Carousel/Grid):** Menampilkan *thumbnail* dari *frame* yang tersedia. Karena ini layar sentuh, navigasi harus mendukung gestur *swipe* (geser) atau tombol panah besar yang mudah ditekan.
* **State Management:** Pilihan *frame* pengguna (misal `frame_id: 12`) disimpan dalam *state management* (seperti React Context atau Zustand) selama sesi berlangsung untuk dijadikan acuan saat pemrosesan gambar final.

### C. Struktur Data (Schema)
Berikut adalah gambaran struktur data JSON atau tabel *database* yang dibutuhkan untuk mendukung fitur ini:

```json
{
  "id": "frame_001",
  "name": "Classic Strip Black",
  "image_url": "/uploads/frames/classic_strip_black.png",
  "is_active": true,
  "print_size": "4x6", 
  "photo_slots": [
    { "order": 1, "x": 50, "y": 50, "width": 800, "height": 600 },
    { "order": 2, "x": 50, "y": 700, "width": 800, "height": 600 },
    { "order": 3, "x": 50, "y": 1350, "width": 800, "height": 600 }
  ]
}
```

*Catatan: Atribut `photo_slots` adalah kunci utamanya. Sistem akan melakukan iterasi pada array ini untuk meletakkan foto jepretan 1, 2, dan 3 tepat di belakang file PNG transparan.*