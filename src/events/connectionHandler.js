import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { DisconnectReason } from '@whiskeysockets/baileys';

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export default async function handleConnectionUpdate(sock, update, runBot, paths) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
        console.log('Bikin QR code...');
        try {
            const qrText = await QRCode.toString(qr, { type: 'terminal', small: true });
            console.log('QR Code di terminal:');
            console.log(qrText);
        } catch (err) {
            console.log(`Gagal bikin QR: ${err.message}`);
        }
    }

    if (connection === 'open') {
        console.log('Bot connect!');
        try {
            if (sock.user?.id) {
                if (typeof sock.sendPresenceUpdate === 'function') {
                    await sock.sendPresenceUpdate('available', sock.user.id);
                    console.log('Presence update sukses!');
                } else {
                    console.log('Fungsi sendPresenceUpdate ga tersedia, skip presence update');
                }
            } else {
                console.log('User ID ga ada, skip presence update');
            }
        } catch (err) {
            console.log(`Gagal update presence: ${err.message}`);
        }
        reconnectAttempts = 0;
    }

    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        let shouldReconnect = false;

        if (statusCode === DisconnectReason.loggedOut) {
            console.log('Keluar, scan QR lagi!');
        } else if (statusCode === DisconnectReason.badSession) {
            console.log('Sesi rusak, bersihin auth...');
            try {
                const authPath = path.join(paths.authInfo);
                await fs.rm(authPath, { recursive: true, force: true });
                console.log('Auth dibersihin');
            } catch (err) {
                console.log(`Gagal bersihin auth: ${err.message}`);
            }
        } else if (statusCode === DisconnectReason.connectionLost) {
            console.log('Koneksi ilang, reconnect...');
            shouldReconnect = true;
        } else {
            console.log(`Putus: ${lastDisconnect?.error?.message || 'nggak tahu kenapa'}, reconnect...`);
            shouldReconnect = true;
        }

        if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 30000);
            console.log(`Coba reconnect ke-${reconnectAttempts} dalam ${delay / 1000} detik...`);
            setTimeout(async () => {
                try {
                    await runBot();
                    console.log('Reconnect sukses!');
                } catch (err) {
                    console.log(`Gagal reconnect: ${err.message}`);
                }
            }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('Udah max reconnect, bot berhenti');
        }
    }
}
