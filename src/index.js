import { useMultiFileAuthState, makeWASocket } from '@whiskeysockets/baileys';
import path from 'path';
import pino from 'pino';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import loadCommands from './lib/loader.js';
import config from '../config.json' with { type: 'json' };
import handleMessageUpsert from './events/messageHandler.js';
import handleConnectionUpdate from './events/connectionHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paths = {
    authInfo: path.join(__dirname, '../auth_info'),
    commands: path.join(__dirname, 'commands'),
};

const logger = pino({ level: 'info' });
const games = {};
const INACTIVE_TIMEOUT = (config?.inactiveTimeoutMinutes ?? 5) * 60 * 1000;

async function runBot() {
    try {
        await fs.mkdir(paths.authInfo, { recursive: true });
    } catch (err) {
        logger.error('Gagal bikin folder auth, cek izinnya dong:', err);
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState(paths.authInfo);
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
    });

    sock.ev.on('creds.update', saveCreds);

    let commands;
    try {
        commands = await loadCommands(paths.commands);
    } catch (err) {
        logger.error('Gagal load commands:', err);
        process.exit(1);
    }

    sock.ev.on('connection.update', async (update) => {
        await handleConnectionUpdate(sock, update, runBot, paths);
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        await handleMessageUpsert(sock, messages, commands, games, config, logger);
    });
    
    setInterval(() => {
        const now = Date.now();
        for (const [jid, game] of Object.entries(games)) {
            if (now - game.lastActivity > INACTIVE_TIMEOUT) {
                if (game.timer) clearInterval(game.timer);
                delete games[jid];
                sock.sendMessage(jid, { text: '⌛ Game dihentikan karena tidak aktif' });
            }
        }
    }, 60000);
}

runBot().catch(err => {
    logger.error('Gagal start bot:', err);
    process.exit(1);
});
