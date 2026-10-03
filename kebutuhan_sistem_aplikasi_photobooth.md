# Dokumen Kebutuhan Sistem (System Requirements Specification)

**Aplikasi Photobooth: Manajemen Pengguna & Event**

## 1. Kebutuhan Fungsional (Functional Requirements)

### A. Modul Admin (Super Admin)

Admin bertugas mengelola platform secara keseluruhan dan memantau aktivitas pengguna (vendor/pemilik photobooth).

* **Manajemen Pengguna:** Menambahkan, mengedit, menonaktifkan, atau menghapus akun *User* baru.

* **Monitoring Aktivitas (Dashboard):**

  * Melihat daftar *session/event* yang sedang aktif atau pernah dibuat oleh User.

  * Memantau metrik penggunaan User, seperti total frame yang diunggah, jumlah foto yang dihasilkan, dan status langganan.

* **Manajemen Langganan (Opsional):** Mengatur paket langganan (harga, kuota event, dll) yang nantinya dibeli oleh User.

### B. Modul User (Vendor / Event Organizer)

User adalah pihak yang menyewa atau memiliki alat photobooth dan membuat event untuk *Customer*.

* **Sistem Langganan (Subscription):** Melakukan pendaftaran dan pembayaran paket langganan untuk menggunakan layanan photobooth (misal: paket bulanan atau per event).

* **Manajemen Sesi / Event (Activity):**

  * Membuat event baru dan mengatur nama photobooth.

  * **Pengaturan Tipe Event:**

    * *Event Berbayar (Tipe A):* Customer harus membayar (via QRIS/Payment Gateway) sebelum mesin photobooth dapat digunakan.

    * *Event Gratis/Vendor (Tipe B):* Customer dapat langsung berfoto tanpa membayar karena biaya sudah ditanggung oleh pemilik acara/User.

* **Manajemen Frame:** Mengunggah desain frame kustom, mengatur posisi *cutout* foto, dan menugaskan frame ke event tertentu.

* **Pengaturan Flow Foto:**

  * *Flow Bebas:* Customer diberikan layar untuk memilih dari beberapa frame yang tersedia sebelum mulai berfoto.

  * *Flow Default (Cepat):* Customer langsung berfoto menggunakan satu frame baku (default) yang sudah ditetapkan untuk event tersebut.

* **Laporan Pendapatan:**

  * Melihat total transaksi dan pendapatan dari *Event Tipe A*.

  * Mengunduh laporan (PDF/Excel) metrik penggunaan per event (jumlah cetak, total pendapatan, waktu tersibuk).

### C. Modul Customer (End-User)

Flow yang dihadapi pelanggan di depan layar photobooth.

* **Gate Pembayaran (Jika Event Tipe A):** Layar menampilkan QRIS/instruksi pembayaran. Mesin aktif setelah status *payment success* diterima.

* **Pemilihan Frame:** Tampilan grid frame jika User mengatur *Flow Bebas*, atau langsung masuk ke kamera jika *Flow Default*.

* **Sesi Foto & Unduh:** Proses hitung mundur foto, pratinjau hasil dengan frame, dan opsi cetak atau unduh via QR Code.

## 2. Rekomendasi Skema Database (MongoDB)

Karena MongoDB menggunakan arsitektur NoSQL berbasis dokumen, data dapat dikelompokkan ke dalam beberapa *Collection* utama untuk mengoptimalkan proses baca dan pelaporan.

### Collection: `users`

Menyimpan data Admin dan User (Vendor).

| Field | Tipe Data | Deskripsi | 
| ----- | ----- | ----- | 
| `_id` | ObjectId | ID unik pengguna | 
| `role` | String | `"admin"` atau `"user"` | 
| `name` | String | Nama lengkap atau nama vendor | 
| `email` | String | Email untuk login | 
| `subscription_status` | String | `"active"`, `"expired"`, `"none"` | 
| `subscription_end` | Date | Tanggal kedaluwarsa langganan | 

### Collection: `frames`

Menyimpan aset frame yang diunggah oleh User.

| Field | Tipe Data | Deskripsi | 
| ----- | ----- | ----- | 
| `_id` | ObjectId | ID unik frame | 
| `user_id` | ObjectId | Referensi ke pembuat frame (`users`) | 
| `name` | String | Nama frame | 
| `image_url` | String | Link penyimpanan file gambar frame | 
| `is_active` | Boolean | Status aktif/tidak aktif | 

### Collection: `events` (Sesi / Activity)

Menyimpan konfigurasi acara yang dibuat oleh User.

| Field | Tipe Data | Deskripsi | 
| ----- | ----- | ----- | 
| `_id` | ObjectId | ID unik event | 
| `user_id` | ObjectId | Referensi ke pemilik event (`users`) | 
| `event_name` | String | Nama acara / nama photobooth | 
| `payment_type` | String | `"paid"` (Tipe A) atau `"free"` (Tipe B) | 
| `price_per_photo` | Number | Harga per foto jika `payment_type` = `"paid"` | 
| `photo_flow` | String | `"choose_frame"` atau `"default_frame"` | 
| `available_frames` | Array (ObjectId) | Daftar frame yang bisa dipilih (jika `choose_frame`) | 
| `default_frame_id` | ObjectId | Frame otomatis (jika `default_frame`) | 

### Collection: `transactions` (Laporan Pendapatan)

Mencatat setiap sesi foto yang sukses untuk keperluan analitik dan laporan pendapatan.

| Field | Tipe Data | Deskripsi | 
| ----- | ----- | ----- | 
| `_id` | ObjectId | ID unik transaksi | 
| `event_id` | ObjectId | Referensi ke `events` | 
| `user_id` | ObjectId | Referensi ke `users` (Pemilik Event) | 
| `amount` | Number | Nominal (0 jika event gratis, sesuai harga jika berbayar) | 
| `status` | String | `"success"`, `"failed"`, `"pending"` | 
| `photo_url` | String | Link hasil foto final (opsional) | 
| `created_at` | Date | Waktu transaksi untuk filter laporan | 

## 3. Logika Penarikan Laporan (Laporan Pendapatan)

Sistem di backend dapat menggunakan **MongoDB Aggregation Pipeline** pada collection `transactions`.

Contoh logika *query*:

1. Filter (`$match`) `user_id` sesuai dengan user yang login.

2. Filter (`$match`) `status` transaksi = `"success"`.

3. Kelompokkan (`$group`) berdasarkan `event_id`.

4. Jumlahkan (`$sum`) field `amount` untuk mendapatkan total pendapatan, dan hitung total dokumen untuk mendapatkan jumlah cetak/sesi.

5. Lakukan proses relasi (`$lookup`) ke collection `events` untuk mendapatkan nama acara agar laporan mudah dibaca.

## 4. Standar Arsitektur Sistem & Kode

Untuk menjaga sistem tetap *scalable*, mudah di-*maintain*, dan konsisten, pengembangan wajib menerapkan standar berikut:

### A. Clean Architecture & Clean Code (Backend/Core)

Sistem harus memisahkan *concern* (tanggung jawab) ke dalam lapisan-lapisan yang independen untuk mempermudah *testing* dan perubahan teknologi di masa depan.

* **Entities / Domain Layer:** Menyimpan aturan bisnis inti (contoh: model `User`, `Event`, `Transaction`).

* **Use Cases / Application Layer:** Menyimpan logika bisnis aplikasi (contoh: `CreateEventUseCase`, `CalculateRevenueUseCase`). Lapisan ini hanya bergantung pada Entities.

* **Interface Adapters (Controllers, Presenters, Gateways):** Menjembatani format data dari luar (seperti request HTTP) ke format yang dimengerti Use Cases, dan sebaliknya.

* **Frameworks & Drivers:** Lapisan terluar yang berisi detail teknis seperti database (MongoDB), framework (misal: Express/NestJS), dan UI.

* **Clean Code Principles:**

  * Penamaan variabel, fungsi, dan class yang deskriptif dan mencerminkan tujuannya (tanpa komentar yang berlebihan).

  * Penerapan prinsip **SOLID** (Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).

### B. Standar Frontend (Konsistensi UI/UX)

Untuk antarmuka pengguna (Dashboard Admin/User & Layar Photobooth), pengembangan harus fokus pada *reusability* dan konsistensi.

* **Reusable Components:** Menerapkan pendekatan *Component-Driven Development* (seperti Atomic Design: *Atoms, Molecules, Organisms*). Komponen inti seperti tombol, input form, modal, dan tabel harus dibuat secara modular sehingga dapat digunakan berulang kali di berbagai halaman tanpa menulis ulang kode.

* **Design System / Theme State:** Menggunakan konfigurasi tema terpusat (contoh: variabel CSS atau file konfigurasi Tailwind/MUI) untuk warna dasar, tipografi, dan *spacing*. Hal ini memastikan tampilan dashboard Admin, dashboard Vendor, dan antarmuka mesin Photobooth memiliki bahasa desain yang seragam.

* **State Management:** Pengelolaan *state* aplikasi yang rapi (membedakan antara *UI state* dan *server state*) agar performa di sisi mesin photobooth tetap responsif.

### C. Struktur Penyimpanan Media (File Storage)

Untuk menghindari bentrok nama file, mempermudah manajemen privasi data vendor, dan memudahkan proses hapus data massal (*cleanup* event yang sudah usang), seluruh file media (hasil foto dan frame) harus disimpan dengan struktur hierarki absolut berdasarkan **User -> Event -> Session**.

**Ilustrasi Hierarki Folder (Cloud S3 / Local Storage):**

```text
/storage_root
 └── /users
      └── /{user_id}                                 <-- Folder utama milik User (Vendor)
           ├── /frames                               <-- Asset frame yang diupload user
           │    ├── custom_frame_1.png
           │    └── custom_frame_2.png
           │
           └── /events
                └── /{event_id}                      <-- Folder khusus untuk satu Event
                     └── /sessions
                          ├── /{session_id_001}      <-- Folder khusus satu sesi foto pelanggan
                          │    ├── raw_photo_1.jpg   
                          │    ├── raw_photo_2.jpg   
                          │    └── final_result.jpg  <-- Hasil foto yang sudah digabung frame (grid)
                          │
                          └── /{session_id_002}
                               ├── raw_photo_1.jpg
                               └── final_result.jpg
```

**Kelebihan Pendekatan Ini:**
* **Isolasi Data (Multitenancy):** User/Vendor A tidak akan bisa mengakses folder foto dari User/Vendor B.
* **Manajemen Retensi:** Jika sebuah event selesai dan sistem diatur untuk menghapus foto setelah 30 hari, *backend* cukup menghapus satu *directory* `/{event_id}` secara utuh tanpa perlu mencari satu per satu.
* **Tracking Mudah:** Sesuai dengan database, setiap URL foto di koleksi `transactions` akan memetakan langsung ke struktur hierarki ini.