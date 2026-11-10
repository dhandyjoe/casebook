# Casebook — Design System

Acuan visual dan perilaku UI untuk Casebook. Warna, ukuran, dan komponen di dokumen ini diambil dari design canvas "Casebook — UI Design" (versi 6 Nov 2026, tema navy), jadi kode harus mengikuti angka di sini, bukan perkiraan. Aturan perilaku yang belum tergambar di canvas ditandai **(rekomendasi)**.

- **Dipakai oleh:** frontend (`apps/web`), terutama `styles/tokens.css`, `tailwind.config`, dan `components/ui/`.
- **Terkait:** PRD — Casebook (kebutuhan), Arsitektur — Casebook (stack: React + shadcn/ui + Tailwind).
- **Bahasa UI:** Inggris untuk MVP. Bahasa Indonesia menyusul di P1 lewat file terjemahan.

---

## 1. Prinsip

1. **Tenang dan padat informasi.** Header navy, latar abu kebiruan, kartu putih, satu warna aksen biru baja. Warna lain hanya untuk status.
2. **Status selalu sama di mana pun.** Satu status = satu warna, satu label, satu urutan, di chip, dropdown, progress bar, donut, dan report.
3. **Tidak pindah halaman untuk pekerjaan rutin.** Detail dibuka di kolom kanan (split view). Membuat case dan run lewat dialog.
4. **Aksi tersering = klik paling sedikit.** Status inline, shortcut keyboard, Save & next test.
5. **Warna tidak pernah jadi satu-satunya penanda.** Selalu ada label teks, titik status, atau ikon.

---

## 2. Warna

### 2.1 Netral

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| `--cb-bg` | `#EAF0F6` | Latar halaman |
| `--cb-surface` | `#FFFFFF` | Kartu, panel, dialog, top bar |
| `--cb-surface-subtle` | `#FAFBFC` | Header tabel, footer dialog, header grup |
| `--cb-surface-muted` | `#F7F8FA` | Pohon section di picker Add Test Run, blok Detail |
| `--cb-border` | `#E3E6EB` | Garis kartu dan panel |
| `--cb-border-subtle` | `#EEF0F3` | Garis antar baris |
| `--cb-border-strong` | `#D5D9E0` | Tombol secondary, kbd |
| `--cb-border-input` | `#C9CED6` | Input, select, textarea |
| `--cb-track` | `#E9ECF1` | Latar progress bar, segmented control |
| `--cb-text` | `#16181D` | Teks utama, judul |
| `--cb-text-secondary` | `#3A3F4A` | Teks isi sekunder, ikon tombol |
| `--cb-text-muted` | `#5A6170` | Label, keterangan, header kolom |
| `--cb-text-subtle` | `#636A78` | Meta (waktu, nama project), placeholder |
| `--cb-text-disabled` | `#8A93A3` | Hanya untuk ikon/titik, **bukan teks** (kontras 3.1:1) |

### 2.2 Header dan panel samping (tema navy)

Tema mengikuti gaya TestRail: header dan tab project menyatu dalam satu pita navy, latar halaman abu kebiruan, panel samping biru-abu.

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| `--cb-header` | `#1A3651` | Top bar, tab project, panel brand di Sign in |
| `--cb-header-line` | `#2A4A6B` | Garis pemisah top bar dan tab, border tombol di header |
| `--cb-header-text` | `#FFFFFF` | Logo, nama project, tab aktif (12.4:1) |
| `--cb-header-text-muted` | `#B8C7D6` | Tab tidak aktif, nama workspace (7.2:1) |
| `--cb-header-icon` | `#E4ECF3` | Ikon tombol di header |
| `--cb-header-search` | `#EAF0F6` | Kotak search di header |
| `--cb-header-badge` | `#F2B705` | Titik notifikasi baru (ring navy 2 px) |
| `--cb-sidebar` | `#D2DEEA` | Panel samping: pohon section, folder Test Run, template report |
| `--cb-sidebar-line` | `#C3D3E2` | Border kanan panel samping |
| `--cb-sidebar-text-2` | `#4B5566` | Label dan angka di panel samping (5.5:1) |
| `--cb-sidebar-active` | `#FFFFFF` | Item aktif di panel samping + garis kiri 3 px `#1A3651` |

### 2.3 Aksen (brand)

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| `--cb-accent` | `#2B6CB0` | Tombol primary, link, tab aktif, checkbox tercentang, focus ring |
| `--cb-accent-hover` | `#1F4F82` | Hover link/tombol, teks di atas tint aksen |
| `--cb-accent-tint` | `#E4EEF8` | Item terpilih di sidebar, chip filter aktif |
| `--cb-accent-tint-2` | `#EDF3FA` | Baris list terpilih |
| `--cb-accent-tint-3` | `#F3F7FB` | Baris tercentang di picker, opsi aktif dropdown |
| `--cb-accent-disabled` | `#A7BFD8` | Tombol primary disabled |
| `--cb-danger` | `#B42323` | Tombol destruktif (Return to Draft, Delete) |
| `--cb-danger-disabled` | `#D9A3A3` | Tombol destruktif nonaktif |

Aksen bisa diganti per workspace (opsi di canvas: `#2B6CB0` biru baja default, `#0F766E` teal, `#6D28D9` ungu, `#C2410C` oranye). Header navy dan warna status tidak ikut berubah.

### 2.4 Status hasil test

Urutan tetap di semua tempat: **Passed → Failed → Blocked → Retest → Untested**.

| Status | Titik / segmen bar | Latar chip | Teks chip | Border chip | Shortcut |
| --- | --- | --- | --- | --- | --- |
| Passed | `#34A865` | `#E3F5EA` | `#146C38` | `#B7E2C6` | P |
| Failed | `#C62828` | `#FDE8E8` | `#A11F1F` | `#F0C2C2` | F |
| Blocked | `#4B5160` | `#E6E8EC` | `#2F343D` | `#C9CED6` | B |
| Retest | `#F2B705` | `#FFF3D6` | `#7A4D00` | `#F3DCA0` | R |
| Untested | `#D5D9E0` | `#FFFFFF` | `#4B5160` | `#D5D9E0` | — |

### 2.5 Status case (review)

| Status | Latar | Teks | Titik |
| --- | --- | --- | --- |
| Draft | `#ECEEF2` | `#3A3F4A` | `#8A93A3` |
| Under Review | `#FFF3D6` | `#8A5300` | `#E0A100` |
| Approved | `#E3F5EA` | `#146C38` | `#1E8449` |

### 2.6 Status run dan plan

| Status | Latar | Teks | Arti |
| --- | --- | --- | --- |
| Draft | `#ECEEF2` | `#3A3F4A` | Not started |
| Active | `#E4EEF8` | `#1F4F82` | In progress |
| Done | `#E3F5EA` | `#146C38` | Semua test punya hasil final (otomatis) |

### 2.7 Blok isi case

Dipakai di detail Test Cases, detail Test Run, dan dialog Add test case.

| Blok | Latar | Header | Border | Teks header | Ikon |
| --- | --- | --- | --- | --- | --- |
| Detail (field) | `#F7F8FA` | `#EEF0F3` | `#DDE1E7` | `#3A3F4A` | daftar |
| Preconditions | `#FFFAEE` | `#FDF1D3` | `#F0D9A2` | `#7A4E00` | segitiga peringatan |
| Steps | `#F3F7FB` | `#E2ECF6` | `#C9D9EA` | `#1F4F82` | list bernomor |
| Expected result | `#F3FBF6` | `#E3F5EA` | `#B7E2C6` | `#146C38` | lingkaran centang |

- Langkah di dalam blok Steps adalah kartu putih (`#FFFFFF`, border `#DCE6F0`, radius 8) dengan nomor bulat biru (`#E2ECF6` / `#1F4F82`).
- Expected result adalah satu daftar bullet untuk seluruh case, **bukan per langkah**.

### 2.8 Warna pendukung

| Kegunaan | Nilai |
| --- | --- |
| Warna project (penanda kotak 10×10) | `#E08A00`, `#0F766E`, `#6D28D9`, `#2B6CB0` |
| Avatar (latar / teks) | RS `#D6E4F2`/`#1F4F82` · BS `#E3F5EA`/`#146C38` · SW `#FCE9DA`/`#8A4510` · DP `#EDE7FB`/`#4F2DA8` |
| Badge notifikasi | titik `#F2B705` dengan ring navy 2 px (lihat 2.2) |
| Chip nama workspace (top bar) | border `#2A4A6B`, teks `#E4ECF3`, radius 6, 13 px medium |
| Error / wajib (`*`) | `#A11F1F` |
| Info sukses (mis. "Only Approved cases…") | latar `#EEF9F2`, border `#B7E2C6`, teks `#146C38` |

### 2.9 Kontras (sudah dicek, WCAG 2.1)

| Pasangan | Rasio |
| --- | --- |
| `#16181D` di `#FFFFFF` | 17.8 : 1 |
| `#5A6170` di `#FFFFFF` / `#EAF0F6` | 6.2 / 5.4 : 1 |
| `#636A78` di `#FFFFFF` / `#EAF0F6` | 5.4 / 4.7 : 1 |
| Putih di `#2B6CB0` | 5.4 : 1 |
| Teks chip status (semua pasangan di 2.4–2.6) | 5.7 – 10.2 : 1 |
| Putih / `#B8C7D6` di header `#1A3651` | 12.4 / 7.2 : 1 |
| `#16181D` / `#4B5566` di panel samping `#D2DEEA` | 13.0 / 5.5 : 1 |

`#8A93A3` (3.1:1) dan `#D5D9E0` hanya untuk elemen non-teks. Tombol disabled (`#A7BFD8`, 2.0:1) dikecualikan WCAG, tapi selalu sertakan keterangan kenapa tombol nonaktif (mis. "Enter a run name to continue.").

---

## 3. Tipografi

| Peran | Font | Ukuran / line-height | Berat | Catatan |
| --- | --- | --- | --- | --- |
| Display (Sign in) | Inter | 36 / 1.2 | 700 | letter-spacing −0.02em |
| Judul halaman | Inter | 22–26 / 1.3 | 700 | −0.01em |
| Judul dialog | Inter | 18 | 700 | |
| Judul panel / kartu | Inter | 15–16 | 600 | |
| Header blok (Preconditions dll.) | Inter | 13 | 600 | dengan ikon 16 px |
| Body | Inter | 14 / 1.45 | 400 | ukuran dasar seluruh app |
| Body kecil | Inter | 13 | 400–500 | keterangan, tombol kecil |
| Caption / meta | Inter | 12 | 400–600 | waktu, jumlah, chip |
| Label kolom | Inter | 11–12 | 600 | UPPERCASE, letter-spacing 0.04–0.06em |
| ID & shortcut | JetBrains Mono | 12 (kbd 11) | 500 | C1042, T-2317, `P` |
| Angka besar | Inter | 30 (KPI) / 56 (% passed) | 700 | −0.02 s/d −0.03em |

- Font dimuat dari Google Fonts: Inter 400/500/600/700, JetBrains Mono 500. Fallback `system-ui, sans-serif` dan `monospace`.
- `button, input, select, textarea { font: inherit }` agar kontrol memakai Inter.
- Jangan pakai ukuran di bawah 11 px untuk teks yang harus dibaca.

---

## 4. Spacing, ukuran, radius, bayangan

### 4.1 Spacing

Skala dasar kelipatan 2, yang paling sering dipakai: **4, 6, 8, 10, 12, 14, 16, 20, 24, 32**.

| Konteks | Nilai |
| --- | --- |
| Jarak ikon–teks di tombol/chip | 6–8 |
| Jarak antar kontrol dalam toolbar | 8 |
| Jarak antar field form | 14 (dialog) – 20 (Sign in) |
| Padding kartu | 18–20 |
| Padding panel samping | 20 × 12–16 |
| Padding baris list | 9–12 vertikal × 14 horizontal |
| Padding halaman | 24 (desktop), 32 atas di dashboard |
| Gap antar kartu/kolom | 16–24 |

### 4.2 Tinggi kontrol

| Kontrol | Tinggi |
| --- | --- |
| Input & tombol di form Sign in | 44–46 |
| Input/select di dialog | 42 |
| Tombol utama halaman & dialog | 40 |
| Search top bar, tombol ikon top bar | 38 |
| Search & filter di toolbar list | 36 |
| Tombol kecil, dropdown status inline | 30–32 |
| Chip filter | 28 |
| Avatar kecil di list | 26 |
| Avatar feed | 32 |

Target sentuh minimal 44 px berlaku untuk layout tablet; di desktop kontrol 30–40 px boleh karena dipakai dengan mouse.

### 4.3 Radius

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--cb-radius-xs` | 3–4 | Checkbox, kbd, swatch legend, badge "Soon" |
| `--cb-radius-sm` | 6 | Item sidebar, opsi dropdown, tombol ghost |
| `--cb-radius-md` | 8 | **Default**: tombol, input, kartu langkah, logo |
| `--cb-radius-lg` | 10 | Blok isi case, kartu to-do, segmented control |
| `--cb-radius-xl` | 12 | Kartu halaman, panel, picker |
| `--cb-radius-2xl` | 14 | Dialog |
| `--cb-radius-full` | 999 / 50% | Chip, pill, avatar, titik status |

### 4.4 Bayangan

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--cb-shadow-card` | `0 8px 24px rgba(22,24,29,.06)` | Kartu preview (Sign in) |
| `--cb-shadow-pop` | `0 12px 28px rgba(22,24,29,.14)` | Dropdown, popover |
| `--cb-shadow-dialog` | `0 24px 64px rgba(22,24,29,.28)` | Dialog |
| `--cb-shadow-segment` | `0 1px 2px rgba(22,24,29,.08)` | Opsi aktif segmented control |
| Overlay dialog | `rgba(22,24,29,.45)` | Latar di belakang dialog |

Kartu biasa **tidak** memakai bayangan; cukup border `--cb-border`.

---

## 5. Ikon

- Gaya garis (stroke) 24×24 viewBox, `stroke-width` 2 (2.2 untuk ikon kecil/tebal), ujung bulat. Di kode pakai **Lucide** (sesuai arsitektur).
- Ukuran: 14 (dalam tombol kecil/chevron), 16 (default), 18 (top bar, logo).
- Ikon dekoratif selalu `aria-hidden="true"`. Tombol yang hanya berisi ikon wajib punya `aria-label`.
- Tidak memakai emoji sebagai ikon.

---

## 6. Layout

### 6.1 App shell

- **Top bar** navy `#1A3651`, tinggi ±58 (padding 10 × 24), tanpa border. Isi: logo (kotak aksen + teks putih), chip nama workspace aktif (read-only), project switcher (border `#2A4A6B`, teks putih), search global (latar `#EAF0F6`, maks. 380, shortcut `/`), tombol notifikasi (border `#2A4A6B`, ikon `#E4ECF3`), avatar.
- **Tab project** di pita navy yang sama, dipisah garis atas `#2A4A6B`: OVERVIEW · TO-DO · MILESTONES · TEST RUNS & RESULTS · TEST CASES · REPORTS. Teks 13/600 UPPERCASE, letter-spacing 0.06em, `#B8C7D6`; tab aktif putih 700 + garis bawah 3 px putih.
- **Latar halaman** `#EAF0F6`; kartu dan panel isi putih di atasnya.
- **Panel samping** (pohon section, folder, template report) `#D2DEEA` dengan border kanan `#C3D3E2`.
- **Sign in:** panel kiri memakai navy header dengan teks putih / `#C5D2DE`; kartu preview tetap putih.
- **Kontainer halaman** maks. 1280 dengan padding 24 untuk halaman berbasis kartu (Dashboard). Layar kerja (Test Cases, Test Run) memakai lebar penuh.

### 6.2 Split view (Test Cases dan Test Run)

| Kolom | Test Cases | Test Run |
| --- | --- | --- |
| Kiri | Pohon section dengan jumlah case, `flex: 1 1 220px`, latar `#D2DEEA` | Daftar folder, `flex: 0 0 248px`, latar `#D2DEEA`, **hanya ikon + nama folder** |
| Tengah | Daftar case, `flex: 3 1 440px` | Judul folder + jumlah + "x / y executed", toolbar, daftar test, `flex: 3 1 420px` |
| Kanan | Detail case, `flex: 4 1 520px` | Detail test, `flex: 4 1 540px` |

- Item terpilih di daftar tengah: latar `--cb-accent-tint-2` + garis kiri `inset 3px 0 0 var(--cb-accent)` + teks 600.
- Item terpilih di panel samping: latar putih + garis kiri `inset 3px 0 0 #1A3651` + teks navy 600.
- Klik item hanya mengganti isi kolom kanan.
- URL ikut berubah (`?case=C1047`, `?test=T-2317`) supaya bisa dibagikan **(rekomendasi)**.
- Di layar < 1024 px kolom kanan menjadi sheet yang menutupi daftar, dengan tombol kembali **(rekomendasi)**.

### 6.3 Dialog

| Dialog | Lebar maks. | Isi |
| --- | --- | --- |
| Add test case | 720 | Satu kolom: field, Preconditions (kuning), Steps (biru), Expected result (hijau) |
| Add Test Run | 1120 | Dua kolom: Run details (≤ 320) · Cases to include (picker) |

- Tinggi maks. `100vh − 48`; isi di-scroll, header dan footer tetap.
- Header: judul 18/700 + subjudul nama project + tombol tutup (ikon X, `aria-label="Close dialog"`).
- Footer `#FAFBFC`: teks bantuan di kiri (alasan tombol nonaktif / ringkasan), lalu Cancel (ghost) · aksi sekunder (outline) · aksi utama (primary).
- `role="dialog"`, `aria-modal="true"`, fokus pertama di field pertama, Esc menutup, fokus kembali ke tombol pembuka.

### 6.4 Responsif

- Desain utama 1440 px; optimal ≥ 1280.
- Semua baris kontrol memakai `flex-wrap`; grid kartu `repeat(auto-fill, minmax(300px, 1fr))`.
- Tabel lebar (report Failed & Blocked) di dalam kotak `overflow-x: auto` dengan `min-width`.

---

## 7. Komponen

### 7.1 Button

| Varian | Tampilan | Contoh |
| --- | --- | --- |
| Primary | Latar aksen, teks putih 600, tanpa border | Sign in, Create & start run, Save & next test |
| Secondary (outline) | Putih, border `#D5D9E0`, teks `#16181D` 600 | Save as Draft, Copy link, Edit run, Review |
| Ghost | Transparan, teks `#3A3F4A` 600 | Cancel, Clear |
| Icon | 38×38, border `#E3E6EB`, radius 8 | Notifikasi |
| Destruktif | Latar `#B42323`, teks putih 600 (6.6:1); nonaktif `#D9A3A3` sampai catatan diisi | Return to Draft, Delete |

- Tinggi 40 (default), 30–32 (kecil). Padding horizontal 14–16. Ikon 16 di kiri, gap 8.
- Disabled: primary `#A7BFD8`, secondary teks `#8A93A3`; selalu sertakan alasan di dekatnya.
- Label diawali kata kerja: "Add case", "Send for review", "Create & start run".

### 7.2 Input, select, textarea

- Border 1 px `#C9CED6`, radius 8, latar putih, padding 0 12 (textarea 10 × 12).
- Label di atas, 500. Penanda wajib `*` warna `#A11F1F`. Opsional ditulis "(optional)" warna `#636A78`.
- Search: ikon kaca pembesar di kiri, tanpa border dalam; di top bar latar `#EAF0F6`, di toolbar latar putih.
- Focus: `outline: 2px solid var(--cb-accent); outline-offset: 2px` (`:focus-visible`).
- Select **Workspace Name** (form Register): tinggi 44, gaya sama dengan input, opsi pertama "Select a workspace" (nilai kosong, wajib dipilih).

### 7.3 Checkbox

- Native checkbox 16–18 px dengan `accent-color: var(--cb-accent)` untuk form biasa.
- **Tri-state** (pohon section di picker): kotak 16 px, border 1.5 `#AEB6C4`, radius 4. Tercentang = latar aksen + centang putih. Sebagian = latar aksen + garis "–". Pakai `role="checkbox"` + `aria-checked="true|false|mixed"`.

### 7.4 Chip status dan badge

- **Chip status:** pill radius 999, padding 2–3 × 10, 12/600, titik 6–8 px di kiri. Warna dari tabel 2.4–2.6.
- **Badge jumlah:** pill `#DCE2EC` / `#2F343D`, 11–12/600 (mis. jumlah test di folder).
- **Badge terpilih di pohon:** latar aksen, teks putih, format "3/10".
- **Tab filter status** (Test Cases: All / Draft / Under Review / Approved): pill border `#D5D9E0`; aktif = latar `#16181D`, teks putih. Pakai `aria-pressed`.
- **Chip filter priority** (picker): 28 tinggi, border `#D5D9E0`; aktif = border aksen, latar `#E4EEF8`, teks `#1F4F82`, titik warna priority (High `#C62828`, Medium `#E08A00`, Low `#8A93A3`). Pakai `aria-pressed`.
- **Chip pilihan (picker):** putih, border `#C9D9EA`, teks `#1F4F82`, tombol × bulat 20 px.

### 7.5 Dropdown status inline (daftar test)

- Tombol 124×30, latar/teks/border sesuai status, titik + label + chevron.
- Menu 168 lebar, radius 10, `--cb-shadow-pop`; tiap opsi 32 tinggi dengan titik, label, dan kbd shortcut di kanan.
- `aria-haspopup="true"`, `aria-expanded`, `aria-label="Status T-2317: Failed. Change status"`.

### 7.6 Progress bar bertumpuk

- Tinggi 4 (mini), 6–8 (kartu), 10 (preview), 18 (report). Radius setengah tinggi, latar `#E9ECF1`, `overflow: hidden`.
- Segmen berurutan Passed → Failed → Blocked → Retest → Untested.
- Selalu disertai angka (persentase atau "x / y executed") dan legend di layar yang sama.

### 7.7 Ringkasan run

- **Donut** 168 px, cincin 30 px (`conic-gradient`), total di tengah (26/700 + "total tests").
- **Legend** grid: titik 14 px, "205 Passed" 600, keterangan "% of all tests" 12.
- **Kartu % passed:** angka 56/700 `#146C38`, label "passed", jumlah untested, bar mini, "% executed (n tests)".
- **Chip status run** di judul + petunjuk (mis. "Turns Done automatically once the remaining 4 tests have a final result").

### 7.8 Kartu

- Putih, border 1 `#E3E6EB`, radius 12, padding 18–20, tanpa bayangan.
- Kartu project: kotak warna project 10 px + nama 16/600, deskripsi 13, chip jumlah run aktif, progress bar 8, baris bawah jumlah case + ringkasan.
- Kartu KPI (report): label 13 `#5A6170`, angka 30/700, keterangan 12.

### 7.9 Blok isi case

Lihat warna di 2.7. Struktur: kotak radius 10 dengan border, header 10 × 16 (ikon 16 + judul 13/600, jumlah di kanan untuk Steps), lalu isi 14 × 16. Urutan tetap: **Detail → Preconditions → Steps → Expected result**. Di Test Run ada keterangan "Case snapshot from when the run was created" di bawahnya.

### 7.10 Daftar (list row)

- Grid kolom tetap, contoh daftar test: `62px · 1fr · 28px · 128px` (ID, judul + sub, avatar, status).
- ID memakai JetBrains Mono 12 `#5A6170`. Judul 500 (600 bila terpilih); sub 12 `#636A78`.
- Header grup (folder induk): latar `#EAF0F6`, 13/600, badge jumlah, bar mini 64×6, ringkasan di kanan.
- Garis antar baris `#EEF0F3`.

### 7.11 Pohon section / folder

- Baris 38 tinggi, padding 8, sub-level menjorok +20 px. Setiap baris punya ikon folder 16 px (terbuka/tertutup), dan chevron 16 px yang berputar 90° saat terbuka (`aria-expanded`) hanya untuk baris yang punya anak. Chevron adalah tombol sendiri (hanya buka/tutup); klik nama memilih section dan membukanya. Garis pemandu vertikal 1 px `--cb-sidebar-guide` di bawah chevron setiap level induk. Nama panjang dipotong dengan ellipsis dan tampil penuh lewat `title`.
- Ikon folder kuning terisi (`--cb-folder` `#F5C645`, garis `--cb-folder-edge` `#C99A1E`). Toolbar: judul + tombol berlabel "Add section"; di bawahnya ringkasan "N sections · M cases" (hanya bila ada jumlah).
- Ikon folder 16 garis. Di panel samping navy-abu, item aktif = latar putih, teks `#1A3651` 600, garis kiri 3 px `#1A3651`; angka jumlah `#4B5566`. Di picker dialog (latar `#F7F8FA`) item aktif memakai tint aksen `#E2ECF6`.
- Di Test Run cukup nama folder (tanpa angka atau bar). Di Test Cases dan picker boleh ada jumlah.

### 7.12 Segmented control dan tab filter

- Wadah `#E9ECF1`, radius 10, padding 4, gap 4. Opsi 32 tinggi, radius 7; aktif = putih + `--cb-shadow-segment` + 600.
- Pakai `role="radiogroup"` / `role="radio"` + `aria-checked`. Jumlah ditampilkan kecil di kanan label.

### 7.13 Riwayat hasil dan form Add result

- Riwayat di atas form, terbaru di atas. Tiap entri: avatar, nama, waktu, chip status, komentar, thumbnail evidence 112 lebar (klik membuka lightbox).
- Form: tombol status P/F/B/R (tinggi 44, radius 10, warna sesuai status saat dipilih, `aria-pressed`), satu field **Comment & evidence** (teks + paste/drag gambar + tombol "Attach image"), keterangan "x / 10 images · max 10 MB", tombol Save & next test (primary, dengan kbd) dan Save.
- Tidak ada field build/versi atau defect ID.

### 7.14 Avatar

Lingkaran, inisial 2 huruf 600. Ukuran 26 (list, 10 px teks), 32 (feed, 12 px), 38 (top bar). Warna per orang dari 2.8, ditentukan dari user id agar tetap.

### 7.15 Empty state dan info

- Empty state: teks 13–14 `#5A6170` di tengah, padding 32, plus satu aksi bila ada (mis. "Add case").
- Info box: radius 10, padding 10 × 14, ikon 16 di kiri, 13. Hijau untuk aturan positif (only Approved), abu untuk netral, kuning untuk peringatan (return note).

---

## 8. Motion

| Token | Nilai | Dipakai untuk |
| --- | --- | --- |
| `--cb-ease-out` | `ease-out` | Masuk (rise, fade, pop) |
| `--cb-ease-fill` | `cubic-bezier(.2,.7,.2,1)` | Progress bar terisi |
| `--cb-dur-fast` | 150–200 ms | Hover, buka dropdown **(rekomendasi)** |
| `--cb-dur-base` | 400–600 ms | Elemen masuk |
| `--cb-dur-fill` | 1000 ms | Progress bar |

Keyframes yang sudah dipakai di Sign in:

| Nama | Efek |
| --- | --- |
| `cbRise` | opacity 0→1 + translateY 14→0 |
| `cbFade` | opacity 0→1 |
| `cbPop` | scale .4→1.15→1 (logo, centang) |
| `cbFill` | `clip-path` inset kanan 100%→0 (progress bar) |
| `cbFloat` | translateY 0→−6→0, 6 s, berulang (kartu preview) |
| `cbPulse` | ring hijau melebar (titik "run in progress") |

Aturan:

- Animasi masuk hanya di halaman Sign in dan saat dialog dibuka/ditutup. Layar kerja tidak memakai animasi dekoratif.
- Urutan bertahap (stagger) 100 ms, total selesai ±1,5 detik.
- Wajib: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`.

---

## 9. Bahasa dan penulisan (UI copy)

- **Bahasa Inggris** untuk semua label, status, pesan sistem. Isi buatan user (judul case, langkah, catatan) tidak diterjemahkan.
- **Sentence case**, tapi nama status dan objek produk diawali huruf besar: Draft, Under Review, Approved, Active, Done, Test Run, Test Plan, Milestone.
- Tombol diawali kata kerja: Add, Save, Send, Create, Return, Copy, Export.
- Waktu relatif: "just now", "25 minutes ago", "1 hour ago", "yesterday", lalu tanggal "5 Nov 2026, 14:12" (24 jam).
- Jumlah memakai bentuk jamak yang benar: "1 case" / "5 cases".
- Format angka gaya Inggris: 1,200 · Rp 150,000.
- Pesan kosong dan alasan nonaktif ditulis sebagai kalimat lengkap dengan titik: "Select at least 1 case."

---

## 10. Aksesibilitas (checklist)

- [ ] Kontras teks ≥ 4.5:1 (lihat 2.9); elemen non-teks ≥ 3:1.
- [ ] Status selalu punya label teks, bukan warna saja.
- [ ] Semua kontrol bisa dipakai keyboard; `:focus-visible` terlihat (ring aksen 2 px).
- [ ] Tombol ikon punya `aria-label`; SVG dekoratif `aria-hidden`.
- [ ] Dialog: `role="dialog"`, `aria-modal`, focus trap, Esc menutup.
- [ ] Checkbox tri-state memakai `aria-checked="mixed"`; tab/segmented memakai role radio/tab yang benar.
- [ ] Item terpilih di list memakai `aria-current="true"`.
- [ ] Animasi mati saat `prefers-reduced-motion`.
- [ ] Shortcut keyboard (P, F, B, R, N, `/`) tidak aktif saat fokus di input teks.

---

## 11. Token siap pakai

### 11.1 `styles/tokens.css`

```css
:root {
  /* neutral */
  --cb-bg: #EAF0F6;
  --cb-surface: #FFFFFF;
  --cb-surface-subtle: #FAFBFC;
  --cb-surface-muted: #F7F8FA;
  --cb-border: #E3E6EB;
  --cb-border-subtle: #EEF0F3;
  --cb-border-strong: #D5D9E0;
  --cb-border-input: #C9CED6;
  --cb-track: #E9ECF1;
  --cb-text: #16181D;
  --cb-text-secondary: #3A3F4A;
  --cb-text-muted: #5A6170;
  --cb-text-subtle: #636A78;
  --cb-text-disabled: #8A93A3;

  /* header & sidebar (navy theme) */
  --cb-header: #1A3651;
  --cb-header-line: #2A4A6B;
  --cb-header-text: #FFFFFF;
  --cb-header-text-muted: #B8C7D6;
  --cb-header-icon: #E4ECF3;
  --cb-header-search: #EAF0F6;
  --cb-header-badge: #F2B705;
  --cb-sidebar: #D2DEEA;
  --cb-sidebar-line: #C3D3E2;
  --cb-sidebar-text-2: #4B5566;
  --cb-sidebar-guide: #8CA4BC;

  /* accent */
  --cb-accent: #2B6CB0;
  --cb-accent-hover: #1F4F82;
  --cb-accent-tint: #E4EEF8;
  --cb-accent-tint-2: #EDF3FA;
  --cb-accent-tint-3: #F3F7FB;
  --cb-accent-disabled: #A7BFD8;

  /* danger */
  --cb-danger: #B42323;
  --cb-danger-disabled: #D9A3A3;
  --cb-danger-text: #A11F1F;

  /* test result status: dot / bg / fg / border */
  --cb-passed: #34A865;   --cb-passed-bg: #E3F5EA;   --cb-passed-fg: #146C38;   --cb-passed-border: #B7E2C6;
  --cb-failed: #C62828;   --cb-failed-bg: #FDE8E8;   --cb-failed-fg: #A11F1F;   --cb-failed-border: #F0C2C2;
  --cb-blocked: #4B5160;  --cb-blocked-bg: #E6E8EC;  --cb-blocked-fg: #2F343D;  --cb-blocked-border: #C9CED6;
  --cb-retest: #F2B705;   --cb-retest-bg: #FFF3D6;   --cb-retest-fg: #7A4D00;   --cb-retest-border: #F3DCA0;
  --cb-untested: #D5D9E0; --cb-untested-bg: #FFFFFF; --cb-untested-fg: #4B5160; --cb-untested-border: #D5D9E0;
  --cb-retest-line: #D49B00;

  /* case review status */
  --cb-draft-bg: #ECEEF2;  --cb-draft-fg: #3A3F4A;  --cb-draft-dot: #8A93A3;
  --cb-review-bg: #FFF3D6; --cb-review-fg: #8A5300; --cb-review-dot: #E0A100;
  --cb-approved-bg: #E3F5EA; --cb-approved-fg: #146C38; --cb-approved-dot: #1E8449;

  /* run status */
  --cb-run-active-bg: #E4EEF8; --cb-run-active-fg: #1F4F82;
  --cb-run-done-bg: #E3F5EA;   --cb-run-done-fg: #146C38;

  /* case content blocks: bg / header / border / title */
  --cb-pre-bg: #FFFAEE;   --cb-pre-head: #FDF1D3;   --cb-pre-border: #F0D9A2;   --cb-pre-title: #7A4E00;
  --cb-steps-bg: #F3F7FB; --cb-steps-head: #E2ECF6; --cb-steps-border: #C9D9EA; --cb-steps-title: #1F4F82;
  --cb-exp-bg: #F3FBF6;   --cb-exp-head: #E3F5EA;   --cb-exp-border: #B7E2C6;   --cb-exp-title: #146C38;

  /* case list & detail (canvas 03) */
  --cb-priority-high: #C62828;
  --cb-priority-medium: #E08A00;
  --cb-priority-low: #8A93A3;
  --cb-row-checked: #F5F8FC;
  --cb-pending-bg: #FFFAEB;
  --cb-pending-fg: #6B4100;
  --cb-success-bg: #EEF9F2;
  --cb-detail-bg: #F7F8FA;   --cb-detail-head: #EEF0F3;   --cb-detail-border: #DDE1E7;   --cb-detail-title: #3A3F4A;
  --cb-pre-text: #3D2E0A;    --cb-pre-input-border: #E5CE94;
  --cb-exp-text: #1D3B28;    --cb-exp-input-border: #A9D8B9;
  --cb-step-card-border: #DCE6F0;
  --cb-step-num-bg: #F0F2F5;
  --cb-bulkbar: #16181D;     --cb-bulkbar-border: #3A3F4A;   --cb-bulkbar-muted: #C9CED6;   --cb-bulkbar-danger: #FFB4B4;

  /* radius */
  --cb-radius-xs: 4px;
  --cb-radius-sm: 6px;
  --cb-radius-md: 8px;
  --cb-radius-lg: 10px;
  --cb-radius-xl: 12px;
  --cb-radius-2xl: 14px;

  /* shadow */
  --cb-shadow-card: 0 8px 24px rgba(22, 24, 29, 0.06);
  --cb-shadow-pop: 0 12px 28px rgba(22, 24, 29, 0.14);
  --cb-shadow-dialog: 0 24px 64px rgba(22, 24, 29, 0.28);
  --cb-shadow-segment: 0 1px 2px rgba(22, 24, 29, 0.08);
  --cb-overlay: rgba(22, 24, 29, 0.45);

  /* type */
  --cb-font-sans: Inter, system-ui, sans-serif;
  --cb-font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* motion */
  --cb-ease-fill: cubic-bezier(0.2, 0.7, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

### 11.2 `tailwind.config` (potongan)

```ts
theme: {
  extend: {
    colors: {
      bg: 'var(--cb-bg)',
      header: { DEFAULT: 'var(--cb-header)', line: 'var(--cb-header-line)', muted: 'var(--cb-header-text-muted)' },
      sidebar: { DEFAULT: 'var(--cb-sidebar)', line: 'var(--cb-sidebar-line)' },
      surface: { DEFAULT: 'var(--cb-surface)', subtle: 'var(--cb-surface-subtle)', muted: 'var(--cb-surface-muted)' },
      border: { DEFAULT: 'var(--cb-border)', subtle: 'var(--cb-border-subtle)', strong: 'var(--cb-border-strong)', input: 'var(--cb-border-input)' },
      ink: { DEFAULT: 'var(--cb-text)', secondary: 'var(--cb-text-secondary)', muted: 'var(--cb-text-muted)', subtle: 'var(--cb-text-subtle)' },
      accent: { DEFAULT: 'var(--cb-accent)', hover: 'var(--cb-accent-hover)', tint: 'var(--cb-accent-tint)' },
      passed: { DEFAULT: 'var(--cb-passed)', bg: 'var(--cb-passed-bg)', fg: 'var(--cb-passed-fg)' },
      failed: { DEFAULT: 'var(--cb-failed)', bg: 'var(--cb-failed-bg)', fg: 'var(--cb-failed-fg)' },
      blocked: { DEFAULT: 'var(--cb-blocked)', bg: 'var(--cb-blocked-bg)', fg: 'var(--cb-blocked-fg)' },
      retest: { DEFAULT: 'var(--cb-retest)', bg: 'var(--cb-retest-bg)', fg: 'var(--cb-retest-fg)' },
      untested: { DEFAULT: 'var(--cb-untested)', fg: 'var(--cb-untested-fg)' },
    },
    borderRadius: { xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px', '2xl': '14px' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'monospace'] },
    boxShadow: {
      card: 'var(--cb-shadow-card)', pop: 'var(--cb-shadow-pop)',
      dialog: 'var(--cb-shadow-dialog)', segment: 'var(--cb-shadow-segment)',
    },
  },
}
```

---

## 12. Tema gelap (rencana P1)

Belum didesain. Saat dibuat: definisikan ulang token netral dan blok isi case di `[data-theme="dark"]`, pertahankan hue warna status (boleh dinaikkan kecerahannya agar kontras ≥ 4.5:1), dan cek ulang tabel 2.9.

---

## 13. Riwayat perubahan

| Tanggal | Perubahan |
| --- | --- |
| 6 Nov 2026 | Versi pertama dari design canvas: token warna, status, blok isi case, tipografi, layout split view, dialog, komponen, motion, aturan bahasa Inggris |
| 6 Nov 2026 | Tema navy ala TestRail: header + tab project navy `#1A3651`, tab uppercase, latar halaman `#EAF0F6`, panel samping `#D2DEEA`, aksen biru baja `#2B6CB0` (sebelumnya `#2453D4`), tint biru disesuaikan, badge notifikasi kuning, panel brand Sign in navy. Warna status tidak berubah |
| 6 Nov 2026 | Token tambahan dari canvas Test Cases (priority, baris tercentang, banner pending, blok Detail, bulk bar). Warna priority Medium disamakan dengan canvas: `#E08A00` (sebelumnya `#E0A100`, terlalu dekat dengan warna Under Review) |
| 6 Nov 2026 | Pohon section: ikon folder di semua level, chevron terpisah, garis pemandu vertikal (token `--cb-sidebar-guide`), baris lebih tinggi |
| 9 Nov 2026 | Daftar case dikelompokkan per section: judul section + badge jumlah, satu tabel per section, sub-section menjorok 20 px dengan garis pemandu `--cb-sidebar-guide`; quick add di bawah tabel section terpilih |
