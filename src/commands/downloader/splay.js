import axios from 'axios';

export default {
  name: 'play',
  alias: ['splay', 'spotify'],
  category: 'downloader',
  desc: 'Mengunduh audio dari Spotify berdasarkan judul lagu',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    const query = args.join(' '); 
    try {
      const apiUrl = `https://api.nekorinn.my.id/downloader/spotifyplay?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl);
      const { metadata, downloadUrl } = data.result;
      const { title, artist, duration, cover, url } = metadata;
      const caption = `Spotify Play\n` +
                      `┊ Title: ${title}\n` +
                      `┊ Artist: ${artist}\n` +
                      `┊ Duration: ${duration}\n` +
                      `┊ Source: ${url}\n`;

      try {
        await sock.sendMessage(from, {
          image: { url: cover },
          caption: caption
        }, { quoted: msg });
        await sock.sendMessage(from, {
          audio: { url: downloadUrl },
          mimetype: 'audio/mp4',
          fileName: `${title}.mp3`,
          ptt: false
        }, { quoted: msg });
      } catch (sendError) {
        console.error('Gagal mengirim media Spotify ke WhatsApp:', sendError);
      }
    } catch (apiError) {
      console.error('Terjadi kesalahan saat memproses permintaan API Spotify:', apiError.message, apiError.response?.data);
    }
  },
};
