import ChessImageGenerator from 'chess-image-generator';

async function generateBoardImage(fen, theme = { light: '#eeeed2', dark: '#769656' }) {
  try {
    const generator = new ChessImageGenerator({
      size: 480,
      light: theme.light,
      dark: theme.dark,
      style: 'merida',
    });
    await generator.loadFEN(fen);
    return await generator.generateBuffer();
  } catch (err) {
    console.error('Terjadi kesalahan saat membuat gambar papan:', err);
    throw err;
  }
}

export async function sendBoard(sock, jid, game, caption = '', useImage = true, theme = { light: '#eeeed2', dark: '#769656' }, mentions = []) {
  try {
    if (useImage) {
      try {
        const buffer = await generateBoardImage(game.fen(), theme);
        await sock.sendMessage(jid, {
          image: buffer,
          caption: caption + `\nGiliran: ${game.turn() === 'w' ? 'Putih' : 'Hitam'}`,
          mimetype: 'image/png',
          mentions: mentions, 
        });
      } catch (imageErr) {
        console.error('Terjadi kesalahan saat membuat gambar papan:', imageErr);
        await sock.sendMessage(jid, { 
          text: `${caption}\n${game.ascii()}`,
          mentions: mentions, 
        });
      }
    } else {
      await sock.sendMessage(jid, { 
        text: `${caption}\n${game.ascii()}`,
        mentions: mentions, 
      });
    }
  } catch (err) {
    console.error('Gagal Mengirim Gambar', err);
    await sock.sendMessage(jid, { 
      text: `${caption}\nPosisi saat ini:\n${game.fen()}`,
      mentions: mentions, 
    });
  }
}
