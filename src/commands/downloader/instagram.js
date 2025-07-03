import axios from 'axios';

export default {
  name: 'instagram',
  alias: ['igdl', 'instadl'],
  category: 'downloader',
  desc: 'Mengunduh video atau gambar dari Instagram',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    const igUrl = args[0];
    try {
      const apiUrl = `https://flowfalcon.dpdns.org/download/instagram?url=${encodeURIComponent(igUrl)}`;
      const { data } = await axios.get(apiUrl);
      const { title, downloadUrls } = data.result;
      
      const captionBase = `*Judul:* ${title || 'Tidak ada judul'}\n*Sumber:* Instagram\n*Tautan Asli:* ${igUrl}\n`;
      let sentCount = 0;

      for (const mediaUrl of downloadUrls) {
        try {
          const isVideo = mediaUrl.endsWith('.mp4') || mediaUrl.includes('video') || mediaUrl.includes('.mp4?');
          const caption = `${captionBase}*Media ${sentCount + 1} dari ${downloadUrls.length}*`;

          if (isVideo) {
            await sock.sendMessage(from, {
              video: { url: mediaUrl },
              caption: caption,
              mimetype: 'video/mp4',
              fileName: `instagram_video_${sentCount + 1}.mp4`
            }, { quoted: msg });
          } else {
            await sock.sendMessage(from, {
              image: { url: mediaUrl },
              caption: caption,
              fileName: `instagram_image_${sentCount + 1}.jpg`
            }, { quoted: msg });
          }

          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        } catch (sendError) {
          console.error(`Gagal mengirim media ke-${sentCount + 1}:`, sendError);
        }
      }
    } catch (apiError) {
      console.error('Terjadi kesalahan saat memproses permintaan API Instagram:', apiError.message, apiError.response?.data);
    }
  },
};
