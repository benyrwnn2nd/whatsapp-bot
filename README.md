# WhatsApp Bot

Bot WhatsApp simple menggunakan [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) yang bisa digunakan untuk membuat fitur perintah (command) di chat pribadi atau grup.

## Fitur
- Support multi-command system
- Struktur modular, mudah dikembangkan

## Persyaratan
- Node.js **v20.x.x** lebih stabil untuk install chess-image-generator 
- Git
- Akun WhatsApp aktif

## Instalasi

1. **Clone Repository**

```bash
git clone https://github.com/benyrwnn2nd/whatsapp-bot.git
cd whatsapp-bot

## Deploy ke Railway

Railway adalah platform gratis/murah untuk hosting Node.js app dengan mudah.

### 1. Fork Repository (Opsional)

Kalau mau lebih gampang update kodenya:

- Klik tombol `Fork` di [repo ini](https://github.com/benyrwnn2nd/whatsapp-bot)

### 2. Connect Railway

- Buka [Railway.app](https://railway.app/)
- Login atau daftar
- Klik **New Project** > **Deploy from GitHub Repo**
- Pilih repo `whatsapp-bot` kamu
- Railway akan otomatis detect Node.js project

### 3. Setting Environment

- Pastikan `Node.js Version` di Railway setting diset ke **20.x**
- Tambahkan file `config.json` di dalam Railway (karena Railway tidak clone file lokal).  
  Caranya:
    - Masuk ke tab **Variables** / **Environment**
    - Tambahkan variable manual kalau mau, atau push file lewat GitHub.

Atau lebih gampang, commit `config.json.example` di repo lalu Railway bisa baca default-nya.

Contoh isi `config.json`:

```json
{
  "inactiveTimeoutMinutes": 5
}
