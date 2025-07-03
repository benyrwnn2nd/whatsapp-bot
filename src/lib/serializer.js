import { getContentType, areJidsSameUser } from '@whiskeysockets/baileys';
import axios from 'axios';
import fs from 'fs/promises';
import FormData from 'form-data';
import path from 'path';
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
            const quotedType = getContentType(quoted.quotedMessage);
            
            msg.quoted = {
                message: quoted.quotedMessage,
                type: quotedType,
                sender: quoted.participant,
                id: quoted.stanzaId,
                key: {
                    remoteJid: quoted.remoteJid || msg.from,
                    fromMe: areJidsSameUser(quoted.participant, userJid),
                    id: quoted.stanzaId
                },
                isSelf: areJidsSameUser(quoted.participant, userJid),
                from: quoted.remoteJid || msg.from,
            };
            
            if (quotedType) {
                msg.quoted.message[quotedType] = quoted.quotedMessage[quotedType];
            }
            
            msg.quoted.text = extractMessageContent(quoted.quotedMessage, msg.quoted.type);
            msg.quoted.mentionedJid = quoted.mentionedJid || [];
            msg.quoted.isBot = msg.quoted.sender.endsWith('@s.whatsapp.net') && msg.quoted.sender.split('@')[0].endsWith('bot');
            msg.quoted.reply = (text, options) => sock.sendMessage(msg.from, { text, ...options }, { quoted: msg });
            msg.quoted.delete = () => sock.sendMessage(msg.from, { delete: msg.quoted.key });
            
            msg.quoted.download = async (path) => {
                try {
                    console.log(`Downloading quoted ${msg.quoted.type}`);
                    if (!['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(msg.quoted.type)) {
                        console.error(`Unsupported quoted message type for download: ${msg.quoted.type}`);
                        return null;
                    }
                    const mediaMessage = {
                        message: {
                            [msg.quoted.type]: quoted.quotedMessage[msg.quoted.type]
                        },
                        key: msg.quoted.key,
                        participant: msg.quoted.sender
                    };
                    const buffer = await downloadMediaMessage(
                        mediaMessage,                          
                        'buffer',                              
                        {},                                     
                        { reuploadRequest: sock.updateMediaMessage } 
                    );
                    if (!buffer) {
                        console.error('Downloaded buffer is null or undefined');
                        return null;
                    }
                    console.log(`Media downloaded successfully, buffer size: ${buffer.length}`);
                    if (path) {
                        await fs.writeFile(path, buffer);
                        console.log(`Media saved to ${path}`);
                        return path;
                    }
                    return buffer;
                } catch (error) {
                    console.error('Error downloading quoted media:', error);
                    return null;
                }
            };
            
            msg.quoted.forward = (to) => sock.copyForwardMessage(to, { key: msg.quoted.key, message: quoted.quotedMessage });
        } else {
            msg.quoted = null;
        }
    } catch (error) {
        console.error('Error processing quoted message:', error);
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
    
    msg.download = async (path) => {
        try {
            console.log(`Downloading ${msg.type}`);
            if (!['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(msg.type)) {
                console.error(`Unsupported message type for download: ${msg.type}`);
                return null;
            }
            const buffer = await downloadMediaMessage(
                { message: msg.message, key: msg.key },
                'buffer', 
                {},
                { reuploadRequest: sock.updateMediaMessage } 
            );
            if (!buffer) {
                console.error('Downloaded buffer is null or undefined');
                return null;
            }
            console.log(`Media downloaded successfully, buffer size: ${buffer.length}`);
            if (path) {
                await fs.writeFile(path, buffer);
                console.log(`Media saved to ${path}`);
                return path;
            }
            return buffer;
        } catch (error) {
            console.error('Error downloading media:', error);
            return null;
        }
    };
    
    msg.forward = (to) => sock.copyForwardMessage(to, { key: msg.key, message: msg.message });
    msg.react = (emoji) => sock.sendReaction(msg.from, emoji, msg.key);
    msg.delete = () => sock.sendMessage(msg.from, { delete: msg.key });
    msg.send = (content, options) => sock.sendMessage(msg.from, content, options);

    return msg;
}

async function downloadMedia(message, path, sock) {
    try {
        const buffer = await downloadMediaMessage(message, { logger: sock.logger });
        if (path) {
            await fs.writeFile(path, buffer);
            return path;
        }
        return buffer;
    } catch (error) {
        console.error('Error in downloadMedia:', error);
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

export async function uploadUguu(filePath) {
    const form = new FormData();
    form.append('files[]', await fs.readFile(filePath), path.basename(filePath)); 
    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
    });
    return res.data.files[0].url;
}
