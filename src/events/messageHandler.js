import { serialize } from '../lib/serializer.js';

export default async function handleMessagesUpsert(sock, messages, commands, games, config, logger) {
    const msg = messages[0];
    if (!msg?.message) return;
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid.endsWith('@status') || msg.key.remoteJid === 'status@broadcast') return;

    const serialized = await serialize(msg, sock);
    if (!serialized.body || typeof serialized.body !== 'string') return;

    const prefix = config?.prefix?.toLowerCase() ?? '!';
    if (!serialized.body.toLowerCase().startsWith(prefix)) return;

    const [cmd, ...args] = serialized.body.slice(prefix.length).trim().split(/\s+/);
    if (!cmd) return;

    const command = commands[cmd.toLowerCase()];
    if (!command) return
    
    const isOwner = config.owners.includes(serialized.sender) || serialized.isSelf;
    logger.info(`Pesan masuk: ${serialized.body}, dari: ${serialized.sender} ${isOwner ? '(owner)' : ''}`);

    if (command.owner && !isOwner) {
        await serialized.reply('Maaf, perintah ini cuma buat owner');
        return;
    }

    const isGroup = serialized.isGroup;
    if (command.groupOnly && !isGroup) {
        await serialized.reply('Perintah ini cuma bisa dipake di grup!');
        return;
    }

    try {
        await command.exec({ sock, msg: serialized, args, games, commands: Object.values(commands), isOwner, isGroup });
    } catch (err) {
        logger.error(`Gagal jalanin perintah ${cmd}:`, err);
        await serialized.reply('Ups, ada error nih. Coba lagi nanti ya!');
    }
}