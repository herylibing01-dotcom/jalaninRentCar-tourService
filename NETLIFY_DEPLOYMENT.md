# Panduan Deployment ke Netlify - Jalanin Rent Car & Tour Service

## ⚠️ PENTING: Batasan Netlify untuk Project Ini

### Masalah Utama:
Netlify Functions **TIDAK** menyediakan file system persistent. Ini berarti:
- ❌ Database JSON akan **HILANG** setiap function cold start (setiap beberapa menit idle)
- ❌ Upload gambar akan **HILANG** setelah cold start
- ❌ Data tidak akan tersimpan permanen

### Solusi untuk Production:
Anda **HARUS** migrasi ke database eksternal untuk menggunakan Netlify:
- MongoDB Atlas (free tier 512MB)
- Supabase (PostgreSQL gratis)
- PlanetScale (MySQL gratis)
- Firebase (Firebase Firestore gratis)

---

## METODE 1: Deployment Netlify Functions (REKOMENDASI untuk Testing)

### Langkah-langkah:

#### 1. Install Dependencies (Sudah ditambahkan ke package.json)
```bash
npm install serverless-http
```

#### 2. Sign Up di Netlify
- Buka: https://app.netlify.com
- Sign up dengan GitHub (gratis)

#### 3. Hubungkan ke GitHub
- Klik "Add new site" → "Import an existing project"
- Pilih repository: `herylibing01-dotcom/jalaninRentCar-tourService`
- Klik "Import site"

#### 4. Konfigurasi Build Settings
Netlify akan otomatis mendeteksi konfigurasi dari `netlify.toml`:
- Build command: `npm install`
- Publish directory: `.`

#### 5. Setup Environment Variables
Di Netlify dashboard → Site settings → Environment variables, tambahkan:
```
PORT=3000
SESSION_SECRET=generate-random-secret-here
NODE_ENV=production
NETLIFY=true
```

#### 6. Deploy
- Klik "Deploy site"
- Tunggu beberapa detik
- Website akan live di: `https://your-site-name.netlify.app`

---

## METODE 2: Deployment Netlify dengan Database Eksternal (PRODUCTION READY)

### Step 1: Setup MongoDB Atlas (Gratis)

1. Buka: https://www.mongodb.com/cloud/atlas
2. Sign up gratis
3. Create cluster (free tier M0)
4. Create database user
5. Get connection string

### Step 2: Install Mongoose di Project
```bash
npm install mongoose
```

### Step 3: Buat Models untuk MongoDB

Buat file `src/models/index.js`:
```javascript
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  serviceType: String,
  status: String,
  totalPrice: Number,
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

const vehicleSchema = new mongoose.Schema({
  name: String,
  type: String,
  seats: Number,
  pricePerDay: Number,
  status: String,
  image: String
});

const employeeSchema = new mongoose.Schema({
  name: String,
  position: String,
  phone: String,
  baseSalary: Number
});

const Booking = mongoose.model('Booking', bookingSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const Employee = mongoose.model('Employee', employeeSchema);

module.exports = { Booking, Vehicle, Employee };
```

### Step 4: Update `src/db.js` untuk MongoDB

Ganti seluruh implementasi JSON dengan MongoDB:
```javascript
const mongoose = require('mongoose');
const { Booking, Vehicle, Employee } = require('./models');

// Connection string dari MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental';

async function init() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

// Ganti semua fungsi load/save dengan mongoose queries
async function getVehicles() {
  return await Vehicle.find();
}

async function saveServiceBooking(payload) {
  const booking = new Booking(payload);
  await booking.save();
  return booking;
}

// ... dan seterusnya untuk semua fungsi db
```

### Step 5: Update Environment Variables di Netlify
Tambahkan:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rental?retryWrites=true&w=majority
```

### Step 6: Deploy
Klik "Deploy site" di Netlify

---

## METODE 3: Deployment Netlify untuk Frontend Hanya

Jika Anda ingin:
- Frontend di Netlify
- Backend di Railway atau Render

### Langkah:

1. Split project menjadi frontend dan backend
2. Deploy frontend ke Netlify
3. Deploy backend ke Railway
4. Connect frontend ke backend API

---

## METODE 4: Gunakan Netlify untuk Frontend + Railway untuk Backend (REKOMENDASI HYBRID)

### Arsitektur:
- **Frontend (React/Vue/Static)** → Netlify
- **Backend (Node.js + Database)** → Railway

### Kelebihan:
- ✅ Netlify untuk static files (fast, CDN)
- ✅ Railway untuk backend dengan persistent storage
- ✅ Gratis untuk kedua platform

### Langkah:

1. Extract frontend dari project (convert to React atau buat static HTML)
2. Deploy frontend ke Netlify
3. Deploy backend (Express API) ke Railway
4. Connect via API calls

---

## TROUBLESHOOTING NETLIFY

### Error: "Module not found"
- Pastikan `serverless-http` sudah di package.json
- Jalankan `npm install` di local

### Error: "Function invocation failed"
- Cek Netlify logs
- Pastikan semua dependencies terinstall

### Data Hilang Setelah Cold Start
- Ini normal untuk Netlify Functions tanpa database eksternal
- Gunakan MongoDB Atlas atau database lain untuk persistent storage

### Upload Gambar Tidak Tersimpan
- Gunakan cloud storage:
  - Cloudinary (gratis tier)
  - AWS S3 (free tier)
  - Firebase Storage (gratis)

---

## REKOMENDASI FINAL

### Untuk Testing (Coba-coba):
- Gunakan **Netlify Functions** dengan peringatan data akan hilang

### Untuk Production (Serius):
- **OPSI A**: Railway (semua-in-one, persistent storage, gratis)
- **OPSI B**: Netlify (frontend) + Railway (backend)
- **OPSI C**: Netlify + MongoDB Atlas (butuh coding untuk migrasi database)

### Ranking Rekomendasi:
1. 🥇 **Railway** - Paling mudah, persistent storage gratis
2. 🥈 **Netlify + Railway** - Hybrid, best of both worlds
3. 🥉 **Netlify + MongoDB** - Butuh migrasi database, lebih kompleks

---

## GENERATE SESSION SECRET

```bash
# Windows (PowerShell)
-join ([char[]](48..57 + 65..90 + 97..122 | Get-Random -Count 32))

# Linux/Mac
openssl rand -base64 32
```

---

## LINK REFERENSI

- Netlify Functions: https://docs.netlify.com/functions/
- serverless-http: https://github.com/dougwilson/serverless-http
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Cloudinary: https://cloudinary.com/documentation
