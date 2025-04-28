import axios from 'axios';

export default {
  name: 'tiktok',
  alias: ['tt', 'ttdl'],
  category: 'downloader',
  desc: 'Download video TikTok',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    if (!args[0]) return reply('Masukkan URL TikTok!');

    const apis = [
      {
        name: 'Tikwm',
        url: `https://tikwm.com/api?url=${encodeURIComponent(args[0])}`,
        parse: (res) => ({ url: res.data?.play, caption: res.data?.title }),
      },
      {
        name: 'Tiklydown',
        url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(args[0])}`,
        parse: (res) => ({ url: res.video?.noWatermark, caption: res.title }),
      },
    ];

    for (const api of apis) {
      try {
        const { data } = await axios.get(api.url, { timeout: 10000 });
        const video = api.parse(data);
        if (video.url) {
          return sock.sendMessage(from, {
            video: { url: video.url },
            caption: video.caption || '-',
          }, { quoted: msg });
        }
      } catch (e) {
        console.error(`Gagal di ${api.name}:`, e.message);
      }
    }
    await reply('Gagal mengunduh video TikTok. Coba lagi nanti.');
  },
};
