# Casebook

Web app test case management. Dokumen acuan, urut prioritas:

1. `design.md` + canvas "Casebook — UI Design" (artifact `27pST9HTJjap7neus7YSYJ`) untuk tampilan
2. `prd.md` untuk kebutuhan
3. `architecture.md` untuk stack dan struktur

Frontend dikerjakan dulu dengan data mock, backend (Firebase, Worker) menyusul.
Jawab user dalam Bahasa Indonesia. Teks UI Bahasa Inggris, disimpan di `apps/web/src/locales/en.json`.

## Aturan pemakaian skill

Pilih skill menurut jenis tugasnya. Bila user menyebut nama skill atau command tertentu, ikuti permintaan itu.

| Tugas | Yang dipakai |
| --- | --- |
| Menulis, mengubah, atau memperbaiki kode; memilih dependency | `ponytail` |
| Memeriksa apakah kode berlebihan | `/ponytail-review`; satu repo: `/ponytail-audit` |
| Membuat atau memoles landing page, website marketing, halaman publik | `design-taste-frontend` (taste-skill) |
| Membuat atau memoles layar aplikasi (Sign in, Dashboard, Test Cases, Test Runs, Reports, Admin, dll.) | `design.md` + canvas. **Jangan pakai taste-skill** |
| Laporan progres, ringkasan hasil perintah, jawaban faktual singkat | `caveman` |
| Penjelasan, pertanyaan ke user, pilihan keputusan, peringatan risiko | Kalimat lengkap dan jelas, tanpa gaya caveman |
| Dokumen, commit, PR, teks UI, kode | Bahasa normal, tanpa gaya caveman |

Bila bertentangan:

- Kebutuhan di `prd.md`, `architecture.md`, dan `design.md` dihitung sebagai permintaan user. Ponytail tidak boleh memangkasnya sebagai "tambahan".
- Tampilan layar aplikasi mengikuti `design.md` + canvas, bukan aturan taste-skill (foto asli, satu section per layar, animasi hover wajib).
