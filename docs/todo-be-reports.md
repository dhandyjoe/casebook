# TODO backend: Reports (Report Summary)

Layar: `apps/web/src/features/reports/ReportsPage.tsx` (lihat `docs/todo-fe-reports.md`). Report dihitung di browser dari Firestore (`architecture.md` bagian 9); tidak ada server PDF dan tidak ada endpoint Worker baru. Cakupan: Summary Project, Milestone, Test Run. Test Plan tidak termasuk.

## Sudah ada
- [x] `listRuns(projectId, milestoneId?)` di `features/runs/api.ts` (satu `where`, urut di klien, tanpa index composite).
- [x] `listMilestones`, `getRun`, `listTests`, `listResults`.
- [x] `runs.counts` dijaga transaksi `addResult` (RUN-10), cukup untuk KPI dan bar status Project/Milestone tanpa membaca tests.
- [x] Rules read per workspace untuk `milestones`, `runs`, `runs/{run}/tests`, `results` di `firebase/firestore.rules`.

## Belum ada

### 1. Query
- [ ] `listTests(projectId, runId, { status })`: opsi filter `where('status', 'in', ['failed', 'blocked'])` agar tabel Failed & Blocked tidak membaca semua test (index single-field otomatis, tidak perlu composite).
- [ ] Milestone summary: baca failed/blocked per run secara paralel (`Promise.all`), dengan batas jumlah baris (mis. 50 pertama per run + total dari `counts`) supaya hemat kuota Spark (`architecture.md`: dibatasi per milestone).
- [ ] Project summary: hanya `listMilestones` + `listRuns`; tests tidak dibaca.
- [ ] Run summary per assignee (RPT-01): dari `listTests` (field `assignee`, `status`). Bila run besar, pakai index `(assignee, status)` yang sudah tercatat di `todo-be-run-detail.md`.

### 2. Data pendukung tabel Failed & Blocked
- [ ] Defect / note: simpan ringkasan hasil terakhir di dokumen test (`lastDefects`, `lastComment`) dalam transaksi `addResult`, agar tabel tidak membaca `results` per test. Update rules `tests` untuk field baru.
- [ ] Tester: assignee memakai uid dan nama di-resolve lewat Worker `GET /v1/users` (rujuk `todo-be-run-detail.md`).
- [ ] Evidence thumbnail (EVD-08) dari URL Cloudinary untuk layar dan PDF; bergantung pada Worker `/evidence/sign` dan field `evidence[]` di result (rujuk `todo-be-run-detail.md`).

### 3. Konsistensi angka
- [ ] Pastikan `counts` run selalu sama dengan jumlah test per status (termasuk saat run dibuat per batch 500 dan saat test dihapus). Tambah tes yang membandingkan `counts` dengan hasil `count()` agregasi.
- [ ] Run aktif: opsional hitung ulang dengan `getCountFromServer` per status bila `counts` diragukan (`architecture.md`: progres run aktif via agregasi `count()`).
- [ ] "Data as of" memakai waktu fetch di klien; tidak perlu field baru.

### 4. Keamanan dan share
- [ ] Link share (Copy link) hanya terbuka bagi anggota workspace: pastikan rules menolak read `runs`/`tests`/`milestones` dari workspace lain dan dari user tanpa login.
- [ ] Tidak ada link publik pada tahap ini; bila nanti dibutuhkan, perlu koleksi `Report` + token, bukan melonggarkan rules.

### 5. Tes
- [ ] Tes emulator Firebase: read runs/tests/milestones lintas workspace ditolak; read anggota diizinkan; field baru `lastDefects`/`lastComment` hanya bisa ditulis bersama `addResult`.
- [ ] Vitest `api.ts`: `listTests` dengan filter status mengembalikan hanya failed/blocked.

## Di luar cakupan
- Summary Test Plan, koleksi `Plan` untuk report.
- Koleksi `Report` (saved reports, `prd.md` model data) dan report terjadwal via email (RPT-10, P2).
- Endpoint Worker untuk report atau PDF server-side.
- Report Analysis P1 (RPT-05/06/07).
