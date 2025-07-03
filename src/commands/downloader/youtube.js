import axios from 'axios'; 

export default {
  name: 'youtube',
  alias: ['ytdl', 'yt'], 
  category: 'downloader',
  desc: 'Mengunduh video atau audio dari YouTube',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    const youtubeUrl = args[0]; 
    const type = args[1]?.toLowerCase(); 

    if (!type || (type !== 'mp4' && type !== 'mp3')) {
      return reply('Mohon tentukan format unduhan (mp4 atau mp3) setelah tautan. Contoh: !ytdl <link_youtube> mp4');
    }

    try {
      let apiUrl;
      if (type === 'mp4') {
        apiUrl = `https://flowfalcon.dpdns.org/download/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
      } else { 
        apiUrl = `https://flowfalcon.dpdns.org/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
      }

      const { data } = await axios.get(apiUrl);
      const downloadUrl = data.result;

      try {
        if (type === 'mp4') {
          await sock.sendMessage(from, {
            video: { url: downloadUrl },
            caption: `${youtubeUrl}`,
            mimetype: 'video/mp4',
            fileName: 'youtube_video.mp4'
          }, { quoted: msg });
        } else { 
          await sock.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mp4', 
            fileName: 'youtube_audio.mp3' 
          }, { quoted: msg });
        }
      } catch (sendError) {
        console.error('Gagal mengirim media YouTube ke WhatsApp:', sendError);
      }

    } catch (apiError) {
      console.error('Terjadi kesalahan saat memproses permintaan API YouTube:', apiError.message, apiError.response?.data);
    }
  },
};
