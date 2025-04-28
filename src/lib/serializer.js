import { getContentType, areJidsSameUser } from '@whiskeysockets/baileys';
import fs from 'fs/promises';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

export async function serialize(message, sock) {
    const msg = Object.assign({}, message);
    const userJid = sock.user?.id || '';

    msg.type = getContentType(msg.message) || 'conversation';
    msg.from = msg.key.remoteJid;
    msg.sender = msg.key.participant || msg.key.remoteJid;
    msg.isGroup = msg.key.remoteJid.endsWith('@g.us');
    msg.isSelf = msg.key.fromMe;
    msg.timestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date();

    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo;
        if (quoted?.quotedMessage) {
            msg.quoted = {
                message: quoted.quotedMessage,
                type: getContentType(quoted.quotedMessage),
                sender: quoted.participant,
                id: quoted.stanzaId,
                isSelf: areJidsSameUser(quoted.participant, userJid),
                from: quoted.remoteJid || msg.from,
            };
            msg.quoted.text = extractMessageContent(quoted.quotedMessage, msg.quoted.type);
            msg.quoted.mentionedJid = quoted.mentionedJid || [];
            msg.quoted.isBot = msg.quoted.sender.endsWith('@s.whatsapp.net') && msg.quoted.sender.split('@')[0].endsWith('bot');
            msg.quoted.reply = (text, options) => sock.sendMessage(msg.from, { text, ...options }, { quoted: msg });
            msg.quoted.delete = () => sock.sendMessage(msg.from, { delete: msg.quoted.key });
            msg.quoted.download = (path) => downloadMedia(msg.quoted.message, path, sock);
            msg.quoted.forward = (to) => sock.copyForwardMessage(to, msg.quoted.message);
        } else {
            msg.quoted = null;
        }
    } catch {
        msg.quoted = null;
    }

    msg.body = extractMessageContent(msg.message, msg.type);
    msg.mentionedJid = msg.message?.[msg.type]?.contextInfo?.mentionedJid || [];

    if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(msg.type)) {
        msg.media = {
            type: msg.type.replace('Message', ''),
            mimetype: msg.message[msg.type]?.mimetype,
            size: msg.message[msg.type]?.fileLength,
            caption: msg.message[msg.type]?.caption || '',
            url: msg.message[msg.type]?.url,
        };
    }

    if (['buttonsMessage', 'listMessage'].includes(msg.type)) {
        msg.button = {
            title: msg.message[msg.type]?.title,
            description: msg.message[msg.type]?.description,
            buttons: msg.message[msg.type]?.buttons || msg.message[msg.type]?.sections,
        };
    }

    if (msg.type === 'paymentMessage') {
        msg.payment = {
            amount: msg.message.paymentMessage?.amount,
            currency: msg.message.paymentMessage?.currency,
        };
    }

    if (msg.type === 'pollMessage') {
        msg.poll = {
            name: msg.message.pollMessage?.name,
            options: msg.message.pollMessage?.options,
        };
    }

    msg.reply = (text, options) => sock.sendMessage(msg.from, { text, ...options }, { quoted: msg });
    msg.download = (path) => downloadMedia(msg.message, path, sock);
    msg.forward = (to) => sock.copyForwardMessage(to, msg.message);
    msg.react = (emoji) => sock.sendReaction(msg.from, emoji, msg.key);
    msg.delete = () => sock.sendMessage(msg.from, { delete: msg.key });
    msg.send = (content, options) => sock.sendMessage(msg.from, content, options);

    return msg;
}

async function downloadMedia(message, path, sock) {
    try {
        const buffer = await downloadMediaMessage(message, { logger: sock.logger });
        await fs.writeFile(path, buffer);
        return path;
    } catch (error) {
        return null;
    }
}

function extractMessageContent(message, type) {
    if (!message) {
        return '';
    }
    if (type === 'conversation') {
        return message.conversation || '';
    }
    const content = message[type];
    if (!content) {
        return '';
    }
    return (
        content.text ||
        content.caption ||
        content.description ||
        content.hydratedTemplate?.hydratedContentText ||
        (type === 'listResponseMessage' && content.singleSelectReply?.selectedRowId) ||
        (type === 'buttonsResponseMessage' && content.selectedButtonId) ||
        (type === 'templateButtonReplyMessage' && content.selectedId) ||
        (type === 'paymentMessage' && `Pembayaran: ${content.amount} ${content.currency}`) ||
        (type === 'pollMessage' && `Poll: ${content.name}`) ||
        ''
    );
}
