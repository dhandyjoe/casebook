# PRD — Casebook

Nov 5, 2026 · @apakah bisa bahasa indonesia?

## 1. Ringkasan Produk

Kita membangun Casebook, web app test case management yang meniru alur kerja inti TestRail: tulis test case di repository terstruktur, eksekusi lewat Test Run, kelompokkan dengan Test Plan dan Milestone, lalu pantau hasilnya lewat Dashboard dan Reports. Fokus pembeda adalah UI/UX yang sederhana dan cepat, sama seperti alasan Anda menyukai TestRail.

**Masalah yang diselesaikan**

- Test case tersebar di spreadsheet, wiki, atau tiket bug, sehingga sulit dicari, di-reuse, dan dilacak riwayat perubahannya.
- Tidak ada gambaran real-time: berapa persen run sudah selesai, berapa yang gagal, siapa mengerjakan apa.
- Sulit menjawab "apakah rilis ini siap?" karena hasil test tidak terhubung ke rilis/sprint.

**Tujuan (Goals)**

1. Satu repository terpusat untuk semua test case per project, tersusun dalam section bertingkat.
2. Eksekusi test yang cepat: tester bisa memberi status (Passed/Failed/Blocked/Retest) dalam 1–2 klik.
3. Visibilitas progres real-time per run, plan, milestone, dan project.
4. Laporan siap dibagikan ke stakeholder (summary, comparison, defect, workload).
5. Isolasi data per workspace: user hanya melihat data workspace-nya, dan semua akun punya hak yang sama.

**Non-tujuan (fase awal)**

- Bukan bug tracker; defect cukup ditautkan ke Jira/GitHub/tracker lain.
- Bukan tool otomasi test; hasil automation hanya diterima lewat API.
- Bukan ALM lengkap (requirement management penuh, CI/CD orchestration).

## 2. Riset & Analisa Referensi

Kesimpulan riset: daftar fitur Anda (Dashboard, Test Case, Test Plan, Reports, Login) sudah benar sebagai fondasi, tetapi belum cukup. TestRail bertumpu pada empat konsep tambahan yang wajib ada: **Project**, **Test Run** (eksekusi), **Milestone**, dan **Role & Permission**. Tanpa Test Run, Test Plan tidak punya tempat untuk mencatat hasil.

**Cara kerja TestRail (dari dokumentasi resmi)**

- Setelah login, user mendarat di Dashboard yang berisi daftar project, aktivitas terbaru, dan to-do pribadi. Klik project membuka halaman Overview project; pindah project lewat dropdown di menu kiri. ([TestRail – Introduction](https://support.testrail.com/hc/en-us/articles/7076810203028))
- Test case berisi prasyarat, langkah, dan expected result, dan disusun dalam section/sub-section per modul produk.
- Test Suite ibarat rencana cara menguji; Test Run adalah eksekusi nyatanya. Saat membuat run, user bisa memilih semua case, sebagian case, atau filter dinamis.
- Setiap test dalam run punya lima status bawaan: Untested, Passed, Failed, Retest, Blocked. Run sendiri berstatus Draft, Active, atau Done — Done ditetapkan otomatis saat semua test sudah dijalankan. Isi test adalah snapshot case saat run dibuat, sehingga tidak terpengaruh perubahan case berikutnya — penting untuk arsip/audit.
- Milestone mewakili rilis/sprint; run dan plan ditautkan ke milestone untuk melacak progres rilis.
- Test Plan menjalankan beberapa run sekaligus, misalnya satu run per kombinasi browser/OS (Configurations).
- Test yang di-assign muncul di To-do user; ada notifikasi email saat ada komentar/hasil baru.

**Template & field test case** — TestRail menyediakan template Text, Steps, Exploratory Session, dan BDD, plus custom field dan template yang bisa diubah admin. Pada template Steps, langkah bisa diurutkan ulang dan diambil dari library shared steps. ([Test case templates](https://support.testrail.com/hc/en-us/articles/14927678348052))

**Reports** — Dikelompokkan menjadi Summary (Project, Milestone, Plan, Run), Results (Comparison for Cases/References, Property Distribution), Defects (Summary for Cases/References), dan Users (Workload). ([Reports overview](https://support.testrail.com/hc/en-us/articles/9285210470420))

**Pelajaran dari kompetitor**

| Tool | Fitur yang layak diadopsi | Catatan |
| --- | --- | --- |
| [Qase](https://docs.qase.io/general/get-started-with-the-qase-platform/test-cases/shared-steps) | Shared steps (bisa dikonversi dari step biasa), test case review, parameters, trash bin, quick-create case hanya dengan judul | Ulasan pengguna banyak memuji UI yang bersih dan modern |
| Zephyr / Xray | Hidup di dalam Jira, traceability ke story | Kuat untuk tim yang semuanya di Jira, tapi UI terikat Jira |
| TestLink | Gratis, open source | UI usang — contoh yang harus dihindari |

**Mengapa UX TestRail terasa mudah** (analisa, akan diterapkan di Bagian 6)

1. Hierarki konsisten: semua objek berada di dalam Project, dan navigasi tab project selalu sama.
2. Layout dua panel di halaman Test Cases: pohon section di kiri, daftar case di kanan.
3. Warna status konsisten di seluruh app (hijau Passed, merah Failed, dst.), sehingga progress bar bisa dibaca sekilas.
4. Aksi cepat: ubah status langsung dari tabel run tanpa membuka halaman detail.
5. To-do dan assign membuat setiap tester tahu tugasnya tanpa bertanya.

## 3. Workspace & Akses Pengguna

Tidak ada role. Semua akun setara: tiap user yang login punya hak yang sama atas data di workspace-nya (lihat, buat, ubah, hapus project, case, section, milestone, plan, run, hasil, dan report). Tidak ada Admin, Lead, maupun Viewer.

**Workspace**

Workspace adalah batas data. Pilihannya statis (tanpa fitur kelola workspace) lewat dropdown **Workspace Name**:

| Workspace Name |
| --- |
| Alpha QA |
| Beta Squad |
| Gamma Labs |

- Dropdown Workspace Name ada di form Register; pilihan itu tersimpan di akun (`users/{uid}.workspaceId`). Top bar menampilkan nama workspace aktif.
- Semua user dalam satu workspace yang sama boleh melihat dan mengerjakan test case dan test run yang sama.
- User tidak bisa melihat, mencari, atau membuka test case, test run, maupun data lain milik workspace lain. Pembatasan ini ditegakkan di aturan database, bukan hanya di UI.
- **Reviewer** = user mana pun di workspace yang sama; dialah yang meng-approve atau mengembalikan test case ke Draft (lihat 5.4.1).
- Dashboard menyimpan pin project per user (`users/{uid}.pinnedProjectIds`).

## 4. Konsep Inti & Hierarki Data

Aplikasi punya dua sisi yang terpisah tapi terhubung: **repository** (apa yang harus diuji) dan **eksekusi** (hasil pengujian di waktu tertentu). Pemisahan inilah yang membuat satu case bisa dipakai di puluhan run tanpa ditulis ulang.

&#91;embedded content: hierarki data · repository dan eksekusi\]

Run boleh berdiri sendiri, langsung di bawah milestone, atau berada di dalam Test Plan. Status Test adalah hasil (Result) terakhir yang ditambahkan.

**Glosarium singkat**

| Istilah | Arti |
| --- | --- |
| Test Case | Instruksi uji yang bisa dipakai berulang: prasyarat, langkah, expected result |
| Section | Pengelompokan case (folder), bisa bertingkat |
| Milestone | Target rilis/sprint yang progres testingnya ingin dipantau |
| Test Plan | Kumpulan beberapa run untuk satu tujuan, mis. regression rilis 3.0 di 3 browser |
| Test Run | Satu kali eksekusi sekumpulan case |
| Test | Satu case di dalam satu run (instance eksekusi) |
| Result | Catatan hasil eksekusi sebuah test; satu test bisa punya banyak result |
| Configuration | Variasi lingkungan uji (browser, OS, device) |

### 4.1 Daftar Status

**Status Test Case** (siklus review & approval; aturan lengkap di 5.4.1)

| Status | Arti | Diubah oleh | Bisa masuk Test Run? |
| --- | --- | --- | --- |
| Draft | Status awal case baru, atau case yang dikembalikan reviewer dengan catatan perbaikan; masih bebas diubah | Penulis (simpan) · reviewer (kembalikan ke Draft) | Tidak |
| Under Review | Dikirim untuk review, atau case Approved yang konten utamanya diedit; menunggu keputusan reviewer | Penulis (Kirim untuk review) · sistem (setelah edit) | Tidak |
| Approved | Sudah diperiksa dan disetujui reviewer; siap dieksekusi | Reviewer | Ya |

**Status Test Plan & Test Run**

| Status | Arti | Diubah oleh | Yang bisa dilakukan |
| --- | --- | --- | --- |
| Draft | Run sedang disusun (dibuat lewat dialog Add Test Run → Save as Draft); test belum bisa dieksekusi | User | Ubah nama, milestone, assignee, daftar case; klik Mulai run |
| Active | Eksekusi berjalan; masih ada test Untested atau Retest | User (Start run / Create & start run) atau sistem | User mengisi hasil + evidence; case atau run masih bisa ditambah |
| Done | Semua test sudah dijalankan: tidak ada lagi test Untested maupun Retest | Sistem, otomatis setiap kali hasil disimpan | Lihat & buat report. Bila ada test diberi status Retest, run kembali Active |

Status Test Plan dihitung dari run di dalamnya: **Done** bila semua run Done, **Draft** bila semua run masih Draft, selain itu **Active**. Tidak ada tombol tutup run/plan dan tidak ada status Cancelled; run yang batal dipakai cukup dihapus oleh user.

**Status hasil Test (di dalam run)**

| Status | Warna | Arti |
| --- | --- | --- |
| Untested | Abu muda | Belum dieksekusi; status awal setiap test |
| Passed | Hijau | Semua langkah sesuai expected result |
| Failed | Merah | Ada langkah yang hasilnya berbeda dari expected result |
| Blocked | Abu gelap | Tidak bisa dieksekusi karena dependensi (bug lain, data atau environment belum siap) |
| Retest | Kuning | Perlu diuji ulang, mis. setelah bug diperbaiki |

## 5. Kebutuhan Fungsional

Setiap kebutuhan diberi ID dan prioritas: **P0** = wajib di MVP, **P1** = segera setelah MVP, **P2** = nanti.

### 5.1 Autentikasi & Akun

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| AUTH-01 | Register dengan nama, email, password; pilih Workspace Name dari dropdown statis (lihat Bagian 3); akun terikat ke workspace itu | P0 |
| AUTH-02 | Login email + password, sesi "remember me" | P0 |
| AUTH-03 | Lupa password via link reset ke email (berlaku 60 menit) | P0 |
| AUTH-04 | User mengundang rekan via email ke workspace yang sama; user set password dari link undangan | P0 |
| AUTH-05 | Halaman profil: nama, avatar, ganti password, zona waktu, preferensi notifikasi | P1 |
| AUTH-06 | Verifikasi email saat register | P1 |
| AUTH-07 | Login Google / SSO (SAML/OIDC), 2FA | P2 |

### 5.1.1 Workspace

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| WS-01 | Dropdown **Workspace Name** statis di form Register dengan 3 pilihan: Alpha QA, Beta Squad, Gamma Labs; wajib dipilih | P0 |
| WS-02 | Setiap project (beserta section, case, milestone, plan, run, test, hasil) milik tepat satu workspace | P0 |
| WS-03 | Semua user dalam workspace yang sama boleh melihat test case dan test run yang sama | P0 |
| WS-04 | User tidak bisa melihat test case atau test run workspace lain (daftar, detail, pencarian, report, dan link langsung); aturan database menolak akses lintas workspace | P0 |
| WS-05 | Top bar menampilkan nama workspace aktif | P0 |
| WS-06 | Kelola workspace dinamis (tambah, ubah nama, pindah workspace) | P2 |

### 5.2 Dashboard (global)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| DASH-01 | Daftar project di workspace aktif user, masing-masing dengan ringkasan: jumlah case, run aktif, progress bar status | P0 |
| DASH-02 | Panel "Awaiting review": case Under Review yang menunggu keputusan reviewer, masing-masing dengan tombol Review. Dashboard tidak menampilkan panel To-do; test milik user tetap ada di tab To-do project (TODO-01) | P0 |
| DASH-03 | Grafik aktivitas 14 hari terakhir (jumlah hasil per hari per status) | P1 |
| DASH-04 | Feed aktivitas terbaru (case dibuat, run otomatis Done, hasil ditambahkan) | P1 |
| DASH-05 | Tombol cepat: buat project, cari global | P1 |

### 5.3 Project & Project Overview

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PRJ-01 | CRUD project: nama, deskripsi/announcement, status aktif/arsip | P0 |
| PRJ-02 | Navigasi tab project: Overview · Todo · Milestones · Test Runs & Results · Test Cases · Reports | P0 |
| PRJ-03 | Overview project: grafik status hasil, milestone aktif, run aktif, aktivitas terbaru | P0 |
| PRJ-04 | Switcher project lewat dropdown di sidebar | P0 |
| PRJ-06 | Mode project single repository (default) vs multi-suite | P2 |

### 5.4 Test Case Repository

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| TC-01 | Section & sub-section bertingkat (tak terbatas); tambah, rename, pindah, hapus | P0 |
| TC-02 | Field case: ID otomatis (C123), Title, Section, Template, Type, Priority (High / Medium / Low), Preconditions, Steps, Expected result, References (mis. JIRA-123), Estimate, Automation status. Di panel detail, Preconditions, Steps, dan Expected result tampil sebagai tiga blok terpisah dengan warna latar berbeda (kuning, biru, hijau). Case baru dibuat lewat pop-up dialog Add test case (bukan halaman baru), dengan tombol Save as Draft atau Save & send for review | P0 |
| TC-03 | Template **Text** (langkah dalam satu teks) dan **Steps** (langkah bernomor). Keduanya punya satu **Expected result** untuk seluruh case, ditulis sebagai daftar (satu baris per hasil), bukan per langkah | P0 |
| TC-04 | Editor rich text/Markdown, paste & drag-drop gambar, lampiran file | P0 |
| TC-05 | Quick add: ketik judul lalu Enter untuk menambah case langsung di daftar | P0 |
| TC-06 | Filter (priority, type, automation, dibuat oleh, tanggal) dan pencarian full-text | P0 |
| TC-07 | Bulk action: pindah, salin, ubah field, hapus beberapa case sekaligus | P0 |
| TC-08 | Drag & drop urutan case dan section | P1 |
| TC-09 | Riwayat perubahan case (siapa, kapan, field apa) + daftar hasil dari semua run untuk case ini | P1 |
| TC-10 | Import CSV/Excel dengan mapping kolom; export CSV/Excel/XML | P1 |
| TC-11 | Shared steps: library langkah yang di-reuse banyak case; edit sekali, berlaku di semua | P1 |
| TC-12 | Custom field (dropdown, teks, checkbox, angka, user) dan custom template | P1 |
| TC-13 | Template Exploratory Session (Mission, Goals) dan BDD (Gherkin) | P2 |
| TC-14 | Workflow status case kustom (admin menambah status di luar bawaan 4.1) | P2 |
| TC-15 | Trash bin: case terhapus bisa dipulihkan dalam 30 hari | P2 |

### 5.4.1 Review & Approval Test Case

Setiap test case baru tersimpan sebagai **Draft**. Setelah penulis klik **Send for review**, statusnya menjadi **Under Review**, dan case baru bisa dipakai di Test Run setelah di-**Approve** oleh **reviewer** (user mana pun di workspace yang sama). Bila perlu perbaikan, reviewer mengembalikannya ke Draft dengan catatan. Hanya ada tiga status: Draft, Under Review, Approved (definisi di Bagian 4.1).

&#91;embedded content: siklus status test case · approval oleh reviewer\]

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| APR-01 | Case baru (dibuat manual, quick add, atau import) tersimpan sebagai Draft; penulis mengirimnya dengan tombol "Send for review" sehingga status menjadi Under Review | P0 |
| APR-02 | Semua user di workspace yang sama boleh Approve / Return to Draft; user dari workspace lain tidak bisa (API menolak dengan 403) | P0 |
| APR-03 | "Return to Draft" wajib disertai catatan perbaikan; catatan tampil di panel case Draft dan penulis case mendapat notifikasi | P0 |
| APR-04 | Mengedit konten utama (title, preconditions, steps, expected result) pada case Approved mengembalikan status ke Under Review; case Draft bebas diedit; edit field minor (priority, type, references) tidak mengubah status | P0 |
| APR-05 | Hanya case Approved yang bisa dipilih saat membuat Test Run / Plan; case lain tampil abu-abu dengan label statusnya | P0 |
| APR-06 | Antrean "Menunggu review" untuk semua user: widget di Dashboard + filter status di halaman Test Cases | P0 |
| APR-07 | Badge status berwarna di daftar case dan di panel detail case | P0 |
| APR-08 | Riwayat (siapa, kapan, aksi, catatan) tampil di panel detail case | P0 |
| APR-09 | Case yang kembali ke Under Review tidak memengaruhi test di run yang sudah ada (tetap memakai snapshot lama) | P0 |
| APR-10 | Bulk kirim untuk review dan bulk approve beberapa case sekaligus | P1 |
| APR-11 | Pengaturan per project untuk mewajibkan atau mematikan approval | P1 |

### 5.5 Test Run & Eksekusi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| RUN-01 | Buat run lewat pop-up dialog Add Test Run (bukan halaman baru): nama, milestone, test plan, assignee default, deskripsi. Pemilihan case: **All Approved** (semua case Approved) atau **Choose cases**. Choose cases memakai pohon section dengan checkbox (centang section = pilih semua case di dalamnya, tanda "–" bila sebagian), daftar case per section dengan Select all dan filter priority, serta pencarian judul/ID di semua section. Pilihan bisa dari banyak section sekaligus dan tersimpan saat pindah section; ringkasannya tampil sebagai "N cases selected from M sections" dengan chip per section yang bisa dihapus. Hanya case Approved yang tampil; case Draft/Under Review disembunyikan dengan keterangan jumlahnya. Tombol Save as Draft atau Create & start run (langsung Active) aktif bila nama terisi dan minimal 1 case dipilih | P0 |
| RUN-02 | Run berisi "test" — salinan case pada saat run dibuat — dengan status awal Untested | P0 |
| RUN-03 | Status bawaan: Passed, Failed, Blocked, Retest, Untested, masing-masing dengan warna tetap | P0 |
| RUN-04 | Ubah status langsung dari daftar test (dropdown inline) atau dari form Add result di kolom detail | P0 |
| RUN-05 | Add result: pilih status (Passed / Failed / Blocked / Retest, shortcut P / F / B / R) dan satu field **Comment & evidence** untuk teks sekaligus gambar (lihat 5.5.1). Tidak ada field versi/build dan defect ID; riwayat hasil tampil di atas form | P0 |
| RUN-06 | Untuk template Steps: tandai langkah tempat test gagal (opsional). Tidak ada status maupun expected result per langkah | P1 |
| RUN-07 | Assign test ke tester (satuan atau bulk); test masuk ke To-do user | P0 |
| RUN-08 | Ringkasan run di atas daftar: donut status, jumlah dan persentase per status, angka besar % passed, jumlah untested dan % dieksekusi; filter per assignee/status | P0 |
| RUN-09 | Layar eksekusi tiga kolom tanpa pindah halaman: kiri daftar folder (section) run, hanya nama folder; tengah daftar test dari folder terpilih (folder induk mengelompokkan test per sub-folder); kanan detail test (Preconditions, Steps, Expected result, riwayat hasil, Add result). Previous/Next dan Save & next test berpindah di dalam folder yang sedang dibuka | P0 |
| RUN-10 | Status run otomatis: Active → Done saat semua test sudah punya hasil dan tidak ada yang Untested atau Retest; bila ada test diubah ke Retest, run kembali Active. Tidak ada tombol tutup run. Isi test tetap snapshot, jadi perubahan case setelahnya tidak memengaruhi run | P0 |
| RUN-11 | Riwayat hasil per test (beberapa hasil berurutan, yang terakhir menjadi status) | P0 |
| RUN-12 | Rerun: buat run baru dari run lama, opsional hanya case Failed/Blocked/Retest | P1 |
| RUN-13 | Custom status tambahan (mis. "Skipped", "In Progress") | P2 |

### 5.5.1 Evidence Gambar pada Hasil Test

Saat mengisi hasil test, tester bisa melampirkan screenshot sebagai bukti (evidence). Setiap evidence melekat pada satu Result, sehingga setiap eksekusi ulang punya buktinya sendiri dan tetap tersimpan sebagai arsip setelah run Done.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| EVD-01 | Di form Add result, tester melampirkan gambar (PNG, JPG, GIF, WebP) lewat tombol upload, drag & drop, atau paste dari clipboard (Ctrl/Cmd + V) | P0 |
| EVD-02 | Banyak gambar per hasil (maks. 10 file, 10 MB per file); gambar dikompres otomatis di browser (WebP, target ≤ 400 KB) sebelum upload, dengan progress bar upload dan pesan error yang jelas jika format/ukuran tidak sesuai | P0 |
| EVD-03 | Thumbnail tampil di riwayat hasil pada halaman test; klik membuka lightbox (zoom, next/prev, download) | P0 |
| EVD-04 | Ikon lampiran + jumlah file di tabel run untuk test yang punya evidence | P0 |
| EVD-05 | Pengunggah bisa menghapus/mengganti evidence selama run masih Active; setelah run Done evidence read-only (bila test diulang, evidence baru melekat pada hasil baru) | P0 |
| EVD-06 | Evidence per langkah untuk case bertemplate Steps | P1 |
| EVD-07 | Pengaturan per project: wajib melampirkan evidence untuk status Failed (dan opsional Passed) | P1 |
| EVD-08 | Evidence tampil di report Summary Run dan ikut di export PDF (thumbnail untuk test Failed) | P1 |
| EVD-09 | API add result menerima lampiran, agar automation bisa mengirim screenshot saat test gagal | P1 |
| EVD-10 | Lampiran non-gambar: video rekaman layar (MP4/WebM), log, PDF | P1 |
| EVD-11 | Anotasi sebelum upload: kotak, panah, teks, dan blur data sensitif | P2 |

Penyimpanan: evidence diunggah langsung ke Cloudinary dengan signed upload (tanda tangan hanya diberikan kepada member project yang berhak, saat run masih Active). URL gambar acak dan sulit ditebak, tetapi tidak dijaga login, sehingga evidence sebaiknya tidak memuat data sensitif. Thumbnail dibuat lewat URL transformasi Cloudinary agar daftar hasil tetap ringan.

### 5.6 Test Plan & Configurations

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PLAN-01 | Test plan = wadah beberapa run sekaligus (mis. Smoke, Regression, New Features) di satu milestone | P0 |
| PLAN-02 | Halaman plan menampilkan agregat progres semua run di dalamnya | P0 |
| PLAN-03 | Configurations: grup (Browser, OS, Device) dan opsi (Chrome, Firefox…); plan membuat satu run per kombinasi | P1 |
| PLAN-04 | Status plan dihitung otomatis dari run-nya: Done bila semua run Done, Draft bila semua run Draft, selain itu Active | P0 |

### 5.7 Milestone

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| MS-01 | CRUD milestone: nama, deskripsi, start date, due date, status aktif/selesai | P0 |
| MS-02 | Run dan plan ditautkan ke milestone; halaman milestone menampilkan progres gabungan | P0 |
| MS-03 | Sub-milestone (mis. Release 3.0 → Sprint 21, Sprint 22) | P1 |
| MS-04 | Penanda milestone lewat due date (overdue) di dashboard | P1 |

### 5.8 To-do & Notifikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| TODO-01 | Halaman Todo per project: test milik saya, filter per run/status | P0 |
| TODO-02 | User dapat melihat to-do semua anggota tim untuk menyeimbangkan beban kerja | P1 |
| NOTIF-01 | Notifikasi in-app saat di-assign atau ada komentar/hasil pada test milik saya | P1 |
| NOTIF-02 | Notifikasi email yang bisa diatur per user; subscribe ke run tertentu | P1 |

### 5.9 Reports

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| RPT-01 | Summary – Run: status, persentase, daftar failed/blocked, per assignee | P0 |
| RPT-02 | Summary – Milestone & Plan: progres agregat dan run di dalamnya | P0 |
| RPT-03 | Summary – Project: status semua milestone & run aktif | P0 |
| RPT-04 | Export report ke PDF dan CSV; share via link internal | P0 |
| RPT-05 | Results – Comparison for Cases: matriks case × beberapa run/konfigurasi | P1 |
| RPT-06 | Defects – Summary: daftar defect ID dari hasil Failed, dikelompokkan per case | P1 |
| RPT-07 | Users – Workload: jumlah test ter-assign dan selesai per tester | P1 |
| RPT-08 | Cases – Coverage for References: case per requirement/story dan statusnya | P1 |
| RPT-09 | Property Distribution: hasil dikelompokkan per atribut (type, priority, automation) | P2 |
| RPT-10 | Report terjadwal yang dikirim via email | P2 |

### 5.10 Administrasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| ADM-01 | Kelola user: undang, nonaktifkan | P0 |
| ADM-03 | Kelola daftar nilai: case type, priority, status hasil | P1 |
| ADM-04 | Kelola custom field & template | P1 |
| ADM-05 | Audit log: login, perubahan permission, hapus data | P1 |

### 5.11 Integrasi & API

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| INT-01 | REST API untuk project, section, case, run, plan, milestone, result, user (token per user) | P1 |
| INT-02 | Endpoint bulk add results untuk menerima hasil automation (Playwright, Cypress, JUnit) dari CI | P1 |
| INT-03 | Integrasi Jira: link defect & reference, buat issue dari test Failed | P1 |
| INT-04 | Webhook (run done, result added) | P2 |
| INT-05 | Integrasi GitHub/GitLab Issues, Slack | P2 |

## 6. Prinsip UI/UX

Target UX: tester baru bisa membuat case pertama dan mengeksekusi run pertama dalam 10 menit tanpa pelatihan.

**Prinsip desain**

1. **Satu pola navigasi.** Top bar: logo, nama workspace aktif, project switcher, pencarian global, notifikasi, avatar. Di dalam project: tab tetap Overview · Todo · Milestones · Test Runs & Results · Test Cases · Reports.
2. **Split view untuk data hierarkis.** Pohon section/folder di kiri, daftar di tengah, detail di kanan, dipakai di Test Cases dan Test Run. Klik item membuka detail di kolom kanan tanpa pindah halaman.
3. **Status = warna yang sama di mana pun.** Passed hijau, Failed merah, Blocked abu gelap, Retest kuning, Untested abu muda. Progress bar bertumpuk memakai urutan warna yang sama.
4. **Aksi tersering = paling sedikit klik.** Ubah status inline, quick add case, Next/Previous test, shortcut keyboard (mis. `P` Passed, `F` Failed, `B` Blocked, `N` next).
5. **Kepadatan informasi yang bisa diatur.** Mode tampilan Compact / Comfortable untuk daftar panjang, mengikuti TestRail yang menyediakan beberapa view di halaman overview.
6. **Empty state yang mengajari.** Project kosong menampilkan langkah: buat section → tambah case → mulai run.
7. **Konfirmasi hanya untuk aksi destruktif** (hapus case, run, atau plan); aksi lain langsung tersimpan dengan toast + Undo.
8. **Buat cepat lewat pop-up dialog.** Add case dan Add Test Run dibuka sebagai dialog di atas halaman yang sedang dibuka, bukan halaman baru. List tetap terlihat di belakangnya, dan setelah disimpan item baru langsung tersorot di list.
9. **Isi case dibedakan dengan warna blok.** Preconditions berlatar kuning, Steps biru (hanya langkah bernomor), Expected result hijau (satu daftar untuk seluruh case). Tampilannya sama di detail Test Cases dan detail Test Run.
10. **Animasi seperlunya.** Animasi masuk ringan di halaman Sign in (fade + naik pelan, progress bar terisi, centang muncul bergantian), selesai dalam ±1,5 detik, dan otomatis mati bila user memilih reduce motion. Layar kerja tidak memakai animasi dekoratif.
11. **Satu acuan visual.** Warna, tipografi, spacing, dan komponen mengikuti design.md agar semua layar konsisten.

**Layar utama**

| Layar | Isi utama | Aksi utama |
| --- | --- | --- |
| Login / Register / Lupa password | Form sederhana, satu kolom; Register punya dropdown Workspace Name | Masuk, daftar, reset |
| Dashboard | Kartu project + progress bar, panel Awaiting review, feed aktivitas | Buka project, buat project |
| Project Overview | Grafik status 14 hari, milestone aktif, run aktif, feed aktivitas | Buat run/plan/milestone |
| Test Cases | Tiga kolom: pohon section · daftar case (ID, title, priority, status review) · panel detail case | Quick add, filter, bulk edit, import |
| Case detail / editor | Panel kanan Test Cases: field, Preconditions, Steps, Expected result (tiga blok berwarna), riwayat; case baru lewat dialog Add test case | Save as Draft, Send for review, Approve / Return to Draft |
| Test Runs & Results | Daftar plan & run aktif dan selesai, masing-masing dengan progress bar | Add run, add plan |
| Run detail | Ringkasan run (donut + % passed) di atas; di bawahnya tiga kolom: folder · daftar test · detail test | Ubah status inline, assign, tambah hasil |
| Test detail | Kolom kanan Run detail: Preconditions, Steps, Expected result, riwayat hasil, form Add result (status + Comment & evidence) | Simpan hasil, Next/Previous |
| Milestones | Daftar milestone, due date, progres gabungan | Tambah, tandai selesai |
| Todo | Test milik saya / tim, dikelompokkan per run | Buka test, assign ulang |
| Reports | Kiri: template report; tengah: report tersimpan | Buat, lihat, export PDF |
| Administration | Users, Projects, Customizations, Integrations | Undang user |

Saran teknis UI: komponen tabel virtual (ribuan baris tetap mulus), tema terang/gelap, responsif minimal untuk tablet (eksekusi test di device lab). Token warna, tipografi, spacing, dan spesifikasi komponen ada di design.md.

## 7. Kebutuhan Non-Fungsional

| Area | Target |
| --- | --- |
| Performa | Halaman daftar case/run dengan 10.000 baris terbuka < 2 detik (p95); simpan hasil test < 300 ms |
| Skala | Minimal 50 project, 100.000 case, 1 juta hasil per workspace tanpa degradasi |
| Ketersediaan | 99,5% uptime untuk versi cloud; backup database mingguan lewat GitHub Actions |
| Keamanan | Password di-hash (bcrypt/argon2), HTTPS wajib, proteksi CSRF/XSS, rate limit login (5 gagal → jeda), sesi kedaluwarsa 30 hari dengan remember-me |
| Otorisasi | Setiap endpoint API dan aturan database memeriksa workspace user, bukan hanya di UI |
| Audit | Hasil test tidak bisa diubah atau dihapus (append-only, termasuk setelah run Done); perubahan case tercatat di history |
| Lampiran | Maks. 10 MB per gambar (dikompres di browser sebelum upload), disimpan di Cloudinary |
| Kompatibilitas | 2 versi terakhir Chrome, Edge, Firefox, Safari; layar ≥ 1280 px optimal, tablet didukung |
| Aksesibilitas | Navigasi keyboard penuh, kontras WCAG AA, status tidak hanya dibedakan warna (ada label/ikon), animasi mati bila prefers-reduced-motion aktif |
| Lokalisasi | UI MVP dalam bahasa Inggris (label, status, pesan sistem, waktu relatif seperti "5 minutes ago"). Semua string disimpan di file terjemahan agar Bahasa Indonesia bisa ditambah di P1. Isi buatan user (judul case, langkah, catatan) tidak diterjemahkan. Tanggal mengikuti zona waktu user |

**Stack teknologi** — React + TypeScript (SPA) di Cloudflare Pages, Firebase paket Spark (Authentication + Cloud Firestore), Cloudinary untuk evidence gambar, dan satu Cloudflare Worker kecil; semuanya paket gratis tanpa kartu kredit. Detail lengkap ada di Arsitektur — Test Case Management Web App.

## 8. Model Data

Entitas inti untuk MVP. Kunci desainnya: **Test** adalah salinan (snapshot) dari **Case** saat run dibuat, sehingga run yang sudah Done tetap akurat walau case diubah.

| Entitas | Field utama | Relasi |
| --- | --- | --- |
| Workspace | id, name (statis: Alpha QA, Beta Squad, Gamma Labs), created\_at | punya banyak User, Project |
| User | id, name, email, password\_hash, workspace\_id, is\_active, timezone | anggota Workspace |
| Project | id, workspace\_id, name, description, is\_archived | punya Section, Case, Milestone, Plan, Run |
| Section | id, project\_id, parent\_id, name, description, sort\_order | pohon bertingkat; punya Case |
| Case | id, section\_id, title, status, template, type\_id, priority (high / medium / low), preconditions, steps (JSON: daftar langkah, teks saja), expected (daftar hasil yang diharapkan untuk seluruh case), refs, estimate, automation\_type, custom\_fields (JSON), created\_by, updated\_by | punya CaseHistory, CaseReview |
| CaseHistory | case\_id, user\_id, changes (JSON), created\_at | log perubahan Case |
| SharedStep | id, project\_id, title, steps (JSON) | direferensikan dari Case.steps (P1) |
| Milestone | id, project\_id, parent\_id, name, start\_on, due\_on, is\_completed | punya Plan & Run |
| Plan | id, project\_id, milestone\_id, name, description, status | punya banyak Run |
| Configuration | id, group\_name, name | dipakai Run dalam Plan (P1) |
| Run | id, project\_id, plan\_id?, milestone\_id?, name, assignee\_id, include\_all, config\_ids\[\], status, counts (passed, failed, blocked, retest, untested), done\_at | punya Test |
| Test | id, run\_id, case\_id, section\_id (folder di layar eksekusi), case\_snapshot (JSON: title, preconditions, steps, expected), assignee\_id, status\_id (status terakhir) | punya Result |
| Result | id, test\_id, status\_id, comment (isi field Comment & evidence), failed\_step?, created\_by, created\_at | punya Attachment |
| Status | id, name, label, color, is\_system, is\_final | 1 Passed, 2 Blocked, 3 Untested, 4 Retest, 5 Failed (mengikuti ID API TestRail) |
| Attachment | id, entity\_type, entity\_id, step\_index?, file\_url, thumbnail\_url, mime\_type, size, uploaded\_by, created\_at | Case, Result |
| Report | id, project\_id, template, params (JSON), created\_by, output\_url | — |
| Activity | id, project\_id, user\_id, action, entity\_type, entity\_id, created\_at | sumber feed & grafik aktivitas |

Untuk approval ditambah entitas **CaseReview** (id, case\_id, reviewer\_id, action: submit / approve / return\_to\_draft, comment, created\_at). Kolom `Case.status` berisi draft / under\_review / approved; `Plan.status` dan `Run.status` berisi draft / active / done (done dihitung otomatis dari hasil test).

Urutan ID status di atas sengaja disamakan dengan API TestRail agar migrasi data dari TestRail lebih mudah. ([TestRail API – Statuses](https://support.testrail.com/hc/en-us/articles/7077935129364))

## 9. Lingkup MVP & Roadmap

MVP hanya berisi kebutuhan P0: cukup untuk menjalankan siklus penuh tulis case → buat plan/run → eksekusi → report. Pemetaan MoSCoW: **Must** = P0, **Should** = P1, **Could** = P2, **Won't (untuk sekarang)** = non-tujuan di Bagian 1.

&#91;embedded content: roadmap · 3 fase, 2 gate\]

Fase berikutnya baru dimulai setelah gate terpenuhi, agar umpan balik pemakaian nyata menentukan prioritas P1 dan P2.

**Definition of Done MVP**

- [ ] User bisa register dengan memilih Workspace Name, mengundang rekan, dan membuat project
- [ ] User bisa membuat 100+ case di section bertingkat dalam satu sesi tanpa hambatan
- [ ] Case baru tersimpan sebagai Draft lalu dikirim untuk review; reviewer di workspace yang sama bisa Approve / Kembalikan ke Draft, dan hanya case Approved yang bisa masuk run
- [ ] User bisa membuat milestone, plan berisi beberapa run, dan assign test
- [ ] User bisa mengeksekusi run dengan status inline dan Next/Previous, serta melampirkan screenshot sebagai evidence
- [ ] Status run otomatis Done saat semua test sudah dijalankan; Summary report run/milestone bisa diekspor ke PDF
- [ ] User di workspace lain tidak bisa melihat test case dan test run workspace ini

## 10. Metrik, Risiko & Pertanyaan Terbuka

**Metrik keberhasilan (3 bulan setelah MVP rilis)**

| Metrik | Target |
| --- | --- |
| Waktu dari register sampai run pertama selesai | < 15 menit (median) |
| Rata-rata klik untuk memberi status satu test | ≤ 2 klik |
| Tim yang memakai minimal 1 run per minggu | ≥ 70% workspace aktif |
| Kepuasan pengguna (skor kemudahan, skala 1–5) | ≥ 4,2 |
| Report diekspor/dibagikan per project per bulan | ≥ 2 |

**Risiko & mitigasi**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Scope membengkak meniru semua fitur TestRail | MVP terlambat | Kunci scope P0; fitur P1/P2 lewat roadmap |
| Performa tabel run besar (ribuan test) | UX lambat, bertentangan dengan tujuan utama | Pagination server-side + tabel virtual sejak awal; indeks DB per run/status |
| Snapshot case di setiap test memperbesar database | Biaya storage | Simpan snapshot hanya saat run Done atau pakai versi case (case\_version\_id) |
| UI terlalu mirip TestRail | Risiko merek/hak cipta | Tiru alur & pola UX, bukan aset visual, logo, atau teks TestRail |
| Migrasi user dari spreadsheet/TestRail sulit | Adopsi rendah | Import CSV dengan mapping kolom di P1; ID status kompatibel API TestRail |

**Pertanyaan terbuka**

- [ ] Target pengguna: internal tim sendiri saja, atau SaaS untuk tim lain? (Nama produk sudah diputuskan: Casebook.)
- [ ] Single-tenant (self-hosted) atau multi-tenant cloud?
- [ ] Apakah integrasi Jira masuk MVP (dipindah ke P0)?
- [x] Perlu template Steps dengan status per langkah di MVP? Diputuskan: tidak. Status cukup per test, dan expected result satu per case.
- [ ] Bolehkah penulis meng-approve case yang ia tulis sendiri, atau wajib user lain?
- [x] Bahasa UI default: diputuskan Inggris untuk MVP; Bahasa Indonesia menyusul di P1.
- [ ] Ukuran tim pengembang dan target tanggal MVP?

## Sumber

- [TestRail – Introduction to TestRail](https://support.testrail.com/hc/en-us/articles/7076810203028)
- [TestRail – Test case templates](https://support.testrail.com/hc/en-us/articles/14927678348052)
- [TestRail – Reports overview](https://support.testrail.com/hc/en-us/articles/9285210470420)
- [TestRail API – Statuses](https://support.testrail.com/hc/en-us/articles/7077935129364)
- [TestRail blog – Announcing TestRail 1.1 (roles & Blocked status)](https://www.testrail.com/blog/announcing-testrail-1-1/)
- [Qase Docs – Shared steps](https://docs.qase.io/general/get-started-with-the-qase-platform/test-cases/shared-steps)
