## Struktur

```
client/          landing page (HTML + CSS + JS, tanpa build step)
  index.html     seluruh section landing page + markup chat widget
  style.css      styling & responsive
  script.js      carousel, animasi, form, dan logika chat widget
server/
  index.js       Express + Gemini (endpoint /api/chat ada di sini)
  .env           GEMINI_API_KEY (tidak ikut ter-commit)
```

## Menjalankan
cd server && npm install && npm start

Buka **http://localhost:3000** — Express sekaligus melayani folder `client/`,
jadi tidak perlu Live Server terpisah. (Kalau tetap mau pakai Live Server,
`script.js` otomatis mengarahkan request API ke `http://localhost:3000`,
dan CORS di server sudah dibuka.)

Isi `server/.env`:

```
GEMINI_API_KEY=isi_api_key_kamu
PORT=3000
```

## Endpoint

| Method | Path                  | Keterangan                                          |
| ------ | --------------------- | --------------------------------------------------- |
| POST   | `/api/chat`           | Chatbot landing page — multi-turn + systemInstruction |
| POST   | `/generate-text`      | Endpoint bawaan starter (prompt teks)                |
| POST   | `/generate-from-image`| Endpoint bawaan starter (prompt + gambar)            |
| GET    | `/api/health`         | Cek server & model yang dipakai                      |

### POST /api/chat

Request:

```json
{
  "conversation": [
    { "role": "user",  "text": "berapa harga jasa clipping?" },
    { "role": "model", "text": "Mulai dari Rp 3.500.000/bulan..." },
    { "role": "user",  "text": "kalau yang lebih murah ada?" }
  ]
}
```

Response: `{ "result": "..." }` — atau `{ "error": "..." }` dengan status 500.

Yang ditangani server:

- role dinormalkan ke `user` / `model` (Gemini hanya mengenal dua role itu)
- pesan kosong dibuang, riwayat dipotong ke 20 pesan terakhir, tiap pesan dibatasi 2000 karakter
- ditolak kalau `conversation` bukan array atau pesan terakhir bukan dari user

### systemInstruction

Persona chatbot bernama **Nara**, didefinisikan sebagai konstanta `SYSTEM_INSTRUCTION`
di `server/index.js`. Isinya:

- profil perusahaan, jam operasional, dan kontak
- 8 layanan beserta harga "mulai dari", plus 3 paket bundling
- alur kerja 4 langkah
- gaya bicara: Bahasa Indonesia, maksimal 4 kalimat, selalu ditutup ajakan konkret
- pagar pengaman: tidak mengarang harga/klien, tidak menjanjikan hasil pasti,
  menolak permintaan data sensitif, dan menolak pertanyaan di luar topik

Semua harga di systemInstruction sengaja disamakan dengan yang tampil di landing page,
supaya jawaban chatbot tidak bertentangan dengan halamannya.

## Riwayat chat

Percakapan disimpan di **localStorage** browser (key `nara-chat-v1`), jadi tetap ada
setelah halaman di-refresh dan tetap terkirim ke `/api/chat` sebagai konteks.

- hanya **40 pesan terakhir** yang disimpan
- riwayat otomatis dibuang setelah **24 jam**
- tombol ⟳ di header chat = hapus riwayat & mulai percakapan baru
- kalau localStorage diblokir (mode privat) atau isinya rusak, widget tetap jalan —
  cuma balik ke percakapan kosong

Server tidak menyimpan apa pun; seluruh riwayat hidup di browser pengunjung.

## Isi landing page

Hero dengan carousel (3 slide, autoplay + swipe) · statistik · logo klien berjalan ·
8 kartu layanan + 3 paket · cara kerja 4 langkah · studi kasus · tentang kami ·
tim · testimoni · partner bisnis · form kontak · footer · chat widget.
