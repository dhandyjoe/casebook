<div align="center">

<img src="apps/web/public/icon-512.png" alt="Casebook" width="96" />

# Casebook

**Test case management yang sederhana dan cepat.**

Tulis test case, jalankan Test Run, lalu lihat hasilnya dalam satu tempat.

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white)

</div>

---

## ✨ Fitur

- 📚 **Repository** — test case dalam section bertingkat, template Text dan Steps.
- ✅ **Review** — hanya case yang sudah di-approve yang masuk Test Run.
- ▶️ **Test Run** — isi Passed, Failed, Blocked, atau Retest langsung dari tabel.
- 📸 **Evidence** — lampirkan screenshot lewat upload, drag & drop, atau paste.
- 🎯 **Milestone** — pantau progres per rilis atau sprint.
- 📊 **Dashboard & Reports** — ringkasan progres, ekspor ke PDF.

## 🚀 Mulai

Butuh Node 22+ dan pnpm.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # isi config Firebase dan URL Worker
pnpm dev
```

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Jalankan web app |
| `pnpm build` | Build production |
| `pnpm test` | Jalankan semua test |
| `pnpm test:rules` | Test Firestore rules di emulator |

## 🧱 Stack

**Web** React 19 · Vite · Tailwind CSS &nbsp;|&nbsp; **Data** Firebase Auth · Firestore &nbsp;|&nbsp; **API** Cloudflare Workers · Hono &nbsp;|&nbsp; **Hosting** Cloudflare Pages

## 📁 Struktur

```
apps/web/      React SPA
apps/worker/   Cloudflare Worker
firebase/      Security rules dan index Firestore
```

## 📖 Dokumen

[PRD](prd.md) · [Arsitektur](architecture.md) · [Design](design.md)
