# Arsitektur — Casebook

Nov 5, 2026 · @apakah bisa bahasa indonesia?

Dokumen teknis pendamping Doc. Kode kebutuhan (TC-xx, RUN-xx, APR-xx, EVD-xx) merujuk ke PRD tersebut.

## 1. Ringkasan & Keputusan Utama

**Revisi 5 Nov 2026: arsitektur tanpa paket Blaze dan tanpa kartu kredit.** Aplikasi adalah **SPA React + TypeScript** yang di-hosting di **Cloudflare Pages**. Aplikasi langsung memakai **Firebase paket Spark** (Authentication + Cloud Firestore edisi Standard), sementara aturan bisnis seperti approval Lead ditegakkan oleh **Firestore Security Rules**. Evidence gambar disimpan di **Cloudinary (Free)**, dan satu **Cloudflare Worker** kecil menangani hal yang butuh rahasia (tanda tangan upload, REST API). Semua komponen memakai paket gratis.

| Area | Keputusan | Alasan singkat |
| --- | --- | --- |
| Frontend | React 19 + Vite + TypeScript (SPA) | App di balik login, tidak butuh SSR; hasil build berupa file statis |
| UI kit | shadcn/ui (Radix UI + Tailwind CSS) | Komponen bersih & aksesibel, mudah dibuat rapi seperti TestRail |
| Hosting | Cloudflare Pages | Gratis, bandwidth tak terbatas, boleh untuk komersial, preview per commit |
| Auth | Firebase Authentication (paket Spark) | Login email/password, verifikasi email, reset password gratis |
| Database | Cloud Firestore **Standard edition** (paket Spark) | Realtime + security rules; kuota gratis harian, tidak pernah menagih |
| Aturan bisnis | Firestore Security Rules + batched write/transaction dari client | Pengganti Cloud Functions (yang butuh Blaze); approval Lead tetap tidak bisa dibobol dari client |
| Server kecil | Cloudflare Workers (Free) + Hono | Tanda tangan upload Cloudinary, email undangan & REST API (P1) |
| Evidence gambar | Cloudinary (Free) | Tanpa kartu, kuota terpisah dari database, thumbnail & CDN otomatis |
| Repo | Monorepo pnpm + Turborepo | Web, Worker, rules, dan schema Zod berbagi tipe yang sama |

**Prinsip arsitektur**

1. **Client menulis langsung, rules yang menjaga.** Semua tulis data (case, approval, run, hasil) dilakukan client lewat batched write/transaction; security rules memeriksa role dan transisi status di setiap tulis.
2. **Aturan bisnis ditegakkan di rules, bukan di UI.** Contoh: hanya Lead yang bisa approve (APR-02); run yang sudah ditutup tidak bisa diubah (RUN-10).
3. **Hemat kuota.** Paket Spark punya batas baca/tulis harian, jadi semua daftar memakai pagination dan cache lokal, dan progres run dihitung dengan agregasi `count()`.
4. **Snapshot untuk arsip.** Test menyimpan salinan case saat run dibuat; run yang ditutup tidak bisa diubah (RUN-02).
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
| UI components | shadcn/ui (Radix UI) + Tailwind CSS | Aksesibel, mudah dikustom | Dialog, dropdown, tab, toast |
| Ikon | Lucide | Konsisten dengan shadcn/ui | Seluruh UI |
| Tabel | TanStack Table + TanStack Virtual | Sorting, seleksi bulk, virtual scroll untuk ribuan baris | Daftar case (TC-07), tabel run (RUN-04) |
| Pohon section | react-arborist | Tree virtual dengan drag & drop, rename inline | Panel section kiri (TC-01, TC-08) |
| Drag & drop | dnd-kit | Reorder step dan case | Editor steps, urutan case |
| Form & validasi | React Hook Form + Zod | Schema Zod dipakai bersama dengan Worker | Editor case, form Add Result |
| Rich text | Tiptap | Markdown shortcut, tabel; gambar inline diunggah ke Cloudinary | Preconditions, steps, komentar hasil (TC-04) |
| Kompres gambar | browser-image-compression | Ubah ke WebP, lebar maks. 1920 px, target ≤ 400 KB sebelum upload | Evidence (EVD-01/02) |
| Upload | react-dropzone + upload API Cloudinary (XHR untuk progress) | Drag & drop, paste clipboard, progress per file | Evidence (EVD-01/02) |
| Gambar & thumbnail | URL transformasi Cloudinary (`c_limit,w_400,f_auto,q_auto`) | Thumbnail tanpa server | Daftar hasil, lightbox |
| Lightbox gambar | yet-another-react-lightbox | Zoom, next/prev, download | Lihat evidence (EVD-03) |
| Grafik | Apache ECharts (echarts-for-react) | Stacked bar, line, donut | Dashboard, report |
| State UI lokal | Zustand | State non-server (panel terbuka, mode tampilan) | Layout, preferensi |
| Shortcut keyboard | react-hotkeys-hook | Shortcut P/F/B/N saat eksekusi | Halaman test |
| i18n | i18next + react-i18next | UI Indonesia & Inggris | Seluruh teks |
| Tanggal | date-fns (+ date-fns-tz) | Mendukung zona waktu user | Due date, riwayat |
| CSV | Papa Parse | Parse & validasi import CSV di browser | Import case (TC-10) |
| Export PDF | @react-pdf/renderer | PDF dibuat di browser, tanpa server | Report (RPT-04) |
| Monitoring | Sentry (browser SDK, paket gratis) | Error tracking | Produksi |

**Struktur folder FE (feature-based)**

```
apps/web/src/
  app/            # router, providers, layout utama
  features/
    auth/  dashboard/  projects/  cases/  reviews/
    runs/  plans/  milestones/  reports/  admin/
  components/ui/  # komponen shadcn
  lib/firebase.ts # inisialisasi SDK + persistentLocalCache
  lib/evidence.ts # kompres → minta tanda tangan → upload Cloudinary
  lib/queries/    # query key & hook TanStack Query
```

Setiap fitur memiliki `api.ts` (batched write ke Firestore yang dibentuk sesuai rules), `hooks.ts`, dan komponen sendiri. Modul `lib/evidence.ts` membungkus semua urusan gambar, sehingga penyedia penyimpanan bisa diganti tanpa mengubah fitur lain.

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
| Register & buat workspace | Client (batch: workspace + member admin), dijaga rules | AUTH-01 |
| Undang anggota | Admin membuat dokumen `invites`; MVP: link undangan disalin manual; P1: email otomatis lewat Worker | AUTH-04 |
| Terima undangan | Client membuat dokumen member miliknya; rules mencocokkan email di token dengan email undangan | AUTH-04 |
| Ubah role anggota | Client (Admin), dijaga rules | ADM-01/02 |
| Approve / reject / deprecate case | Client (batch: case + dokumen `reviews`); rules memastikan role Lead | APR-02/03 |
| Edit case → kembali Under Review | Rules memaksa status `under_review` bila konten utama berubah | APR-04 |
| Nomor case C123 | Client transaction pada `projects.nextCaseNumber` | TC-02 |
| Buat run + snapshot case | Client (batch per 500 test); run `draft` → `active` setelah semua batch selesai | RUN-01/02 |
| Input hasil | Client (batch: result + status test); rules memastikan run masih `active` | RUN-04/05 |
| Progres run | Agregasi `count()` per status (Bagian 6) | RUN-08 |
| Tutup run / plan | Client (Lead): status `completed` + simpan angka akhir; rules mengunci isinya | RUN-10, PLAN-04 |
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

Firebase Authentication menangani identitas. Role disimpan sebagai **dokumen member** di Firestore (bukan custom claims, karena claims hanya bisa diatur dari server). Security rules membaca dokumen ini untuk setiap tulis.

**Alur akun**

| Alur | Implementasi |
| --- | --- |
| Register user pertama | `createUserWithEmailAndPassword` → satu batch membuat `workspaces/{ws}` + `members/{uid}` dengan role `admin`; rules hanya mengizinkan bila workspace belum ada dan pembuatnya adalah user itu sendiri |
| Undang anggota | Admin membuat `invites/{token}` (email, role, kedaluwarsa). MVP: Admin menyalin link undangan; P1: Worker mengirim email otomatis |
| Terima undangan | User mendaftar/login, lalu membuat dokumen member miliknya; rules mewajibkan email di token = email undangan, email sudah terverifikasi, dan undangan belum kedaluwarsa |
| Login & remember me | `signInWithEmailAndPassword`; persistence `browserLocalPersistence` (ingat saya) atau `browserSessionPersistence` |
| Verifikasi email & reset password | Email action bawaan Firebase Auth (gratis) |
| Ubah role | Admin mengubah dokumen member; rules melarang user mengubah role-nya sendiri |
| Login Google (P1) | Provider Google di Firebase Auth, tersedia di paket Spark |
| SAML/OIDC, 2FA (P2) | Butuh Identity Platform; termasuk jalur upgrade (Bagian 12) |

**Model role**

- `workspaces/{ws}/members/{uid}.role` = `admin` | `member`.
- `workspaces/{ws}/projects/{p}/members/{uid}.role` = `lead` | `tester` | `viewer`.
- Admin workspace punya akses penuh ke project, **kecuali approval**: approve/reject hanya untuk member dengan `role == 'lead'` di project tersebut.

**Dua lapis penegakan aturan**

1. **UI** menyembunyikan tombol yang tidak boleh dipakai (kenyamanan, bukan keamanan).
2. **Firestore Security Rules** memeriksa setiap tulis: role, transisi status, dan status run. Tidak ada jalur tulis yang melewati rules dari aplikasi.

**Contoh rules untuk test case, approval, dan hasil test**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function doc(p) { return path('/databases/' + db + '/documents/' + p); }
    function wsRole(ws) { return get(doc('workspaces/' + ws + '/members/' + request.auth.uid)).data.role; }
    function role(ws, p) {
      return get(doc('workspaces/' + ws + '/projects/' + p + '/members/' + request.auth.uid)).data.role;
    }
    function isAdmin(ws) { return wsRole(ws) == 'admin'; }
    function isLead(ws, p) { return role(ws, p) == 'lead'; }
    function canWrite(ws, p) { return isAdmin(ws) || role(ws, p) in ['lead', 'tester']; }
    function changed() { return request.resource.data.diff(resource.data).affectedKeys(); }
    function contentChanged() { return changed().hasAny(['title', 'preconditions', 'steps', 'expected']); }
    function validReview(from, to) {
      return (from == 'under_review' && to in ['approved', 'rejected'])
          || (from == 'approved' && to == 'deprecated')
          || (from == 'deprecated' && to == 'approved');
    }

    match /workspaces/{ws}/projects/{p}/cases/{c} {
      allow read: if role(ws, p) != null || isAdmin(ws);
      // APR-01: case baru selalu Under Review
      allow create: if canWrite(ws, p) && request.resource.data.status == 'under_review';
      allow update: if
        // Edit biasa: field review tidak boleh disentuh; konten utama berubah => Under Review (APR-04)
        (canWrite(ws, p)
          && !changed().hasAny(['reviewedBy', 'reviewedAt', 'lastReviewId', 'caseNumber'])
          && (contentChanged()
                ? request.resource.data.status == 'under_review'
                : request.resource.data.status == resource.data.status))
        // Review: hanya Lead, hanya field review, wajib ada dokumen review di batch yang sama (APR-02/08)
        || (isLead(ws, p)
          && changed().hasOnly(['status', 'reviewedBy', 'reviewedAt', 'lastReviewId'])
          && validReview(resource.data.status, request.resource.data.status)
          && request.resource.data.reviewedBy == request.auth.uid
          && request.resource.data.reviewedAt == request.time
          && existsAfter(doc('workspaces/' + ws + '/projects/' + p + '/cases/' + c
                             + '/reviews/' + request.resource.data.lastReviewId)));
      allow delete: if isAdmin(ws) || isLead(ws, p);

      match /reviews/{rv} {
        allow read: if role(ws, p) != null || isAdmin(ws);
        // Reject wajib berkomentar (APR-03); riwayat tidak bisa diubah/dihapus
        allow create: if isLead(ws, p)
          && request.resource.data.reviewerId == request.auth.uid
          && (request.resource.data.action != 'reject' || request.resource.data.comment.size() > 0);
        allow update, delete: if false;
      }
    }

    match /workspaces/{ws}/projects/{p}/runs/{r}/tests/{t}/results/{res} {
      allow read: if role(ws, p) != null || isAdmin(ws);
      // Hasil hanya bisa ditambah selama run Active (RUN-10)
      allow create: if canWrite(ws, p)
        && get(doc('workspaces/' + ws + '/projects/' + p + '/runs/' + r)).data.status == 'active'
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

Rules lengkap (workspace, undangan, run, test, plan, milestone) disimpan di `firebase/firestore.rules` dan diuji otomatis untuk setiap kombinasi role × aksi di matriks permission PRD. Satu request memakai paling banyak 4 pembacaan dokumen di rules, masih di bawah batas 10 (20 untuk batch); pembacaan dokumen yang sama dalam satu request di-cache.

## 6. Database Firestore

Database memakai **Cloud Firestore Standard edition** di paket Spark. Data disusun bertingkat workspace → project, sehingga setiap query selalu dibatasi satu project dan security rules cukup ditulis per subtree. Dua area yang disorot adalah inti aplikasi: **cases** (status review) dan **runs** (snapshot hasil test).

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
| Snapshot | `tests.caseSnapshot` menyimpan title, steps, expected, priority saat run dibuat; run Completed tidak berubah walau case diedit |
| Progres dengan agregasi | Run aktif: `getCountFromServer` per status (5 query; tiap query dihitung 1 baca per 1.000 dokumen). Saat ditutup, angka akhir disimpan di `runs.finalCounts` agar dashboard tidak menghitung ulang |
| Nomor case manusiawi | Transaction menaikkan `projects.nextCaseNumber` → ID tampilan C1, C2, … |
| Pohon section | `parentId` + `path[]` (id leluhur) + `order` (fractional index string), sehingga drag & drop hanya menulis 1 dokumen |
| Field denormalisasi untuk query | `tests` menyimpan `projectId`, `runName`, `assigneeId`, `status` agar To-do lintas project (DASH-02, TODO-01) cukup satu collection group query |
| Pagination | Cursor `startAfter`, 100 baris per halaman, dimuat bertahap oleh tabel virtual |
| Cache lokal | `persistentLocalCache`: data yang sama tidak dibaca ulang dari server |
| Soft delete | `deletedAt` untuk trash bin (TC-15, P2); pembersihan dilakukan Admin dari UI |
| Audit fields | `createdAt`, `updatedAt` (serverTimestamp, divalidasi rules = `request.time`), `createdBy`, `updatedBy` |

**Contoh dokumen case**

```json
{
  "caseNumber": 128,
  "sectionId": "sec_login",
  "title": "Login gagal dengan password salah",
  "titleLower": "login gagal dengan password salah",
  "template": "steps",
  "status": "under_review",
  "priority": "high",
  "type": "functional",
  "automation": "manual",
  "preconditions": { "type": "doc", "content": [] },
  "steps": [
    { "id": "s1", "content": "Buka /login", "expected": "Form login tampil" },
    { "id": "s2", "content": "Isi password salah", "expected": "Pesan error tampil" }
  ],
  "refs": ["JIRA-421"],
  "reviewedBy": null,
  "reviewedAt": null,
  "lastReviewId": null,
  "createdBy": "uid_tester1",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

**Composite index utama**

- `cases`: (`sectionId`, `order`), (`status`, `updatedAt` desc), (`priority`, `type`, `updatedAt` desc), (`titleLower` untuk pencarian awalan)
- `tests` (per run): (`status`, `sectionOrder`), (`assigneeId`, `status`)
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

Dengan kompresi ke WebP (target ≤ 400 KB), 1 GB storage ≈ 2.500+ screenshot. Kredit dipakai bersama oleh storage, bandwidth, dan thumbnail, jadi pemakaian dipantau di dashboard Admin (Bagian 11).

**Struktur folder & aturan upload**

| Aturan | Nilai |
| --- | --- |
| Folder | `casebook/{ws}/{projectId}/{runId}/{resultId}/` (ditetapkan Worker, bukan client) |
| Nama file | `publicId` acak dari Worker, sehingga URL sulit ditebak |
| Format | png, jpg, gif, webp (`allowed_formats` di parameter yang ditandatangani) |
| Ukuran | Maks. 10 MB per file, maks. 10 file per hasil (EVD-02) |
| Siapa boleh upload | Admin, Lead, Tester di project; run harus Active |
| Hapus | Hanya pengunggah, selama run Active (EVD-05), lewat Worker |

**Alur upload evidence**

1. Saat dialog Add Result dibuka, client membuat ID result baru (`doc(collection(...)).id`).
2. Setiap file dikompres di browser (browser-image-compression → WebP, lebar maks. 1920 px).
3. Client memanggil Worker `POST /evidence/sign` dengan Firebase ID token, `projectId`, `runId`, `resultId`.
4. Worker memverifikasi ID token, lalu membaca dokumen run dan member lewat Firestore REST API **memakai token user itu**, jadi rules yang memutuskan boleh atau tidak. Bila run Active dan user bukan Viewer, Worker mengembalikan `signature`, `timestamp`, `folder`, `public_id`.
5. Browser mengunggah langsung ke API upload Cloudinary dengan progress bar per file.
6. Tester klik Simpan → batch Firestore menulis Result berisi `evidence[]` (publicId, width, height, bytes) dan memperbarui status test.

**Menampilkan gambar.** Thumbnail memakai URL transformasi Cloudinary (`c_limit,w_400,f_auto,q_auto`), dan lightbox memuat versi `f_auto,q_auto`. Keduanya dari CDN Cloudinary, tanpa server sendiri.

**Catatan privasi.** URL gambar Cloudinary bisa dibuka siapa saja yang mengetahuinya, walaupun acak dan sulit ditebak. Evidence sebaiknya tidak memuat data sensitif (data pelanggan asli); bila perlu, data disamarkan sebelum di-screenshot. File yang diunggah tetapi result-nya batal disimpan dibersihkan oleh job mingguan di GitHub Actions.

## 8. Alur Kunci

Tanpa Cloud Functions, setiap alur dijalankan client sebagai **batched write atau transaction**: semua dokumen dalam satu batch tersimpan bersamaan atau gagal bersamaan, dan setiap dokumen diperiksa rules.

**A. Approve / reject test case**

1. UI hanya menampilkan tombol Approve/Reject untuk Lead; reject membuka kolom komentar wajib (APR-03).
2. Client membuat satu batch: dokumen `cases/{c}/reviews/{rv}` (aksi, komentar, reviewer) + update case (`status`, `reviewedBy`, `reviewedAt = serverTimestamp`, `lastReviewId = rv`).
3. Rules menolak batch bila user bukan Lead, transisi status tidak valid, atau dokumen review tidak ikut dibuat (Bagian 5).
4. Notifikasi in-app untuk penulis case ikut ditulis di batch yang sama.

**B. Membuat Test Run**

1. Lead memilih case (semua, manual, atau filter). Query hanya mengambil case dengan `status == 'approved'` (APR-05).
2. Batch pertama membuat dokumen run berstatus `draft`.
3. Test dibuat per batch berisi maks. 500 dokumen, masing-masing menyimpan `caseSnapshot`. UI menampilkan "Menyiapkan run… 1.200/2.000".
4. Setelah semua batch berhasil, run diubah ke `active`. Bila browser tertutup di tengah jalan, run tetap `draft` dan bisa dilanjutkan atau dihapus Lead.
5. Rules hanya mengizinkan Lead/Admin membuat test, dan hanya selama run `draft`.

Catatan: rules tidak bisa memeriksa status Approved setiap case dalam batch besar, karena batas pembacaan dokumen di rules. Aturan APR-05 untuk run ditegakkan oleh UI dan query; ini risiko yang diterima karena pembuat run adalah Lead (role tepercaya).

**C. Input hasil + evidence**

1. Evidence diunggah lebih dulu ke Cloudinary (Bagian 7).
2. Client membuat satu batch: `results/{id}` (status, komentar, elapsed, defects, `evidence[]`) + update test (`status`, `lastResultAt`, `lastResultBy`).
3. Rules memeriksa user bukan Viewer, run masih `active`, dan `createdBy` = user itu sendiri.
4. Progres di panel kanan run diperbarui dengan agregasi `count()` setelah hasil tersimpan, tanpa membaca ulang semua test.

**D. Menutup run** (RUN-10)

1. Lead klik Close Run → client menghitung angka akhir per status dengan agregasi.
2. Update run: `status = 'completed'`, `finalCounts`, `completedAt`.
3. Sejak itu rules menolak semua tulis ke test, result, dan evidence di run tersebut; Worker juga menolak tanda tangan upload baru.

## 9. Pencarian, Report, Notifikasi & API

**Pencarian case (TC-06)**

- Filter (section, priority, type, status review, automation, pembuat) memakai query biasa + composite index.
- Pencarian teks MVP: pencarian awalan judul lewat field `titleLower` (range query) dan pencarian langsung ID case (C123). Di dalam satu section yang sudah dimuat, pencarian kata di mana pun dilakukan di browser.
- Full-text search penuh (typo, relevansi) bukan bagian MVP; opsinya dibahas di Bagian 12.

**Report (RPT-01…10)**

| Jenis | Sumber data | Cara hitung |
| --- | --- | --- |
| Progres run aktif | Agregasi `count()` per status | Di browser, saat halaman dibuka/diperbarui |
| Summary run/plan/milestone yang sudah ditutup | `runs.finalCounts` | Langsung dibaca, murah |
| Comparison, Workload, Defects (P1) | Koleksi tests/results | Dibaca bertahap di browser lalu dihitung; dibatasi per milestone agar hemat kuota |

Export PDF dibuat di browser dengan @react-pdf/renderer (thumbnail evidence untuk test Failed diambil dari URL Cloudinary). Tidak ada server PDF.

**Notifikasi (NOTIF-01/02)**

- In-app: dokumen `users/{uid}/notifications/{id}`, ditulis oleh pengirim di batch yang sama dengan aksinya (mis. reject case), dan didengarkan realtime oleh lonceng di top bar. Rules hanya mengizinkan field tertentu dan pengirim harus anggota project yang sama.
- Email (P1): Worker dengan Cron Trigger membaca notifikasi baru dan mengirim email ringkasan lewat penyedia email gratis (mis. Resend).

**API publik & integrasi (INT-01…05, fase P1)**

| Aspek | Desain |
| --- | --- |
| Base URL | `https://api.<domain>/v1/...` (Cloudflare Worker) |
| Autentikasi | API key per user (dibuat di profil, disimpan sebagai hash SHA-256, bisa dicabut) via header `Authorization: Bearer` |
| Akses data | Worker memakai service account (disimpan sebagai Wrangler secret), lalu memeriksa role user pemilik key sebelum setiap tulis |
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
| Komponen | Vitest + Testing Library | Form editor case, tabel run, dialog Add Result |
| Security rules | `@firebase/rules-unit-testing` + emulator | **Paling penting:** setiap role × setiap aksi di matriks permission PRD; Tester/Admin tidak bisa approve; run Completed terkunci |
| Worker | Vitest + `@cloudflare/vitest-pool-workers` | Verifikasi token, penolakan Viewer, run Completed |
| E2E | Playwright | Register → buat case → approve → buat run → isi hasil + evidence → tutup run → report |

Karena rules sekarang memegang seluruh aturan bisnis, test rules wajib lulus sebelum merge. Aplikasi ini juga sebaiknya dipakai untuk mengelola test case-nya sendiri (dogfooding) begitu MVP berjalan.

## 11. Keamanan, Observability, Backup & Biaya

**Keamanan**

| Ancaman / kebutuhan | Kontrol |
| --- | --- |
| Akses data lintas workspace/project | Rules berbasis dokumen member; test rules otomatis di CI |
| Client nakal menulis langsung ke Firestore | Semua aturan bisnis ada di rules, bukan di UI; field review, status run, dan role tidak bisa diubah tanpa lolos rules |
| Eskalasi role | Hanya Admin yang bisa menulis dokumen member; rules melarang mengubah role sendiri |
| Upload ke Cloudinary oleh orang luar | Hanya signed upload; tanda tangan dibuat Worker setelah verifikasi ID token dan cek rules |
| Brute force login | Proteksi bawaan Firebase Auth |
| XSS dari rich text | Konten Tiptap disimpan sebagai JSON, dirender tanpa `dangerouslySetInnerHTML`; sanitasi HTML saat import |
| Kebocoran rahasia | Wrangler secret & GitHub secret; API key user di-hash |
| Header keamanan | CSP, HSTS, X-Frame-Options lewat file `_headers` di Cloudflare Pages |
| Penyalahgunaan Worker | Rate limiting bawaan Cloudflare + validasi Zod di setiap endpoint |

**Observability**

- Error frontend: Sentry (paket gratis) dengan source map dari CI.
- Worker: Workers Logs bawaan Cloudflare.
- Kuota: halaman **Admin → Pemakaian** menampilkan perkiraan pemakaian Firestore dan kredit Cloudinary (dari Usage API lewat Worker), dengan peringatan saat melewati 70%.

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
| Tanpa server tepercaya | Logika yang tidak bisa diperiksa rules (mis. APR-05 di batch besar) bergantung pada UI | Hanya role tepercaya (Lead) yang bisa membuat run; diaudit lewat dokumen `reviews` dan `activity` |
| Batch maks. 500 tulis, rules maks. 10/20 pembacaan dokumen | Run besar dibuat bertahap, tidak atomik | Status `draft` → `active` + tombol lanjutkan/batalkan |
| Tidak ada backup terkelola di Spark | Data hilang bila terhapus tidak sengaja | Backup mingguan lewat GitHub Actions + uji restore |
| URL Cloudinary tanpa login | Gambar bisa dibuka siapa pun yang tahu URL-nya | URL acak; evidence tanpa data sensitif |
| Kredit Cloudinary dipakai bersama storage & bandwidth | Makin banyak gambar tersimpan, makin sedikit sisa untuk dilihat | Kompresi wajib + pantau di Admin → Pemakaian |
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

- [ ] Single workspace (internal) atau multi-workspace SaaS? Memengaruhi onboarding dan kebutuhan kuota.
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
