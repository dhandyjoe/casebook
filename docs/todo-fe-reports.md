# TODO frontend: Reports (Report Summary)

Layar: canvas "Casebook — UI Design", artboard `06 · Report Summary` (`project/Report.dc.html`). Cakupan: Summary Project (RPT-03), Milestone (RPT-02 tanpa plan), Test Run (RPT-01), Export dan share (RPT-04). Summary Test Plan tidak dibuat. Project `store` memakai data contoh, project lain membaca Firestore.

## Sudah ada
- [x] `nav.reports` di `locales/en.json`; `TABS` di `components/layout/ProjectNav.tsx` sudah berisi `reports`.
- [x] `ProjectShell` untuk header + tab project.
- [x] Domain `features/runs/domain.ts`: `STATUS_ORDER`, `Counts`, `totalOf`, `sumCounts`, `executedPct`, `percentages`, `Run`, `RunTest`, `Milestone`.
- [x] Komponen `CountBar`, `TestStatusChip` di `features/runs/status.tsx`.
- [x] Hooks `useRuns`, `useMilestones`, `useProject`, `useRunData` (switch mock `store` / Firestore).
- [x] Util `lib/time.ts` (`formatDate`, `relativeTime`), `people/data.ts` (`personOf`).

## Belum ada

### 1. Routing dan navigasi
- [ ] Route `/p/$projectId/reports` di `router.tsx`, daftarkan di `routeTree`.
- [ ] `ROUTES.reports` di `ProjectNav.tsx` agar tab tidak lagi `<a href="#">`.
- [ ] Search params tervalidasi: `template` (`project` | `milestone` | `run`, default `project`) dan `id` (milestone/run). Nilai tidak dikenal jatuh ke default, tidak error.

### 2. Domain (`features/reports/domain.ts`, fungsi murni)
- [ ] `summarize(countsList)`: total, executed, executed %, pass rate (passed / executed), failed + blocked. Pembagian nol menghasilkan 0, bukan `NaN`.
- [ ] `projectBreakdown(milestones, runs)`: baris per milestone (counts gabungan run-nya) + run aktif tanpa milestone.
- [ ] `milestoneBreakdown(runs)`: baris per run di milestone.
- [ ] `assigneeBreakdown(tests)`: baris per assignee untuk Run summary (RPT-01).
- [ ] `failedBlocked(tests)`: test berstatus `failed`/`blocked`, urut sesuai `STATUS_ORDER` lalu nomor test.
- [ ] `toCsv(rows)`: escape `"`, koma, dan baris baru; header berbahasa Inggris; prefix `'` untuk sel yang diawali `=`, `+`, `-`, `@` (cegah formula injection di Excel).
- [ ] `domain.test.ts`: angka KPI sesuai contoh canvas, kasus run kosong.

### 3. Data (`features/reports/hooks.ts`)
- [ ] `useReport(projectId, template, id)`: gabung `useRuns`, `useMilestones`, `useRunData`; kembalikan `{ data, isLoading, error, asOf }`.
- [ ] Tests (failed/blocked, per assignee) hanya dibaca untuk template `run` dan `milestone`; template `project` cukup `runs.counts`.
- [ ] Data contoh untuk `store` di `seed.ts` mencakup minimal 1 milestone dengan beberapa run dan test failed/blocked.

### 4. Layar (`features/reports/ReportsPage.tsx`)
- [ ] Sidebar template (`--cb-sidebar`): satu grup **Summary** (Project, Milestone, Test Run). Tanpa grup Analysis.
- [ ] Item aktif: `aria-current="true"`, inset border kiri sesuai canvas.
- [ ] Picker milestone/run (select atau combobox) saat template butuh `id`; ganti pilihan memperbarui URL.
- [ ] Header: label template, judul (nama project/milestone/run), "Data as of {tanggal, jam}", ringkasan (jumlah run, due date milestone), tombol **Copy link** dan **Export PDF**.
- [ ] 4 KPI card: Total test, Executed, Pass rate (hijau), Failed & Blocked (merah). Ukuran sesuai `design.md` (label 13 `#5A6170`, angka 30/700, caption 12).
- [ ] Section "Status by …" (milestone / run / assignee sesuai template): bar tinggi 18px, legend urutan `STATUS_ORDER`, % executed di kanan, catatan arti angka. Pakai `CountBar` dengan `className` tinggi 18.
- [ ] Tabel "Test Failed & Blocked": ID, Title, Run, Status, Defect / note, Tester. Box `overflow-x: auto` + `min-width: 760px`. Judul link ke Run detail, "View all N" ke Run detail dengan filter status.
- [ ] Run summary: thumbnail evidence untuk test Failed (EVD-08) bila evidence tersedia; tanpa evidence kolom tidak tampil.
- [ ] Teks UI semua lewat `t()`; tambah blok `"reports": {}` di `locales/en.json`.

### 5. State dan edge case
- [ ] Loading: skeleton KPI dan bar, bukan spinner layar penuh.
- [ ] Empty: project tanpa milestone/run, milestone tanpa run, run tanpa test (pesan + link ke Milestones / Test Runs).
- [ ] Error: gagal baca Firestore dengan tombol Retry; `id` tidak ditemukan dengan pesan "Report not found".
- [ ] Responsif: sidebar menumpuk di atas pada layar sempit, KPI grid `auto-fit`, tabel scroll horizontal.
- [ ] Aksesibilitas: `aria-labelledby` per section, fokus terlihat, bar punya teks alternatif (angka per status) untuk pembaca layar.

### 6. Export dan share (RPT-04)
- [ ] **Copy link**: salin URL saat ini (`navigator.clipboard.writeText`), toast "Link copied". Link hanya terbuka bagi anggota workspace (rules Firestore).
- [ ] **Export PDF** dengan `@react-pdf/renderer` (`architecture.md`: PDF dibuat di browser, tanpa server):
  - [ ] Tambah dependency `@react-pdf/renderer` ke `apps/web`.
  - [ ] `features/reports/ReportPdf.tsx`: `<Document>`, `<Page size="A4">`, header (project, judul, "Data as of"), KPI, bar status dari `<View>` dengan lebar persen, tabel failed/blocked, footer nomor halaman.
  - [ ] Style lewat `StyleSheet` dengan warna status dari `design.md`; font Inter di-`Font.register` dari file lokal (bukan CDN).
  - [ ] Data dari fungsi `domain.ts` yang sama dengan layar, sehingga angka PDF dan layar identik.
  - [ ] Load lazy: `await import('@react-pdf/renderer')` saat tombol ditekan, agar tidak masuk bundle awal.
  - [ ] Tombol menampilkan status "Generating…" dan `disabled` selama proses; error ditampilkan lewat toast.
  - [ ] Thumbnail evidence via `<Image>` dari URL Cloudinary (transformasi ukuran kecil); gambar gagal dimuat dilewati, PDF tetap jadi.
  - [ ] Tabel panjang terpotong rapi antar halaman (`wrap`, header tabel `fixed`).

### 7. Tes
- [ ] `ReportsPage.test.tsx`: render tiap template dengan data `store`, KPI benar, item Test Plan tidak ada, tidak ada grup Analysis.
- [ ] Tes Copy link (mock `clipboard`) dan Export PDF (render `ReportPdf` menghasilkan `%PDF-`).
- [ ] Tes `ReportPdf` cukup render tanpa error dengan data contoh (tanpa snapshot PDF).
- [ ] `pnpm -C apps/web test` dan `typecheck` lulus.

## Di luar cakupan
- Summary Test Plan (bagian plan di RPT-02).
- Saved reports / koleksi `Report` (`prd.md` 5.9, model data `Report`): share cukup lewat URL.
- Report Analysis RPT-05/06/07 (P1): tidak ditampilkan di sidebar; dibuat saat dikerjakan.
- Export CSV (diputuskan tidak dipakai; hanya PDF).
- Library chart (ECharts): canvas hanya memakai bar CSS.
