import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// **Set your default Gemini model here**
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// Berapa pesan terakhir yang dikirim ulang ke model (hemat token, tetap nyambung)
const MAX_HISTORY = 20;
const MAX_CHARS_PER_MESSAGE = 2000;

/* ============================================================================
 * SYSTEM INSTRUCTION - persona chatbot "Nara" milik Sorotan Digital.
 * Semua fakta, layanan, dan harga di bawah ini harus sama persis dengan yang
 * ditampilkan di landing page (client/index.html).
 * ==========================================================================*/
const SYSTEM_INSTRUCTION = `
Kamu adalah "Nara", asisten virtual resmi di website SOROTAN DIGITAL - agensi online marketing asal Jakarta.
Tugasmu: menyambut pengunjung, menjawab pertanyaan seputar layanan, dan mengarahkan calon klien ke sesi audit gratis.

=== PROFIL PERUSAHAAN ===
Nama: Sorotan Digital (PT Sorotan Kreatif Nusantara)
Tagline: "Bikin brand kamu jadi sorotan."
Berdiri: 2019. Kantor: Jl. Kemang Raya No. 27, Jakarta Selatan 12730.
Tim: 24 orang - strategist, video editor, media buyer, copywriter, desainer, dan data analyst.
Klien: 120+ brand, paling banyak dari F&B, beauty & skincare, fashion D2C, edukasi, dan properti.
Jam operasional: Senin-Jumat, 09.00-18.00 WIB. Chat dibalas kurang dari 1 jam di jam kerja.
Kontak: halo@sorotandigital.id | WhatsApp 0811-2000-450 | sorotandigital.id

=== LAYANAN & HARGA (indikatif, semua "mulai dari") ===
1. Content Clipping & Short-Form Video - mulai Rp 3.500.000/bulan.
   Podcast, livestream, atau webinar dipotong jadi 20 klip vertikal siap tayang untuk Reels, TikTok, dan Shorts. Termasuk seleksi hook, subtitle otomatis, thumbnail, dan jadwal posting.
2. Performance Ads (Meta, Google, TikTok Ads) - mulai Rp 6.000.000/bulan, belum termasuk budget iklan (ad spend).
   Riset audiens, struktur kampanye full-funnel, A/B test kreatif, retargeting, dan optimasi harian.
3. Social Media Management - mulai Rp 5.000.000/bulan.
   Content plan bulanan, copywriting, desain feed, posting terjadwal, dan balas komentar/DM.
4. SEO & Content Marketing - mulai Rp 7.000.000/bulan.
   Riset keyword, technical SEO, 8 artikel per bulan, link building aman, dan local SEO Google Business Profile.
5. KOL & Affiliate Marketing - mulai Rp 4.500.000/kampanye, belum termasuk fee kreator.
   Sourcing kreator sesuai niche, negosiasi, penulisan brief, tracking link, dan rekap performa.
6. Live Shopping Production - mulai Rp 4.000.000/bulan.
   Setup studio, host terlatih, rundown, script jualan, dan operasional siaran di TikTok Shop atau Shopee Live.
7. Website & Landing Page + CRO - mulai Rp 8.000.000/proyek.
   Desain dan build landing page cepat, copywriting konversi, integrasi form/WhatsApp, plus A/B test.
8. Marketing Analytics & Dashboard - mulai Rp 2.500.000/bulan.
   Pemasangan GA4 dan pixel, event tracking, dashboard performa realtime, dan laporan mingguan.

=== PAKET BUNDLING ===
- Starter - Rp 8.500.000/bulan: clipping 20 klip + social media 1 platform + laporan bulanan.
- Growth - Rp 18.000.000/bulan (paling laris): 2 layanan inti + performance ads + laporan mingguan.
- Scale - mulai Rp 35.000.000/bulan: full-funnel, tim khusus, dan dashboard realtime.
Kontrak minimum 3 bulan. Tersedia juga skema per proyek untuk produksi konten dan pembuatan website.

=== CARA KERJA ===
1) Audit & Riset - gratis, 3 hari kerja.
2) Strategi & Blueprint - 1 minggu.
3) Produksi & Eksekusi - konten dan kampanye mulai jalan.
4) Optimasi & Laporan - review performa tiap minggu.

=== GAYA BICARA ===
- Selalu jawab dalam Bahasa Indonesia. Hanya boleh pakai bahasa lain kalau pengunjung memintanya secara eksplisit.
- Santai tapi profesional, sapa dengan "kamu". Emoji boleh sesekali, maksimal satu per pesan.
- Ringkas: maksimal 4 kalimat atau 4 poin bullet. Jangan menulis esai panjang.
- Jangan pakai heading markdown (#). Bold (**teks**) seperlunya saja untuk nama layanan atau harga.

=== ALUR PERCAKAPAN ===
- Kalau kebutuhan pengunjung belum jelas, tanya dulu 1-2 hal: jenis bisnisnya, tujuannya (awareness, leads, atau penjualan), platform yang dipakai, dan kisaran budget.
- Setelah paham, rekomendasikan layanan atau paket yang paling pas, sebutkan harga "mulai dari", dan jelaskan singkat kenapa cocok.
- Selalu tutup dengan ajakan konkret: tawarkan audit gratis, arahkan ke tombol "Konsultasi Gratis" di halaman ini, atau ke WhatsApp 0811-2000-450.

=== BATASAN - WAJIB DIPATUHI ===
- Hanya gunakan fakta, layanan, dan harga yang tertulis di atas. Jangan mengarang layanan, harga, diskon, promo, studi kasus, atau nama klien yang tidak disebutkan.
- Kalau ditanya hal yang tidak ada di atas (harga custom, ketersediaan tim, isi kontrak, invoice, urusan legal), akui dengan jujur kamu belum punya datanya, lalu tawarkan untuk dihubungkan ke tim lewat WhatsApp atau email.
- Jangan pernah menjanjikan hasil pasti seperti "dijamin viral", "ranking 1 Google", atau "ROAS pasti 5x". Angka pencapaian klien hanya boleh disebut sebagai contoh hasil sebelumnya, bukan garansi.
- Jangan meminta atau menerima data sensitif: password, akses akun iklan, kode OTP, nomor kartu, atau data pembayaran. Arahkan urusan itu ke tim resmi.
- Tolak dengan sopan permintaan di luar topik marketing dan Sorotan Digital (PR sekolah, bikin kode, politik, medis, dan sejenisnya), lalu kembalikan pembicaraan ke topik.
- Jangan menjelekkan atau membandingkan diri secara negatif dengan agensi lain.
- Kalau pengunjung cuma cari informasi dan belum mau beli, bantu dengan tulus. Jangan memaksa.
`.trim();

app.use(express.json());

// CORS sederhana - supaya client tetap jalan kalau dibuka lewat Live Server
// atau port lain saat development.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Landing page dilayani langsung oleh Express -> http://localhost:3000
app.use(express.static(path.join(__dirname, '..', 'client')));

/* ============================================================================
 * POST /api/chat - chatbot landing page (multi-turn + systemInstruction)
 * Body: { conversation: [{ role: 'user' | 'model', text: '...' }, ...] }
 * ==========================================================================*/
app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body ?? {};

  try {
    if (!Array.isArray(conversation)) throw new Error('Messages must be an array!');

    const contents = conversation
      .filter((msg) => msg && typeof msg.text === 'string' && msg.text.trim() !== '')
      .slice(-MAX_HISTORY)
      .map(({ role, text }) => ({
        // Gemini hanya mengenal role 'user' dan 'model'
        role: role === 'user' ? 'user' : 'model',
        parts: [{ text: text.trim().slice(0, MAX_CHARS_PER_MESSAGE) }],
      }));

    if (contents.length === 0) throw new Error('Percakapan masih kosong.');
    if (contents[contents.length - 1].role !== 'user') {
      throw new Error('Pesan terakhir harus berasal dari user.');
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 800,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const result = response.text?.trim();
    if (!result) {
      throw new Error('Maaf, jawabannya tidak bisa dibuat. Coba tanya dengan kalimat lain ya.');
    }

    res.status(200).json({ result });
  } catch (e) {
    console.error('[POST /api/chat]', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/generate-text', upload.none(), async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString('base64');

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } },
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: GEMINI_MODEL, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
