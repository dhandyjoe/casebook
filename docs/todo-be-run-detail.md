# TODO backend: Test Run detail

Layar: `apps/web/src/features/runs/RunDetailPage.tsx`. Project `store` memakai data contoh; project lain membaca Firestore lewat `useRunData` (`hooks.ts`).

## Sudah ada
- [x] `getRun`, `listTests`, `listResults` di `api.ts` (baca tanpa pagination, tanpa evidence).
- [x] `addResult` (transaksi: result + status test + counts run + status run, RUN-10), `startRun`, `updateRun`.
- [x] Rules `runs/{run}/tests/{test}` dan `results/{result}` (read per workspace, hasil append-only, hanya saat run bukan draft).

## Belum ada
- [ ] Pagination `listTests` (per halaman 100-200, urut `sectionId`, `sectionOrder`); saat ini membaca semua test run (boros kuota Spark bila run ribuan test).
- [ ] Index composite di `firebase/firestore.indexes.json`: tests `(sectionId, sectionOrder)`, `(status, sectionOrder)`, `(assignee, status)`; results `(createdAt desc)`.
- [ ] `addResult` lengkap: `elapsed`, `defects`, dan `evidence[]` (rules `results` saat ini hanya mengizinkan `status, comment, createdBy, createdAt`).
- [ ] Evidence: Worker `POST /evidence/sign` dan `/evidence/delete`, upload ke Cloudinary lewat `lib/evidence.ts`, simpan `publicId/width/height/bytes` di result (EVD-01/02/05). Hapus `dataUrl` lokal dari `Evidence`.
- [ ] Denormalisasi di `tests`: `projectId`, `runName`, `assigneeId`, `status` untuk To-do lintas project (collection group query).
- [ ] Assignee test memakai uid, bukan inisial; filter "mine" ikut berubah.
- [ ] Nama pembuat hasil: simpan nama/inisial atau resolve lewat `/v1/users` (saat ini inisial dari daftar user, fallback uid).
- [ ] Plan untuk run Firestore (`planId`, breadcrumb, `Plan` collection); saat ini `plan` selalu kosong.
- [ ] Hapus run dari halaman detail (`deleteRun` sudah ada, belum ada tombol/konfirmasi).
- [ ] Penanganan error: gagal `addResult`/`startRun`/`updateRun` (toast + rollback), run tidak ditemukan vs gagal baca.
- [ ] Tes emulator Firebase untuk rules `tests`/`results` dan Vitest untuk `api.ts`.
