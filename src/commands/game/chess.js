import { Chess } from 'chess.js';
import { sendBoard } from '../../utils/board.js';

export default {
  name: 'chess',
  alias: ['catur'],
  category: 'game',
  desc: 'Permainan chess battle 10 menit',
  async exec({ sock, msg, args, games }) {
    const { sender, from, reply, mentionedJid } = msg;
    const [subCommand, ...subArgs] = args.map((arg) => arg.toLowerCase());
    const moveNotation = subCommand === 'move' ? subArgs.join(' ') : '';

    const formatTime = (ms) => {
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMention = (jid) => jid.split('@')[0];

    const checkGame = () => {
      const game = games[from];
      if (!game) throw new Error('Tidak ada game yang berjalan!');
      if (!game.players.includes(sender)) throw new Error('Kamu bukan peserta game ini!');
      return game;
    };

    const displayTimer = async (gameData, currentPlayer) => {
      const remaining = gameData.timeLeft[currentPlayer];
      if (remaining <= 60000) {
        await reply(`⏳ Waktu @${getMention(currentPlayer)} tersisa: ${formatTime(remaining)}`, {
          mentions: [currentPlayer],
        });
      }
    };

    try {
      if (!subCommand) {
        return reply(
          `♟️ *CHESS BATTLE* ♟️\n\n` +
            `Mulai: !chess play @lawan\n` +
            `Gerakan: !chess move e4\n` +
            `Undo: !chess undo\n` +
            `Lihat papan: !chess board\n` +
            `Menyerah: !chess resign\n` +
            `Bantuan: !chess help`
        );
      }

      switch (subCommand) {
        case 'play':
          if (games[from]) throw new Error('Sudah ada game yang berjalan!');
          if (!mentionedJid?.[0]) throw new Error('Tag lawan main! Contoh: !chess play @6281234567890');
          if (mentionedJid[0] === sender) throw new Error('Tidak bisa main sendiri!');
          if (mentionedJid[0].includes('bot')) throw new Error('Tidak bisa main melawan bot!');

          const game = new Chess();
          games[from] = {
            game,
            players: [sender, mentionedJid[0]],
            currentPlayer: sender,
            timeLeft: { [sender]: 10 * 60 * 1000, [mentionedJid[0]]: 10 * 60 * 1000 },
            lastActivity: Date.now(),
            moves: [],
            timer: setInterval(() => {
              const g = games[from];
              if (!g) return clearInterval(g.timer);

              g.timeLeft[g.currentPlayer] -= 1000;
              if (g.timeLeft[g.currentPlayer] <= 0) {
                clearInterval(g.timer);
                const winner = g.players.find((p) => p !== g.currentPlayer);
                reply(
                  `⏰ Waktu habis! @${getMention(g.currentPlayer)} kalah.\n` +
                    `🎉 @${getMention(winner)} menang!`,
                  { mentions: [winner] }
                );
                delete games[from];
              }
            }, 1000),
          };

          await sendBoard(
            sock,
            from,
            game,
            `Game dimulai! (10 menit)\n` +
              `Putih: @${getMention(sender)}\n` +
              `Hitam: @${getMention(mentionedJid[0])}\n\n` +
              `Giliran pertama: Putih (@${getMention(sender)})`,
            true,
            undefined,
            [sender, mentionedJid[0]]
          );
          break;

        case 'move':
          const gameData = checkGame();
          const currentColor = gameData.game.turn() === 'w' ? 'Putih' : 'Hitam';
          const expectedPlayer = currentColor === 'Putih' ? gameData.players[0] : gameData.players[1];
          if (sender !== expectedPlayer) {
            throw new Error(`Sekarang giliran @${getMention(expectedPlayer)} (${currentColor})!`);
          }
          if (!moveNotation) throw new Error('Masukkan gerakan! Contoh: !chess move e4');
          const result = gameData.game.move(moveNotation, { sloppy: true });
          if (!result) throw new Error(`Langkah "${moveNotation}" tidak valid! Contoh: e4, Nf3, O-O`);

          gameData.moves.push(result.san);
          gameData.lastActivity = Date.now();
          gameData.currentPlayer = gameData.players.find((p) => p !== sender);
          
          await reply(
            `@${getMention(sender)} melakukan: ${result.san}\n` +
              `Waktu tersisa: ${formatTime(gameData.timeLeft[sender])}`,
            { mentions: [sender] }
          );
          let caption = '';
          if (gameData.game.inCheck()) {
            caption += '♔ Posisi skak!\n';
          }
          await sendBoard(sock, from, gameData.game, caption);
          await displayTimer(gameData, gameData.currentPlayer);

          if (gameData.game.isCheckmate()) {
            clearInterval(gameData.timer);
            await reply(`♚ SKAKMAT! @${getMention(sender)} menang!`, { mentions: [sender] });
            delete games[from];
          } else if (gameData.game.isDraw()) {
            clearInterval(gameData.timer);
            await reply('🤝 Permainan remis!');
            delete games[from];
          }
          break;

        case 'undo':
          const undoGameData = checkGame();
          if (sender !== undoGameData.currentPlayer) {
            throw new Error('Hanya pemain yang baru bergerak bisa undo!');
          }
          if (!undoGameData.moves.length) throw new Error('Belum ada gerakan untuk di-undo!');

          undoGameData.game.undo();
          undoGameData.moves.pop();
          undoGameData.currentPlayer = sender;
          undoGameData.lastActivity = Date.now();

          await reply('Langkah terakhir dibatalkan.');
          await sendBoard(
            sock,
            from,
            undoGameData.game,
            `Giliran: @${getMention(sender)} (${undoGameData.game.turn() === 'w' ? 'Putih' : 'Hitam'})`,
            true,
            undefined,
            [sender]
          );
          break;

        case 'board':
          const boardGameData = checkGame();
          const currentPlayer = boardGameData.currentPlayer;
          const moves = boardGameData.moves.length ? `Gerakan: ${boardGameData.moves.join(', ')}\n` : '';
          await sendBoard(
            sock,
            from,
            boardGameData.game,
            `Giliran: @${getMention(currentPlayer)} (${boardGameData.game.turn() === 'w' ? 'Putih' : 'Hitam'})\n` +
              `Waktu tersisa: ${formatTime(boardGameData.timeLeft[currentPlayer])}\n` +
              moves,
            true,
            undefined,
            [currentPlayer]
          );
          await displayTimer(boardGameData, currentPlayer);
          break;

        case 'resign':
          const resignGameData = checkGame();
          const winner = resignGameData.players.find((p) => p !== sender);
          clearInterval(resignGameData.timer);
          await reply(
            `🏳️ @${getMention(sender)} menyerah!\n` +
              `🎉 @${getMention(winner)} menang!`,
            { mentions: [sender, winner] }
          );
          delete games[from];
          break;

        case 'help':
          await reply(
            `📘 *PANDUAN CATUR 10 MENIT*\n\n` +
              `• Notasi: e4, Nf3, Bb5+, O-O\n` +
              `• Timer: 10 menit/pemain\n` +
              `• !chess play @lawan - Mulai game\n` +
              `• !chess move [notasi] - Gerakan\n` +
              `• !chess undo - Batalkan gerakan\n` +
              `• !chess board - Lihat papan & waktu\n` +
              `• !chess resign - Menyerah`
          );
          break;

        default:
          throw new Error(`Sub-perintah "${subCommand}" tidak dikenal! Gunakan !chess help untuk panduan.`);
      }
    } catch (err) {
      await reply(err.message || 'Terjadi kesalahan saat menjalankan perintah catur.');
    }
  },
};
