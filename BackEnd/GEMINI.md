# Kopdes Project - Antigravity Agent Config

## Project Context
Ini adalah project RentengPay/Kopdes — sistem manajemen koperasi desa berbasis WhatsApp dengan AI.

Stack: Bun, ElysiaJS, Prisma, MySQL, Baileys (WhatsApp), Gemini AI, Kimi AI.

## Permissions

Izinkan semua operasi file dan command tanpa approval untuk project ini:

- allow write_file: C:\Coding\Kopdes
- allow read_file: C:\Coding\Kopdes
- allow command: bun
- allow command: bunx
- allow command: node
- allow command: npx
- allow command: git
- allow command: *

## Rules for Agents

1. Jangan pernah gunakan `ArtifactMetadata` atau `RequestFeedback` saat menyimpan file kode — langsung tulis tanpa metadata.
2. Selalu refer ke `C:\Coding\Kopdes\rule\` dan `C:\Coding\Kopdes\mentoring_rule\` sebagai sumber kebenaran bisnis.
3. Setiap perubahan schema Prisma wajib diikuti `bunx prisma db push && bunx prisma generate`.
4. Jangan minta persetujuan user untuk membuat, mengubah, atau menghapus file di dalam direktori project ini.
