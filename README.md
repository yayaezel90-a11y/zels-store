# Alfarez AI

Alfarez AI adalah web AI full-stack siap deploy dengan backend Node.js, frontend responsive, REST API chat, pilihan model AI, paket berbayar Pro/Pro Max, animasi premium, health check, dan integrasi Gemini API agar AI bisa online.

## Fitur

- Chat AI online menggunakan Gemini API.
- Mode demo lokal jika API key belum diisi.
- Pilihan paket Free, Pro, dan Pro Max dengan model berbeda.
- Model picker: Flash Lite, Balanced, Creative Pro, Code Pro, Reasoning Pro, dan Pro Max.
- Persona AI: general assistant, senior coder, marketer, teacher, researcher, dan business coach.
- Prompt enhancer, quick prompts, voice input, export chat, local chat history, dan AI tools.
- GoalPilot: fitur unik untuk mengubah tujuan menjadi action board, risiko, metrik sukses, dan prompt lanjutan yang berjalan tanpa API key.
- UI modern responsive dengan animasi orb, reveal, glow, typing indicator, dan glassmorphism.
- API key disimpan di server melalui environment variable.

## Menjalankan Lokal

```bash
npm install
cp .env.example .env
# isi GEMINI_API_KEY di .env
npm start
```

Buka `http://localhost:3000`.

## Deploy

Deploy ke Render, Railway, Fly.io, Docker, atau VPS Node.js. Repo ini sudah menyertakan `render.yaml`, `Dockerfile`, dan `.dockerignore`:

- Build command: `npm install`
- Start command: `npm start`
- Environment variable wajib: `GEMINI_API_KEY`
- Environment variable opsional: `GEMINI_MODEL`, `PORT`

## Endpoint

- `GET /api/health` untuk cek status server, model, dan paket yang tersedia.
- `POST /api/chat` dengan body `{ "message": "Halo", "model": "balanced", "plan": "free", "persona": "general", "temperature": 0.65 }` untuk chat AI.
- `POST /api/goalpilot` dengan body `{ "goal": "deploy web dan dapat 100 user", "horizon": "7 hari" }` untuk membuat action board otomatis.

## Catatan Paket Berbayar

Paket Pro dan Pro Max di UI masih berupa simulasi checkout lokal. Untuk produksi, hubungkan tombol upgrade ke payment gateway seperti Midtrans, Xendit, Stripe, atau pembayaran manual admin.

## Quality Check Sebelum Deploy

Jalankan pemeriksaan lengkap sebelum deploy:

```bash
npm run check
```

Perintah ini melakukan syntax check backend/frontend, menjalankan automated tests, lalu melakukan smoke test untuk memastikan halaman utama, asset statis, health endpoint, dan GoalPilot berjalan.

## Deploy Praktis

### Render

1. Push repo ini ke GitHub.
2. Buka Render dan pilih **New Web Service**.
3. Render akan membaca `render.yaml`.
4. Isi secret `GEMINI_API_KEY` di dashboard Render.
5. Deploy dan cek `/api/health`.

### Docker / VPS

```bash
docker build -t alfarez-ai .
docker run -p 3000:3000 --env GEMINI_API_KEY=isi_key_kamu alfarez-ai
```

Buka `http://localhost:3000` dan cek `http://localhost:3000/api/health`.

## Deploy Gratis Alternatif: Vercel

Kalau Render tetap meminta kartu, gunakan Vercel dari HP:

1. Buka Vercel dan login dengan GitHub.
2. Pilih **Add New Project** lalu import repo `zels-store`.
3. Framework preset boleh **Other**.
4. Build command kosongkan atau biarkan default.
5. Output directory kosongkan.
6. Tambahkan Environment Variables:
   - `GEMINI_API_KEY=API_KEY_KAMU`
   - `GEMINI_MODEL=gemini-3.5-flash`
7. Klik **Deploy**.

Repo ini sudah punya folder `api/` dan `vercel.json`, jadi endpoint `/api/health`, `/api/chat`, dan `/api/goalpilot` berjalan sebagai Vercel Serverless Functions.

## Deploy Langsung dari Terminal

Jika service Render sudah dibuat dan kamu punya **Deploy Hook URL**, jalankan:

```bash
RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv_xxx?key=yyy npm run deploy:render
```

Script ini otomatis menjalankan `npm run check` dulu. Jika lolos dan `RENDER_DEPLOY_HOOK_URL` tersedia, deploy Render akan langsung di-trigger. Jika hook belum diisi, script berhenti aman setelah check dan menampilkan instruksi.

Untuk platform yang membaca `Procfile` seperti Railway/Heroku-compatible runtime, start command sudah tersedia:

```bash
web: npm start
```
