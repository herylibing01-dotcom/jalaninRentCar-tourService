# Panduan Deployment Gratis - Jalanin Rent Car & Tour Service

## Pilihan Platform:
1. **Railway** (Rekomendasi) - Lebih mudah untuk Node.js dengan file system
2. **Netlify** - Bagus untuk frontend, butuh database eksternal untuk backend
3. **Vercel** - Bagus untuk frontend, tapi butuh konfigurasi khusus untuk file system

---

## OPSI 1: DEPLOYMENT KE RAILWAY (REKOMENDASI)

### Kelebihan Railway:
- ✅ Gratis untuk project kecil
- ✅ Support file system (penting untuk upload gambar dan database JSON)
- ✅ Mudah di-setup
- ✅ Otomatis HTTPS
- ✅ Environment variables gratis

### Langkah-langkah:

#### 1. Sign Up di Railway
- Buka: https://railway.app
- Sign up dengan GitHub (gratis)
- Klik "New Project"

#### 2. Hubungkan ke GitHub
- Pilih "Deploy from GitHub repo"
- Cari repository: `herylibing01-dotcom/jalaninRentCar-tourService`
- Klik repository tersebut

#### 3. Konfigurasi Project
- Railway akan otomatis mendeteksi Node.js project
- Klik "Add Variables" untuk setting environment variables:
  ```
  PORT=3000
  SESSION_SECRET=generate-random-secret-32-chars-here
  NODE_ENV=production
  ```

#### 4. Tambahkan Volume untuk Data Persistence
- Di dashboard Railway, klik project Anda
- Klik "New Volume"
- Name: `data`
- Mount path: `/data`
- **PENTING**: Update `src/db.js` untuk menggunakan volume ini (lihat bagian "Update Kode untuk Railway" di bawah)

#### 5. Deploy
- Klik "Deploy"
- Tunggu beberapa menit
- Railway akan memberikan URL seperti: `https://your-app-name.up.railway.app`

#### 6. Update Kode untuk Railway (Wajib)

Buka `src/db.js` dan update bagian path database:

```javascript
// Ganti bagian ini di awal file
const DB_PATH = path.join(__dirname, "..", "data", "db.json");

// Menjadi ini untuk Railway (jika ada volume /data)
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
```

---

## OPSI 2: DEPLOYMENT KE NETLIFY

### Kelebihan Netlify:
- ✅ Gratis untuk personal projects
- ✅ Deploy otomatis dari GitHub
- ✅ Fast globally distributed CDN
- ✅ Great untuk frontend static sites

### Kekurangan Netlify untuk Project Ini:
- ❌ Functions tidak menyediakan file system persistent
- ❌ Database JSON akan reset setiap cold start (data hilang)
- ❌ Upload gambar tidak tersimpan permanen (perlu cloud storage)
- ❌ **HARUS migrasi ke database eksternal** untuk production

### Langkah-langkah (Hanya untuk Testing):

#### 1. Install Dependencies
```bash
npm install serverless-http
```

#### 2. Sign Up di Netlify
- Buka: https://app.netlify.com
- Sign up dengan GitHub (gratis)

#### 3. Import Project
- Klik "Add new site" → "Import an existing project"
- Pilih repository: `herylibing01-dotcom/jalaninRentCar-tourService`
- Klik "Import site"

#### 4. Setup Environment Variables
```
PORT=3000
SESSION_SECRET=generate-random-secret-here
NODE_ENV=production
NETLIFY=true
```

#### 5. Deploy
- Klik "Deploy site"
- Website akan live di: `https://your-site-name.netlify.app`

**CATATAN PENTING**: Lihat panduan lengkap di `NETLIFY_DEPLOYMENT.md` untuk migrasi ke database eksternal.

---

## OPSI 3: DEPLOYMENT KE VERCEL

### Kelebihan Vercel:
- ✅ Gratis untuk personal projects
- ✅ Deploy otomatis dari GitHub
- ✅ Fast globally distributed
- ✅ Great untuk frontend

### Kekurangan Vercel untuk Project Ini:
- ❌ File system tidak persistent (data akan hilang setiap deploy)
- ❌ Upload gambar tidak tersimpan permanen
- ❌ Database JSON akan reset setiap deploy

### Langkah-langkah:

#### 1. Sign Up di Vercel
- Buka: https://vercel.com
- Sign up dengan GitHub (gratis)

#### 2. Import Project
- Klik "Add New Project"
- Pilih repository: `herylibing01-dotcom/jalaninRentCar-tourService`
- Klik "Import"

#### 3. Konfigurasi Environment Variables
- Di bagian "Environment Variables", tambahkan:
  ```
  PORT=3000
  SESSION_SECRET=generate-random-secret-32-chars-here
  NODE_ENV=production
  ```

#### 4. Deploy
- Klik "Deploy"
- Tunggu beberapa detik
- Vercel akan memberikan URL seperti: `https://your-project.vercel.app`

**CATATAN PENTING**: Untuk Vercel, Anda HARUS migrasi ke database eksternal (MongoDB/PostgreSQL) karena file system tidak persistent.

---

## OPSI 4: DEPLOYMENT KE RENDER (FREE TIER TIDAK TERSEDIA)

Render menawarkan free tier untuk web services, tapi:
- Free tier sudah tidak tersedia untuk user baru
- Butuh kartu kredit untuk verifikasi (meskipun gratis)
- Jadi kami sarankan gunakan Railway atau Vercel

---

## REKOMENDASI DATABASE UNTUK PRODUCTION

### Untuk Railway (Gratis):
- Gunakan Railway PostgreSQL (gratis untuk project kecil)
- Update `src/db.js` untuk menggunakan PostgreSQL

### Untuk Netlify:
- **WAJIB** gunakan database eksternal:
  - MongoDB Atlas (free tier 512MB)
  - Supabase (PostgreSQL gratis)
  - PlanetScale (MySQL gratis)
- Lihat panduan lengkap di `NETLIFY_DEPLOYMENT.md`

### Untuk Vercel:
- Gunakan MongoDB Atlas (free tier 512MB)
- Atau Supabase (PostgreSQL gratis)

### Migrasi ke Database Nyata:

Jika ingin migrasi dari JSON ke database nyata, Anda perlu:
1. Install library database (misal: `npm install mongoose` untuk MongoDB)
2. Update `src/db.js` untuk menggunakan database
3. Buat schema untuk bookings, orders, vehicles, employees

---

## GENERATE SESSION SECRET

Untuk SESSION_SECRET, gunakan command ini di terminal:

```bash
# Windows (PowerShell)
-join ([char[]](48..57 + 65..90 + 97..122 | Get-Random -Count 32))

# Linux/Mac
openssl rand -base64 32
```

---

## CHECKLIST SEBELUM DEPLOY

### Wajib:
- [ ] Push semua perubahan ke GitHub
- [ ] Update `.env.example` (sudah dilakukan)
- [ ] Buat file `vercel.json` (sudah dibuat)
- [ ] Buat file `Procfile` (sudah dibuat)
- [ ] Buat file `railway.json` (sudah dibuat)
- [ ] Generate SESSION_SECRET yang kuat
- [ ] Update `src/db.js` untuk Railway (jika pakai Railway)

### Opsional:
- [ ] Migrasi ke database nyata (PostgreSQL/MongoDB)
- [ ] Setup email SMTP untuk notifikasi
- [ ] Add custom domain

---

## TROUBLESHOOTING

### Error: "Cannot find module"
- Jalankan `npm install` di local
- Pastikan `package.json` sudah di-commit

### Error: "Database not found"
- Untuk Railway: Pastikan volume sudah dibuat
- Untuk Vercel: Migrasi ke database eksternal

### Error: "Upload failed"
- Untuk Railway: Pastikan volume uploads sudah di-mount
- Untuk Vercel: Gunakan cloud storage (Cloudinary/AWS S3)

---

## LINK UNTUK REFERENSI

- Railway: https://railway.app/docs
- Vercel: https://vercel.com/docs
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Supabase: https://supabase.com/docs

---

## KONTAK & BANTUAN

Jika mengalami kendala:
1. Cek logs di platform deployment
2. Pastikan environment variables sudah benar
3. Cek apakah semua dependencies sudah terinstall
