# Arsitektur — Casebook

Nov 5, 2026 · @apakah bisa bahasa indonesia?

Dokumen teknis pendamping Doc. Kode kebutuhan (TC-xx, RUN-xx, APR-xx, EVD-xx) merujuk ke PRD tersebut.

## 1. Ringkasan & Keputusan Utama

**Revisi 5 Nov 2026: arsitektur tanpa paket Blaze dan tanpa kartu kredit.** Aplikasi adalah **SPA React + TypeScript** yang di-hosting di **Cloudflare Pages**. Aplikasi langsung memakai **Firebase paket Spark** (Authentication + Cloud Firestore edisi Standard), sementara aturan bisnis seperti isolasi workspace dan approval ditegakkan oleh **Firestore Security Rules**. Evidence gambar disimpan di **Cloudinary (Free)**, dan satu **Cloudflare Worker** kecil menangani hal yang butuh rahasia (tanda tangan upload, REST API). Semua komponen memakai paket gratis.

| Area | Keputusan | Alasan singkat |
| --- | --- | --- |
| Frontend | React 19 + Vite + TypeScript (SPA) | App di balik login, tidak butuh SSR; hasil build berupa file statis |
| UI kit | shadcn/ui (Radix UI + Tailwind CSS) | Komponen bersih & aksesibel, mudah dibuat rapi seperti TestRail |
| Hosting | Cloudflare Pages | Gratis, bandwidth tak terbatas, boleh untuk komersial, preview per commit |
| Auth | Firebase Authentication (paket Spark) | Login email/password, verifikasi email, reset password gratis |
| Database | Cloud Firestore **Standard edition** (paket Spark) | Realtime + security rules; kuota gratis harian, tidak pernah menagih |
| Aturan bisnis | Firestore Security Rules + batched write/transaction dari client | Pengganti Cloud Functions (yang butuh Blaze); isolasi workspace dan approval tetap tidak bisa dibobol dari client |
| Server kecil | Cloudflare Workers (Free) + Hono | Tanda tangan upload Cloudinary, email undangan & REST API (P1) |
| Evidence gambar | Cloudinary (Free) | Tanpa kartu, kuota terpisah dari database, thumbnail & CDN otomatis |
| Repo | Monorepo pnpm + Turborepo | Web, Worker, rules, dan schema Zod berbagi tipe yang sama |

**Prinsip arsitektur**

1. **Client menulis langsung, rules yang menjaga.** Semua tulis data (case, approval, run, hasil) dilakukan client lewat batched write/transaction; security rules memeriksa workspace dan transisi status di setiap baca dan tulis.
2. **Aturan bisnis ditegakkan di rules, bukan di UI.** Contoh: user hanya bisa membaca dan menulis data workspace-nya (WS-04); approval hanya sah bila dokumen review ikut dibuat (APR-02); hasil tidak bisa ditambah ke run Draft, dan status Done hanya sah bila tidak ada test Untested/Retest (RUN-10).
3. **Hemat kuota.** Paket Spark punya batas baca/tulis harian, jadi semua daftar memakai pagination dan cache lokal, dan progres run dihitung dengan agregasi `count()`.
4. **Snapshot untuk arsip.** Test menyimpan salinan case saat run dibuat; isi test tidak ikut berubah saat case diedit, dan hasil yang sudah tersimpan tidak bisa diubah (RUN-02).
5. **Bisa naik kelas.** Bila kuota gratis tidak lagi cukup, jalur upgrade-nya jelas (Bagian 12) tanpa menulis ulang aplikasi.

## 2. Gambaran Sistem

Browser mengunduh SPA dari Cloudflare Pages, lalu berbicara langsung dengan Firebase (login dan data) dan Cloudinary (upload & tampilan gambar). Worker hanya dipanggil untuk hal yang butuh kunci rahasia: menandatangani upload Cloudinary, dan nanti (P1) mengirim email undangan serta melayani REST API untuk CI.

&#91;embedded content: arsitektur sistem · klien, Firebase, layanan eksternal\]

Worker membaca Firestore lewat REST API **memakai ID token milik user**, sehingga security rules tetap berlaku juga untuk Worker. Tidak ada komponen yang bisa melewati rules, kecuali skrip backup dan API publik P1 yang memakai service account (Bagian 9 dan 11).

## 3. Frontend

Karena tidak ada Cloud Functions, frontend memegang lebih banyak logika: menyusun batched write sesuai aturan rules, mengompres gambar, dan membuat report. Stack dipilih agar halaman berat (ribuan case, tabel run) tetap cepat dan hemat kuota.

| Kebutuhan | Library | Alasan | Dipakai untuk |
| --- | --- | --- | --- |
| Framework & build | React 19, Vite, TypeScript | Ekosistem terbesar, dev server cepat | Seluruh app |
| Routing | TanStack Router | Route & search param bertipe; filter tabel bisa disimpan di URL | `/p/:projectId/cases?section=…&priority=…` |
| Data server | Firebase JS SDK (modular) + TanStack Query | Cache & pagination; `onSnapshot` hanya untuk data yang perlu realtime | Daftar case, run, progres |
| Cache Firestore | `persistentLocalCache` (IndexedDB) | Data yang sudah pernah dibaca tidak dibaca ulang dari server → hemat kuota baca | Seluruh app |
| UI components | shadcn/ui (Radix UI) + Tailwind CSS | Aksesibel, mudah dikustom | Dialog Add case / Add Test Run, dropdown, tab, toast, checkbox tri-state |
| Ikon | Lucide | Konsisten dengan shadcn/ui | Seluruh UI |
| Design token | CSS variables + Tailwind theme | Satu sumber warna, radius, font, dan shadow dari design.md; siap untuk tema gelap | Seluruh UI |
| Animasi | CSS keyframes + tailwindcss-animate | Tanpa library JS; otomatis mati lewat media query prefers-reduced-motion | Animasi masuk halaman Sign in, buka/tutup dialog |
| Tabel | TanStack Table + TanStack Virtual | Sorting, seleksi bulk, virtual scroll untuk ribuan baris | Daftar case (TC-07), tabel run (RUN-04) |
| Pohon section | react-arborist | Tree virtual dengan drag & drop, rename inline | Pohon section Test Cases (TC-01, TC-08), kolom folder Test Run, picker section di dialog Add Test Run |
| Drag & drop | dnd-kit | Reorder step dan case | Editor steps, urutan case |
| Form & validasi | React Hook Form + Zod | Schema Zod dipakai bersama dengan Worker | Editor case, form Add Result |
| Rich text | Tiptap | Markdown shortcut, tabel; gambar inline diunggah ke Cloudinary | Preconditions, steps, expected result, Comment & evidence (TC-04) |
| Kompres gambar | browser-image-compression | Ubah ke WebP, lebar maks. 1920 px, target ≤ 400 KB sebelum upload | Evidence (EVD-01/02) |
| Upload | react-dropzone + upload API Cloudinary (XHR untuk progress) | Drag & drop, paste clipboard, progress per file | Evidence (EVD-01/02) |
| Gambar & thumbnail | URL transformasi Cloudinary (`c_limit,w_400,f_auto,q_auto`) | Thumbnail tanpa server | Daftar hasil, lightbox |
| Lightbox gambar | yet-another-react-lightbox | Zoom, next/prev, download | Lihat evidence (EVD-03) |
| Grafik | Apache ECharts (echarts-for-react) | Stacked bar, line, donut | Dashboard, report |
| State UI lokal | Zustand | State non-server (panel terbuka, mode tampilan) | Layout, preferensi |
| Shortcut keyboard | react-hotkeys-hook | P / F / B / R untuk status, N untuk test berikutnya | Kolom detail Test Run |
| i18n | i18next + react-i18next | UI MVP berbahasa Inggris; Bahasa Indonesia menyusul (P1) cukup dengan menambah file terjemahan | Semua label UI, status, pesan sistem, waktu relatif; isi buatan user tidak diterjemahkan |
| Tanggal | date-fns (+ date-fns-tz) | Mendukung zona waktu user | Due date, riwayat |
| CSV | Papa Parse | Parse & validasi import CSV di browser | Import case (TC-10) |
| Export PDF | @react-pdf/renderer | PDF dibuat di browser, tanpa server | Report (RPT-04) |
| Monitoring | Sentry (browser SDK, paket gratis) | Error tracking | Produksi |

**Struktur folder FE (feature-based)**

```
apps/web/src/
  app/              # router, providers, layout utama
  features/
    auth/  dashboard/  projects/  cases/  reviews/
    runs/  plans/  milestones/  reports/  admin/
  components/ui/    # komponen shadcn, divarian sesuai design.md
  components/split/ # SplitView 3 kolom (Test Cases, Test Run)
  styles/tokens.css # token warna, radius, shadow, motion dari design.md
  locales/en.json   # semua string UI (id.json menyusul di P1)
  lib/firebase.ts   # inisialisasi SDK + persistentLocalCache
  lib/evidence.ts   # kompres → minta tanda tangan → upload Cloudinary
  lib/queries/      # query key & hook TanStack Query
```

Setiap fitur memiliki `api.ts` (batched write ke Firestore yang dibentuk sesuai rules), `hooks.ts`, dan komponen sendiri. Modul `lib/evidence.ts` membungkus semua urusan gambar, sehingga penyedia penyimpanan bisa diganti tanpa mengubah fitur lain.

**Design system.** Token dan aturan komponen ditulis di design.md, lalu diterapkan sebagai CSS variables di `styles/tokens.css` dan di-map ke `tailwind.config` (colors, borderRadius, fontFamily, boxShadow). Komponen shadcn diberi varian sesuai design.md: Button (primary, secondary, ghost, destructive), StatusChip, StatusBar bertumpuk, Checkbox tri-state, Dialog (720 px untuk Add case, 1120 px untuk Add Test Run). Test Cases dan Test Run memakai satu komponen `SplitView` tiga kolom yang sama, sehingga perilaku pilih item, keyboard, dan lebar kolom konsisten.

## 4. Backend

Tidak ada server Firebase (Cloud Functions butuh Blaze). Logika bisnis dibagi ke tiga tempat: **security rules** (menjaga setiap tulis), **client** (menyusun batched write/transaction yang lolos rules), dan **satu Cloudflare Worker** untuk tugas yang membutuhkan kunci rahasia.

**Layanan yang dipakai (semua paket gratis)**

| Layanan | Peran | Fase |
| --- | --- | --- |
| Firebase Authentication (Spark) | Akun, login, verifikasi email, reset password | MVP |
| Cloud Firestore Standard (Spark) | Database utama + realtime listener + security rules | MVP |
| Cloudflare Pages (Free) | Hosting SPA, header keamanan, preview per PR | MVP |
| Cloudflare Workers (Free) | Tanda tangan & hapus upload Cloudinary; email dan REST API di P1 | MVP |
| Cloudinary (Free) | Penyimpanan & tampilan evidence gambar | MVP |
| GitHub Actions | CI/CD dan backup Firestore terjadwal | MVP |
| Penyedia email dengan paket gratis (mis. Resend) | Email undangan & notifikasi dari Worker | P1 |

**Di mana setiap logika berjalan**

| Logika | Dijalankan oleh | Kebutuhan PRD |
| --- | --- | --- |
| Register & pilih workspace | Client (`setDoc users/{uid}` berisi `workspaceId` dari daftar statis), dijaga rules | AUTH-01, WS-01 |
| Undang anggota | MVP: link undangan disalin manual, penerima memilih workspace yang sama; P1: email otomatis lewat Worker | AUTH-04 |
| Kirim untuk review / approve / kembalikan ke Draft | Client (batch: case + dokumen `reviews`); rules memastikan dokumen review ikut dibuat | APR-02/03 |
| Edit case → kembali Under Review | Rules memaksa status `under_review` bila konten utama case Approved berubah; case Draft bebas diedit | APR-04 |
| Nomor case C123 | Client transaction pada `projects.nextCaseNumber` | TC-02 |
| Buat run + snapshot case | Client (batch per 500 test); run `draft` → `active` setelah semua batch selesai | RUN-01/02 |
| Input hasil | Client (batch: result + status test + `runs.counts` + status run); rules memastikan run bukan `draft` | RUN-04/05 |
| Progres run | Agregasi `count()` per status (Bagian 6) | RUN-08 |
| Status Done otomatis (run / plan) | Client, di batch yang sama dengan simpan hasil: bila `untested == 0` dan `retest == 0` status jadi `done`, selain itu `active`; rules memvalidasi transisinya. Status plan diturunkan dari status run-nya | RUN-10, PLAN-04 |
| Tanda tangan & hapus evidence | Worker `POST /evidence/sign`, `POST /evidence/delete` | EVD-01/05 |
| Report & PDF | Client | RPT-01…04 |
| Email notifikasi & digest | Worker + Cron Trigger | NOTIF-02 (P1) |
| REST API untuk CI | Worker + service account | INT-01/02 (P1) |
| Backup data | GitHub Actions terjadwal | NFR |

**Library Worker (paket `apps/worker`)**

| Kebutuhan | Library |
| --- | --- |
| Router HTTP | Hono (+ `@hono/zod-openapi` untuk dokumentasi API di P1) |
| Verifikasi login | `jose` memverifikasi Firebase ID token terhadap kunci publik Google |
| Validasi input | Zod (schema dibagi dengan FE lewat `packages/shared`) |
| Tanda tangan Cloudinary | Web Crypto API (SHA-256), tanpa SDK berat |
| Deploy & dev lokal | Wrangler |
| Testing | Vitest + `@cloudflare/vitest-pool-workers` |

Batas Workers Free: 100 ribu request/hari dan 10 ms CPU per request; waktu menunggu jaringan tidak dihitung ([Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)). Worker ini hanya menghitung hash dan meneruskan request, jadi jauh di bawah batas.

Lokasi database Firestore dipilih saat dibuat dan tidak bisa diubah: gunakan **asia-southeast2 (Jakarta)** untuk latensi terbaik bagi pengguna di Indonesia.

## 5. Autentikasi & Otorisasi

Firebase Authentication menangani identitas. Tidak ada role: semua akun setara. Batas akses adalah **workspace**. User memilih salah satu dari tiga workspace statis (Alpha QA, Beta Squad, Gamma Labs) saat Register; pilihannya disimpan di `users/{uid}.workspaceId` dan tidak bisa diubah sesudahnya. Setiap project membawa `workspaceId`, dan security rules hanya mengizinkan user membaca atau menulis project (beserta seluruh subkoleksinya) bila `workspaceId` project sama dengan milik user (WS-03, WS-04).

**Alur akun**

| Alur | Implementasi |
| --- | --- |
| Register | `createUserWithEmailAndPassword` → `setDoc(users/{uid}, { name, workspaceId })`. Dropdown Workspace Name berisi daftar statis di `apps/web/src/lib/workspaces.ts`; rules menolak id di luar daftar yang sama |
| Undang anggota (P0 minimal) | Link undangan disalin manual; penerima mendaftar dan memilih workspace yang sama. P1: email otomatis lewat Worker |
| Login & remember me | `signInWithEmailAndPassword`; persistence `browserLocalPersistence` (ingat saya) atau `browserSessionPersistence`. Workspace dibaca dari `users/{uid}` |
| Verifikasi email & reset password | Email action bawaan Firebase Auth (gratis) |
| Ganti workspace | Tidak ada. Rules melarang perubahan `workspaceId` setelah dibuat (workspace dinamis = WS-06, P2) |
| Login Google (P1) | Provider Google di Firebase Auth, tersedia di paket Spark |
| SAML/OIDC, 2FA (P2) | Butuh Identity Platform; termasuk jalur upgrade (Bagian 12) |

**Model akses**

- `users/{uid}.workspaceId` = `alpha-qa` | `beta-squad` | `gamma-labs`; juga menyimpan `pinnedProjectIds`.
- `projects/{p}.workspaceId` diisi saat project dibuat (harus sama dengan workspace pembuatnya) dan tidak bisa diubah.
- Semua data lain (cases, runs, plans, milestones, hasil) ada di subkoleksi `projects/{p}/...` dan mengikuti workspace project.
- Reviewer (approve / kembalikan ke Draft) adalah user mana pun di workspace yang sama; yang dijaga rules adalah dokumen review yang wajib ikut dibuat.
- Pencarian global di header hanya mencari project, difilter di browser dari daftar project workspace aktif yang sudah dimuat. Query daftar project selalu memakai `where('workspaceId', '==', …)`.

**Dua lapis penegakan aturan**

1. **UI** hanya menampilkan data workspace aktif (kenyamanan, bukan keamanan).
2. **Firestore Security Rules** memeriksa setiap baca dan tulis: workspace, transisi status, dan status run. Tidak ada jalur baca/tulis yang melewati rules dari aplikasi.

**Contoh rules untuk test case, approval, dan hasil test**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function doc(p) { return path('/databases/' + db + '/documents/' + p); }
    function myWs() { return get(doc('users/' + request.auth.uid)).data.workspaceId; }
    function inWs(p) { return request.auth != null && get(doc('projects/' + p)).data.workspaceId == myWs(); }
    function changed() { return request.resource.data.diff(resource.data).affectedKeys(); }
    function contentChanged() { return changed().hasAny(['title', 'preconditions', 'steps', 'expected']); }
    function runStatus(p, r) { return get(doc('projects/' + p + '/runs/' + r)).data.status; }

    // Status case hanya: draft, under_review, approved
    function validEditStatus() {
      let from = resource.data.status;
      let to = request.resource.data.status;
      return (from == 'draft' && to in ['draft', 'under_review'])             // edit bebas / Kirim untuk review
          || (from == 'under_review' && to == 'under_review')                 // menunggu reviewer
          || (from == 'approved' && (contentChanged()
                ? to == 'under_review'                                       // APR-04
                : to == 'approved'));
    }

    // Status run hanya: draft, active, done (RUN-10)
    // Done = semua test sudah dijalankan: tidak ada Untested dan tidak ada Retest
    function validRunStatus() {
      let from = resource.data.status;
      let to = request.resource.data.status;
      let c = request.resource.data.counts;
      return to in ['draft', 'active', 'done']
          && (from != 'draft' || to in ['draft', 'active'])                // Draft hanya bisa dimulai (Active)
          && (from == 'draft' || to != 'draft')                            // Active/Done tidak kembali ke Draft
          && (to != 'done' || (c.untested == 0 && c.retest == 0))          // Done hanya jika semua test selesai
          && (from == 'draft' || to != 'active' || c.untested > 0 || c.retest > 0); // Active lagi hanya bila ada Retest/Untested
    }

    match /projects/{p}/cases/{c} {
      allow read: if inWs(p);
      // APR-01: case baru selalu Draft
      allow create: if inWs(p) && request.resource.data.status == 'draft';
      allow update: if inWs(p) && (
        // Edit & Kirim untuk review: field review tidak boleh disentuh
        (!changed().hasAny(['reviewedBy', 'reviewedAt', 'lastReviewId', 'caseNumber'])
          && validEditStatus())
        // Keputusan review: hanya dari Under Review, wajib ada dokumen review di batch yang sama (APR-02/08)
        || (changed().hasOnly(['status', 'reviewedBy', 'reviewedAt', 'lastReviewId'])
          && resource.data.status == 'under_review'
          && request.resource.data.status in ['approved', 'draft']
          && request.resource.data.reviewedBy == request.auth.uid
          && request.resource.data.reviewedAt == request.time
          && existsAfter(doc('projects/' + p + '/cases/' + c
                             + '/reviews/' + request.resource.data.lastReviewId))));
      allow delete: if inWs(p);

      match /reviews/{rv} {
        allow read: if inWs(p);
        // Kembalikan ke Draft wajib catatan (APR-03); riwayat tidak bisa diubah/dihapus
        allow create: if inWs(p)
          && request.resource.data.reviewerId == request.auth.uid
          && request.resource.data.action in ['approve', 'return_to_draft']
          && (request.resource.data.action != 'return_to_draft' || request.resource.data.comment.size() > 0);
        allow update, delete: if false;
      }
    }

    match /projects/{p}/runs/{r} {
      allow read: if inWs(p);
      // Run baru selalu Draft (dialog Add Test Run); "Create & start run" = Draft lalu Active setelah semua test ditulis
      allow create: if inWs(p) && request.resource.data.status == 'draft';
      allow update: if inWs(p) && validRunStatus();
      allow delete: if inWs(p);
    }

    match /projects/{p}/runs/{r}/tests/{t}/results/{res} {
      allow read: if inWs(p);
      // Hasil bisa ditambah selama run Active atau Done (Retest membuat run Active lagi); tidak ke Draft (RUN-10)
      allow create: if inWs(p)
        && runStatus(p, r) in ['active', 'done']
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

Rules lengkap (users, project, run, test, plan, milestone) disimpan di `firebase/firestore.rules` dan diuji otomatis: setiap koleksi dan aksi harus ditolak untuk user dari workspace lain, dan `workspaceId` user maupun project tidak boleh berubah. Satu request memakai paling banyak 4 pembacaan dokumen di rules (profil user, project, dan run), masih di bawah batas 10 (20 untuk batch); pembacaan dokumen yang sama dalam satu request di-cache.

## 6. Database Firestore

Database memakai **Cloud Firestore Standard edition** di paket Spark. Setiap project membawa `workspaceId`, dan data lain berada di subkoleksi project, sehingga setiap query dibatasi satu project dan security rules cukup memeriksa workspace pemilik project. Dua area yang disorot adalah inti aplikasi: **cases** (status review) dan **runs** (snapshot hasil test).

&#91;embedded content: struktur koleksi Firestore · siapa yang menulis\]

Semua tulis dilakukan client dan diperiksa rules; satu-satunya tulis dari Worker adalah antrean email undangan di P1.

**Kuota gratis Firestore (paket Spark)**

| Kuota | Batas | Kalau habis |
| --- | --- | --- |
| Data tersimpan | 1 GiB | Tulis baru ditolak |
| Baca dokumen | 50 ribu/hari | Baca ditolak sampai reset harian |
| Tulis dokumen | 20 ribu/hari | Tulis ditolak sampai reset harian |
| Hapus dokumen | 20 ribu/hari | Hapus ditolak sampai reset harian |
| Data keluar (download) | 10 GiB/bulan | Dibatasi sampai bulan berikutnya |

Paket Spark tidak pernah menagih; layanan hanya berhenti sementara saat kuota habis ([Firebase pricing](https://firebase.google.com/pricing)). Karena evidence gambar ada di Cloudinary, kuota storage 1 GiB hanya dipakai teks dan cukup untuk ratusan ribu test case dan hasil.

**Pola desain**

| Pola | Penerapan |
| --- | --- |
| Snapshot | `tests.caseSnapshot` menyimpan title, preconditions, steps, expected (daftar), priority saat run dibuat; run yang sudah Done tidak berubah walau case diedit |
| Progres dengan agregasi | Ringkasan per status disimpan di `runs.counts` (passed, failed, blocked, retest, untested) dan diperbarui di batch yang sama dengan setiap hasil; angka ini sekaligus menentukan status Done. Untuk mencocokkan ulang (mis. tombol Refresh), pakai `getCountFromServer` per status (5 query; tiap query dihitung 1 baca per 1.000 dokumen) |
| Agregat harian | `projects/{p}/daily/{YYYY-MM-DD}` menyimpan jumlah hasil per status pada hari itu (tanggal lokal browser), dinaikkan `increment(1)` di transaksi yang sama dengan hasil baru. Grafik 14 hari di Overview cukup 14 baca. Rules hanya mengizinkan naik tepat +1 di satu status, tanpa hapus |
| Nomor case manusiawi | Transaction menaikkan `projects.nextCaseNumber` → ID tampilan C1, C2, … |
| Pohon section | `parentId` + `path[]` (id leluhur) + `order` (fractional index string), sehingga drag & drop hanya menulis 1 dokumen |
| Field denormalisasi untuk query | `tests` menyimpan `projectId`, `runName`, `assigneeId`, `status` agar To-do lintas project (TODO-01) cukup satu collection group query |
| Pagination | Cursor `startAfter`, 100 baris per halaman, dimuat bertahap oleh tabel virtual |
| Cache lokal | `persistentLocalCache`: data yang sama tidak dibaca ulang dari server |
| Soft delete | `deletedAt` untuk trash bin (TC-15, P2); pembersihan dilakukan user dari UI |
| Audit fields | `createdAt`, `updatedAt` (serverTimestamp, divalidasi rules = `request.time`), `createdBy`, `updatedBy` |

**Contoh dokumen case**

```json
{
  "caseNumber": 128,
  "sectionId": "sec_login",
  "title": "Sign in with a wrong password",
  "titleLower": "sign in with a wrong password",
  "template": "steps",
  "status": "draft",
  "priority": "high",
  "type": "functional",
  "automation": "manual",
  "preconditions": { "type": "doc", "content": [] },
  "steps": [
    { "id": "s1", "content": "Open /login" },
    { "id": "s2", "content": "Enter a valid email and a wrong password, then click Sign in" }
  ],
  "expected": [
    "The message \"Incorrect email or password\" appears",
    "The user stays on the sign-in page"
  ],
  "refs": ["JIRA-421"],
  "reviewedBy": null,
  "reviewedAt": null,
  "lastReviewId": null,
  "createdBy": "uid_user1",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

**Composite index utama**

- `cases`: (`sectionId`, `order`), (`status`, `sectionId`, `order`) untuk picker Add Test Run, (`status`, `updatedAt` desc), (`priority`, `type`, `updatedAt` desc), (`titleLower` untuk pencarian awalan)
- `tests` (per run): (`sectionId`, `sectionOrder`) untuk kolom folder, (`status`, `sectionOrder`), (`assigneeId`, `status`)
- `tests` (collection group, To-do): (`assigneeId`, `status`)
- `results`: (`createdAt` desc)

Semua index dicatat di `firestore.indexes.json` dan di-deploy bersama rules; keduanya bisa di-deploy di paket Spark.

## 7. Evidence Gambar (Cloudinary)

Evidence dikompres di browser, lalu diunggah langsung dari browser ke Cloudinary dengan **signed upload**. Tanda tangan dibuat Worker hanya untuk user yang berhak; data gambar sendiri tidak pernah melewati Worker. Result di Firestore hanya menyimpan metadata (`publicId`, ukuran, dimensi).

**Kuota Cloudinary Free**

| Batas | Nilai |
| --- | --- |
| Kredit bulanan | 25 kredit; 1 kredit = 1 GB storage, atau 1 GB bandwidth, atau 1.000 transformasi ([Cloudinary billing](https://cloudinary.com/documentation/billing_and_plans)) |
| Ukuran maks. per gambar | 10 MB ([Cloudinary pricing](https://cloudinary.com/documentation/pricing)) |
| Kartu kredit | Tidak perlu |
| Kalau kuota habis | Akun dibatasi; tidak ada tagihan |

Dengan kompresi ke WebP (target ≤ 400 KB), 1 GB storage ≈ 2.500+ screenshot. Kredit dipakai bersama oleh storage, bandwidth, dan thumbnail, jadi pemakaian dipantau di halaman Administration (Bagian 11).

**Struktur folder & aturan upload**

| Aturan | Nilai |
| --- | --- |
| Folder | `casebook/{ws}/{projectId}/{runId}/{resultId}/` (ditetapkan Worker, bukan client) |
| Nama file | `publicId` acak dari Worker, sehingga URL sulit ditebak |
| Format | png, jpg, gif, webp (`allowed_formats` di parameter yang ditandatangani) |
| Ukuran | Maks. 10 MB per file, maks. 10 file per hasil (EVD-02) |
| Siapa boleh upload | User di workspace project tersebut; run harus Active atau Done (bukan Draft) |
| Hapus | Hanya pengunggah, selama run Active (EVD-05), lewat Worker |

**Alur upload evidence**

1. Saat form Add result dibuka, client membuat ID result baru (`doc(collection(...)).id`).
2. Setiap file dikompres di browser (browser-image-compression → WebP, lebar maks. 1920 px).
3. Client memanggil Worker `POST /evidence/sign` dengan Firebase ID token, `projectId`, `runId`, `resultId`.
4. Worker memverifikasi ID token, lalu membaca dokumen run dan project (untuk memeriksa workspace) lewat Firestore REST API **memakai token user itu**, jadi rules yang memutuskan boleh atau tidak. Bila run bukan Draft (Active atau Done) dan project berada di workspace user, Worker mengembalikan `signature`, `timestamp`, `folder`, `public_id`.
5. Browser mengunggah langsung ke API upload Cloudinary dengan progress bar per file.
6. User klik Simpan → batch Firestore menulis Result berisi `evidence[]` (publicId, width, height, bytes) dan memperbarui status test.

**Menampilkan gambar.** Thumbnail memakai URL transformasi Cloudinary (`c_limit,w_400,f_auto,q_auto`), dan lightbox memuat versi `f_auto,q_auto`. Keduanya dari CDN Cloudinary, tanpa server sendiri.

**Catatan privasi.** URL gambar Cloudinary bisa dibuka siapa saja yang mengetahuinya, walaupun acak dan sulit ditebak. Evidence sebaiknya tidak memuat data sensitif (data pelanggan asli); bila perlu, data disamarkan sebelum di-screenshot. File yang diunggah tetapi result-nya batal disimpan dibersihkan oleh job mingguan di GitHub Actions.

## 8. Alur Kunci

Tanpa Cloud Functions, setiap alur dijalankan client sebagai **batched write atau transaction**: semua dokumen dalam satu batch tersimpan bersamaan atau gagal bersamaan, dan setiap dokumen diperiksa rules.

**A. Kirim untuk review, approve, dan kembalikan ke Draft**

1. Case baru tersimpan sebagai Draft. Penulis mengubahnya ke Under Review dengan tombol Send for review (satu update; rules hanya mengizinkan draft → under\_review). Reviewer (user mana pun di workspace yang sama) melihat tombol Approve dan Return to Draft; Return to Draft membuka kolom catatan wajib (APR-03).
2. Client membuat satu batch: dokumen `cases/{c}/reviews/{rv}` (aksi, komentar, reviewer) + update case (`status`, `reviewedBy`, `reviewedAt = serverTimestamp`, `lastReviewId = rv`).
3. Rules menolak batch bila user bukan anggota workspace project, transisi status tidak valid, atau dokumen review tidak ikut dibuat (Bagian 5).
4. Notifikasi in-app untuk penulis case ikut ditulis di batch yang sama.

**B. Membuat Test Run**

1. User memilih case di dialog Add Test Run: **All Approved**, atau **Choose cases** lewat pohon section. Case sebuah section diambil saat section dibuka dengan query `status == 'approved'` + `sectionId == …` (APR-05) lalu di-cache TanStack Query; angka per section memakai `getCountFromServer` saat dialog dibuka. Centang section induk memilih semua case Approved di sub-section-nya. Pilihan disimpan di state dialog sebagai set ID per section, jadi tetap ada saat pindah section. Pencarian lintas section memakai `titleLower` (awalan) pada case Approved.
2. Batch pertama membuat dokumen run berstatus `draft`.
3. Test dibuat per batch berisi maks. 500 dokumen, masing-masing menyimpan `caseSnapshot` (title, preconditions, steps, expected) serta `sectionId` dan `sectionOrder` untuk kolom folder di layar eksekusi. UI menampilkan "Preparing run… 1,200/2,000".
4. Setelah semua batch berhasil, run diubah ke `active`. Bila browser tertutup di tengah jalan, run tetap `draft` dan bisa dilanjutkan atau dihapus user.
5. Rules hanya mengizinkan user di workspace project membuat test, dan hanya selama run `draft`.

Catatan: rules tidak bisa memeriksa status Approved setiap case dalam batch besar, karena batas pembacaan dokumen di rules. Aturan APR-05 untuk run ditegakkan oleh UI dan query; ini risiko yang diterima karena pembuat run adalah user terautentikasi di workspace yang sama.

**C. Input hasil + evidence**

1. Evidence diunggah lebih dulu ke Cloudinary (Bagian 7).
2. Client membuat satu batch: `results/{id}` (status, komentar, elapsed, defects, `evidence[]`) + update test (`status`, `lastResultAt`, `lastResultBy`).
3. Rules memeriksa project berada di workspace user, run berstatus `active` atau `done`, dan `createdBy` = user itu sendiri.
4. Progres di panel kanan run diperbarui dengan agregasi `count()` setelah hasil tersimpan, tanpa membaca ulang semua test.

**D. Status Done otomatis** (RUN-10)

1. Tidak ada tombol Close Run. Setiap kali hasil disimpan, batch yang sama memperbarui `runs.counts` (status lama test dikurangi, status baru ditambah).
2. Bila `untested == 0` dan `retest == 0`, batch itu juga menulis `status = 'done'` dan `doneAt`; bila sebuah test diubah ke Retest, status kembali `active`.
3. Rules (`validRunStatus`) menolak Done selama masih ada Untested/Retest, dan menolak run kembali ke Draft. Hasil tetap append-only, jadi run Done tetap jadi arsip yang utuh.
4. Status plan diturunkan dari run-nya di client: Done bila semua run Done, Draft bila semua Draft, selain itu Active.

## 9. Pencarian, Report, Notifikasi & API

**Pencarian case (TC-06)**

- Filter (section, priority, type, status review, automation, pembuat) memakai query biasa + composite index.
- Pencarian teks MVP: pencarian awalan judul lewat field `titleLower` (range query) dan pencarian langsung ID case (C123). Di dalam satu section yang sudah dimuat, pencarian kata di mana pun dilakukan di browser.
- Full-text search penuh (typo, relevansi) bukan bagian MVP; opsinya dibahas di Bagian 12.

**Report (RPT-01…10)**

| Jenis | Sumber data | Cara hitung |
| --- | --- | --- |
| Progres run aktif | Agregasi `count()` per status | Di browser, saat halaman dibuka/diperbarui |
| Summary run/plan/milestone yang sudah Done | `runs.counts` | Langsung dibaca, murah |
| Comparison, Workload, Defects (P1) | Koleksi tests/results | Dibaca bertahap di browser lalu dihitung; dibatasi per milestone agar hemat kuota |

Export PDF dibuat di browser dengan @react-pdf/renderer (thumbnail evidence untuk test Failed diambil dari URL Cloudinary). Tidak ada server PDF.

**Notifikasi (NOTIF-01/02)**

- In-app: dokumen `users/{uid}/notifications/{id}`, ditulis oleh pengirim di batch yang sama dengan aksinya (mis. case dikembalikan ke Draft), dan didengarkan realtime oleh lonceng di top bar. Rules hanya mengizinkan field tertentu dan pengirim harus anggota project yang sama.
- Email (P1): Worker dengan Cron Trigger membaca notifikasi baru dan mengirim email ringkasan lewat penyedia email gratis (mis. Resend).

**API publik & integrasi (INT-01…05, fase P1)**

| Aspek | Desain |
| --- | --- |
| Base URL | `https://api.<domain>/v1/...` (Cloudflare Worker) |
| Autentikasi | API key per user (dibuat di profil, disimpan sebagai hash SHA-256, bisa dicabut) via header `Authorization: Bearer` |
| Akses data | Worker memakai service account (disimpan sebagai Wrangler secret), lalu memeriksa workspace user pemilik key sebelum setiap tulis |
| Endpoint inti | `GET/POST /projects`, `/sections`, `/cases`, `/runs`, `/runs/{id}/close`, `POST /runs/{id}/results` (bulk hingga 500 hasil per request) |
| Kompatibilitas | ID status mengikuti TestRail (1 Passed, 2 Blocked, 3 Untested, 4 Retest, 5 Failed) agar reporter automation mudah diadaptasi |
| Dokumentasi | OpenAPI dibuat otomatis dari schema Zod (`@hono/zod-openapi`) |
| Kuota | 100 ribu request/hari (Workers Free); hasil automation dikirim bulk agar hemat request dan kuota tulis Firestore |
| Jira | OAuth 2.0 ke Jira Cloud lewat Worker; link defect & buat issue dari test Failed |

## 10. Repo, Environment, CI/CD & Testing

**Struktur monorepo**

```
casebook/
  apps/
    web/            # React SPA (Cloudflare Pages)
    worker/         # Cloudflare Worker: /evidence/sign, /evidence/delete, API P1
  packages/
    shared/         # schema Zod, tipe domain, enum status, konstanta permission
  firebase/
    firestore.rules  firestore.indexes.json
  scripts/          # backup Firestore, pembersihan evidence yatim
  e2e/              # Playwright
  firebase.json  .firebaserc  turbo.json  pnpm-workspace.yaml
```

`packages/shared` adalah sumber kebenaran tunggal: enum status (case, plan, run, result), daftar permission, dan schema input. Web dan Worker mengimpor dari sini sehingga tidak ada definisi ganda.

**Environment**

| Env | Firebase | Cloudflare | Cloudinary | Dipakai untuk |
| --- | --- | --- | --- | --- |
| local | Firebase Emulator Suite (Auth, Firestore) | `wrangler dev` + `vite dev` | Folder `casebook-dev/` | Development & test otomatis |
| staging | Project Spark `casebook-staging` | Preview deployment Pages + Worker `casebook-api-staging` | Folder `casebook-staging/` | UAT & QA sebelum rilis |
| prod | Project Spark `casebook-prod` | Pages production + Worker `casebook-api` | Folder `casebook/` | Pengguna nyata |

Setiap env memakai project Firebase terpisah (semua di paket Spark, gratis), sehingga kuota staging tidak mengurangi kuota produksi. Secret (Cloudinary API secret, service account, kunci email) disimpan sebagai **Wrangler secret** dan **GitHub Actions secret**, bukan di repo. Config Firebase web (apiKey dsb.) memang publik dan aman karena dijaga rules.

**CI/CD (GitHub Actions + Cloudflare)**

1. Setiap PR: lint (ESLint + Prettier), typecheck, unit test (Vitest), test rules di emulator, test Worker, build.
2. Cloudflare Pages otomatis membuat **preview URL per PR** yang terhubung ke staging.
3. Merge ke `main` → deploy otomatis: Pages (production branch), Worker (`wrangler deploy`), rules & indexes (`firebase deploy --only firestore`), lalu Playwright smoke test.
4. Tag rilis `v*` dipakai untuk changelog dan rollback (Pages menyimpan riwayat deployment yang bisa di-rollback satu klik).

**Strategi testing**

| Lapisan | Alat | Fokus |
| --- | --- | --- |
| Unit | Vitest | Fungsi domain di `packages/shared`, penyusun batch, util |
| Komponen | Vitest + Testing Library | Form editor case, daftar test, form Add result |
| Security rules | `@firebase/rules-unit-testing` + emulator | **Paling penting:** isolasi antar workspace (user workspace lain ditolak untuk setiap koleksi dan aksi); user tidak bisa mengganti workspace-nya; hasil ditolak di run Draft; Done ditolak selama masih ada Untested/Retest |
| Worker | Vitest + `@cloudflare/vitest-pool-workers` | Verifikasi token, penolakan project workspace lain, penolakan run Draft |
| E2E | Playwright | Register → buat case (dialog) → approve → buat run (dialog) → isi hasil + evidence → run otomatis Done → report |

Karena rules sekarang memegang seluruh aturan bisnis, test rules wajib lulus sebelum merge. Aplikasi ini juga sebaiknya dipakai untuk mengelola test case-nya sendiri (dogfooding) begitu MVP berjalan.

## 11. Keamanan, Observability, Backup & Biaya

**Keamanan**

| Ancaman / kebutuhan | Kontrol |
| --- | --- |
| Akses data lintas workspace/project | Rules berbasis `users/{uid}.workspaceId` dan `projects/{p}.workspaceId`; test rules otomatis di CI |
| Client nakal menulis langsung ke Firestore | Semua aturan bisnis ada di rules, bukan di UI; field review, status run, dan workspace tidak bisa diubah tanpa lolos rules |
| Pindah workspace | `workspaceId` hanya bisa diisi sekali saat Register; rules menolak perubahan dan nilai di luar daftar statis |
| Upload ke Cloudinary oleh orang luar | Hanya signed upload; tanda tangan dibuat Worker setelah verifikasi ID token dan cek rules |
| Brute force login | Proteksi bawaan Firebase Auth |
| XSS dari rich text | Konten Tiptap disimpan sebagai JSON, dirender tanpa `dangerouslySetInnerHTML`; sanitasi HTML saat import |
| Kebocoran rahasia | Wrangler secret & GitHub secret; API key user di-hash |
| Header keamanan | CSP, HSTS, X-Frame-Options lewat file `_headers` di Cloudflare Pages |
| Penyalahgunaan Worker | Rate limiting bawaan Cloudflare + validasi Zod di setiap endpoint |

**Observability**

- Error frontend: Sentry (paket gratis) dengan source map dari CI.
- Worker: Workers Logs bawaan Cloudflare.
- Kuota: halaman **Administration → Pemakaian** menampilkan perkiraan pemakaian Firestore dan kredit Cloudinary (dari Usage API lewat Worker), dengan peringatan saat melewati 70%.

**Backup & recovery**

Paket Spark tidak menyediakan backup terkelola Firestore, jadi backup dibuat sendiri:

- **GitHub Actions mingguan** menjalankan skrip dengan service account yang mengekspor semua koleksi ke JSON, lalu menyimpannya terenkripsi sebagai artifact (atau di repo privat terpisah).
- Skrip yang sama bisa memulihkan data ke project staging; uji restore minimal sekali per kuartal.
- Ekspor membaca semua dokumen, jadi dijadwalkan dini hari dan dipantau agar tidak menghabiskan kuota baca harian.
- Gambar evidence tidak di-backup terpisah; Firestore menyimpan `publicId`-nya.

**Biaya: semua paket gratis, tanpa kartu kredit**

| Komponen | Kuota gratis | Kalau terlewati |
| --- | --- | --- |
| Firebase Auth (Spark) | Login email/password & Google | — |
| Cloud Firestore (Spark) | 1 GiB data, 50 rb baca/hari, 20 rb tulis/hari | Operasi ditolak sampai reset; tidak ditagih |
| Cloudflare Pages | Bandwidth tak terbatas, 500 build/bulan ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)) | Build ditolak sampai bulan berikutnya |
| Cloudflare Workers | 100 rb request/hari | Request ditolak sampai reset harian |
| Cloudinary Free | 25 kredit/bulan | Akun dibatasi; tidak ditagih |
| GitHub Actions | Kuota menit gratis GitHub | — |

Risiko utamanya bukan tagihan, melainkan layanan berhenti sementara saat kuota habis. Yang paling mungkin habis lebih dulu adalah **50 ribu baca Firestore per hari**, sehingga pagination, cache lokal, dan agregasi (Bagian 6) wajib sejak awal.

## 12. Risiko, Batasan & Keputusan

**Batasan yang memengaruhi desain**

| Batasan | Dampak | Cara menangani |
| --- | --- | --- |
| Firestore Spark: 50 rb baca/hari | Tim besar yang sering membuka run berisi ribuan test bisa menghabiskan kuota | Pagination 100 baris, `persistentLocalCache`, agregasi `count()`, realtime hanya di layar yang perlu |
| Tanpa server tepercaya | Logika yang tidak bisa diperiksa rules (mis. APR-05 di batch besar) bergantung pada UI | Hanya user terautentikasi di workspace yang sama yang bisa membuat run; diaudit lewat dokumen `reviews` dan `activity` |
| Batch maks. 500 tulis, rules maks. 10/20 pembacaan dokumen | Run besar dibuat bertahap, tidak atomik | Status `draft` → `active` + tombol lanjutkan/batalkan |
| Tidak ada backup terkelola di Spark | Data hilang bila terhapus tidak sengaja | Backup mingguan lewat GitHub Actions + uji restore |
| URL Cloudinary tanpa login | Gambar bisa dibuka siapa pun yang tahu URL-nya | URL acak; evidence tanpa data sensitif |
| Kredit Cloudinary dipakai bersama storage & bandwidth | Makin banyak gambar tersimpan, makin sedikit sisa untuk dilihat | Kompresi wajib + pantau di Administration → Pemakaian |
| Full-text search tidak tersedia di Firestore Standard | Pencarian hanya awalan judul & ID | Cukup untuk MVP; lihat jalur upgrade |

**Jalur upgrade bila kuota gratis tidak cukup**

| Kebutuhan | Opsi | Konsekuensi |
| --- | --- | --- |
| Kuota Firestore lebih besar | Upgrade project ke Blaze (kuota gratis tetap berlaku) | Butuh kartu kredit; pasang budget alert |
| Logika server penuh (counter, validasi APR-05) | Cloud Functions (butuh Blaze) atau perluas Worker dengan service account | Worker: tetap gratis, tapi CPU 10 ms/request |
| Storage gambar lebih besar / privat | Cloudflare R2 (10 GB gratis, butuh kartu untuk verifikasi) atau Cloudinary berbayar | Hanya modul `lib/evidence.ts` + Worker yang berubah |
| Full-text search | Firestore Enterprise (`search()`, butuh migrasi data) atau Typesense/Algolia | Index pencarian tambahan |
| SSO SAML/OIDC, 2FA | Firebase Authentication with Identity Platform | Butuh Blaze |

**Keputusan yang sudah diambil (5 Nov 2026)**

- Tanpa paket Blaze dan tanpa kartu kredit.
- Hosting: **Cloudflare Pages**. GitHub Pages tidak dipilih karena aturannya melarang SaaS komersial, tanpa rewrite SPA/header keamanan, dan tanpa preview per PR. Vercel Hobby tidak dipilih karena khusus non-komersial.
- Evidence: **Cloudinary**. Firestore tidak dipilih karena gambar akan berbagi kuota 1 GiB dengan seluruh data aplikasi.

**Keputusan terbuka**

- [ ] Tiga workspace statis cukup, atau perlu workspace dinamis (WS-06, P2)? Memengaruhi onboarding dan kebutuhan kuota.
- [ ] Penyedia email untuk P1 (Resend atau SMTP kantor).
- [ ] Ambang kapan upgrade ke Blaze (mis. kuota baca harian > 70% selama seminggu).

## Sumber

- [Firebase — Pricing plans (Spark vs Blaze)](https://firebase.google.com/pricing)
- [Firebase — FAQ perubahan Cloud Storage (wajib Blaze)](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase — Firestore quotas & limits](https://firebase.google.com/docs/firestore/enterprise/quotas-native-mode)
- [Cloudflare — Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare — Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudinary — Billing and plans](https://cloudinary.com/documentation/billing_and_plans)
- [Cloudinary — Pricing & limits](https://cloudinary.com/documentation/pricing)
- [GitHub — GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
