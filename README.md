# Casebook

Web app test case management dengan UI/UX yang sederhana dan cepat. Tulis test case di repository terstruktur, eksekusi lewat Test Run, kelompokkan dengan Test Plan dan Milestone, lalu pantau hasilnya lewat Dashboard dan Reports.

> **Status: tahap perencanaan.** Repo ini baru berisi dokumen PRD dan arsitektur. Kode aplikasi belum dibuat, jadi belum ada langkah instalasi.

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [PRD](PRD%20%E2%80%94%20Casebook.md) | Tujuan produk, role & permission, kebutuhan fungsional, prinsip UI/UX, model data, dan lingkup MVP |
| [Arsitektur](Arsitektur%20%E2%80%94%20Casebook.md) | Stack teknologi, security rules, struktur database, alur kunci, CI/CD, testing, keamanan, dan biaya |

## Masalah yang Diselesaikan

- Test case tersebar di spreadsheet, wiki, atau tiket bug, sehingga sulit dicari, di-reuse, dan dilacak riwayatnya.
- Tidak ada gambaran real-time tentang progres, kegagalan, dan pembagian tugas tester.
- Sulit menjawab "apakah rilis ini siap?" karena hasil test tidak terhubung ke rilis atau sprint.

## Fitur Utama (MVP)

- **Test Case Repository:** section bertingkat, template Text dan Steps, quick add, filter, dan bulk action.
- **Review & Approval:** case baru berstatus Under Review, dan hanya case yang di-approve Lead yang bisa masuk Test Run.
- **Test Run:** status Passed, Failed, Blocked, atau Retest bisa diisi langsung dari tabel. Run yang ditutup terkunci sebagai arsip.
- **Evidence:** screenshot bisa dilampirkan lewat upload, drag & drop, atau paste, dan dikompres otomatis di browser.
- **Test Plan & Milestone:** beberapa run bisa dikelompokkan, dan progresnya dipantau per rilis atau sprint.
- **Dashboard & Reports:** To-do pribadi, progres per project, dan report Summary yang bisa diekspor ke PDF dan CSV.
- **Role per project:** Admin, Lead, Tester, dan Viewer.

Di luar lingkup fase awal: bug tracker, tool otomasi test, dan ALM lengkap. Daftar kebutuhan lengkap beserta prioritas P0, P1, dan P2 ada di PRD.

## Stack Teknologi

Semua layanan memakai paket gratis, tanpa kartu kredit.

| Area | Teknologi |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, shadcn/ui, Tailwind CSS |
| Hosting | Cloudflare Pages |
| Auth & database | Firebase Authentication dan Cloud Firestore (paket Spark) |
| Aturan bisnis | Firestore Security Rules |
| Server kecil | Cloudflare Workers + Hono |
| Evidence gambar | Cloudinary |
| Monorepo | pnpm + Turborepo |
| CI/CD | GitHub Actions |
| Testing | Vitest, `@firebase/rules-unit-testing`, Playwright |

## Rencana Struktur Repo

```
casebook/
  apps/
    web/            # React SPA (Cloudflare Pages)
    worker/         # Cloudflare Worker
  packages/
    shared/         # schema Zod, tipe domain, enum status, konstanta permission
  firebase/         # security rules dan index Firestore
  scripts/          # backup Firestore, pembersihan evidence yatim
  e2e/              # Playwright
```
