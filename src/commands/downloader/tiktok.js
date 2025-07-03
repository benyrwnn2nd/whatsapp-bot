import axios from 'axios';

export default {
  name: 'tiktok',
  alias: ['tt', 'ttdl'],
  category: 'downloader',
  desc: 'Download video atau gambar TikTok',
  async exec({ sock, msg, args }) {
    const { from, reply } = msg;
    if (!args[0]) return reply('Masukkan URL TikTok!');

    const apis = [
      {
        name: 'Tikwm',
        url: `https://tikwm.com/api?url=${encodeURIComponent(args[0])}`,
        parse: (res) => ({
          url: res.data?.play || res.data?.wmplay, 
          images: res.data?.images, 
          caption: res.data?.title,
        }),
      },
      {
        name: 'Ryzendesu',
        url: `https://api.ryzendesu.vip/api/downloader/v2/ttdl?url=${encodeURIComponent(args[0])}`,
        parse: (res) => ({
          url: res.video?.play_url?.url_list?.[0], 
          caption: res.desc,
        }),
      },
      {
        name: 'Tiklydown',
        url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(args[0])}`,
        parse: (res) => ({
          url: res.video?.noWatermark, 
          caption: res.title,
        }),
      },
    ];

    for (const api of apis) {
      try {
        const { data } = await axios.get(api.url, { timeout: 10000 });
        const { url, images, caption } = api.parse(data);

        if (images && images.length > 0) {
          let sentCount = 0;
          for (const imageUrl of images) {
            try {
              const imageCaption = `*Caption:* ${caption || '-'}\n*Media ${sentCount + 1} dari ${images.length}*\n*Sumber:* TikTok\n*Tautan Asli:* ${args[0]}`;
              await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: imageCaption,
                fileName: `tiktok_image_${sentCount + 1}.jpg`,
              }, { quoted: msg });
              sentCount++;
              await new Promise(resolve => setTimeout(resolve, 1000)); 
            } catch (sendError) {
              console.error(`Gagal mengirim gambar ke-${sentCount + 1}:`, sendError);
            }
          }
        } else if (url) {
          const videoCaption = `*Caption:* ${caption || '-'}\n*Sumber:* TikTok\n*Tautan Asli:* ${args[0]}`;
          await sock.sendMessage(from, {
            video: { url },
            caption: videoCaption,
            mimetype: 'video/mp4',
            fileName: 'tiktok_video.mp4',
          }, { quoted: msg });
        }
      } catch (e) {
        console.error(`Gagal di ${api.name}:`, e.message);
      }
    }
  },
};
