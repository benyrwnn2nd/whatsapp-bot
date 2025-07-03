import axios from 'axios';

export default {
  name: 'x',
  alias: ['twdl', 'twitter'],
  category: 'downloader',
  desc: 'Mengunduh video atau gambar dari Twitter',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    const twUrl = args[0];
    try {
      const apiUrl = `https://api.nekorinn.my.id/downloader/twitter?url=${encodeURIComponent(twUrl)}`;
      const { data } = await axios.get(apiUrl);
      const { caption, author, stats, downloadUrl } = data.result;

      const captionBase = `*Caption:* ${caption || 'Tidak ada caption'}\n*Author:* ${author}\n*Likes:* ${stats.like}\n*Views:* ${stats.view}\n*Sumber:* Twitter\n*Tautan Asli:* ${twUrl}\n`;
      let sentCount = 0;

      for (const media of downloadUrl) {
        try {
          const mediaUrl = media.url;
          const mediaType = media.type;
          const caption = `${captionBase}*Media ${sentCount + 1} dari ${downloadUrl.length}*`;

          if (mediaType === 'video') {
            await sock.sendMessage(from, {
              video: { url: mediaUrl },
              caption: caption,
              mimetype: 'video/mp4',
              fileName: `twitter_video_${sentCount + 1}.mp4`
            }, { quoted: msg });
          } else if (mediaType === 'image') {
            await sock.sendMessage(from, {
              image: { url: mediaUrl },
              caption: caption,
              fileName: `twitter_image_${sentCount + 1}.jpg`
            }, { quoted: msg });
          } else {
            return reply('Tipe media tidak didukung.');
          }
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        } catch (sendError) {
          console.error(`Gagal mengirim media ke-${sentCount + 1}:`, sendError);
        }
      }
    } catch (apiError) {
      console.error('Terjadi kesalahan saat memproses permintaan API Twitter:', apiError.message, apiError.response?.data);
    }
  },
};
