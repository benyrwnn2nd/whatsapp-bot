import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export default {
  name: "eval",
  alias: ["exec", "term"],
  category: "private",
  desc: "menjalankan terminal atau JS",
  owner: true,
  async exec({ sock, msg, args }) {
    if (!args[0]) {
      return sock.sendMessage(jid, { text: "Masukkan perintah!\nContoh:\n• Shell: !term dir\n• JS: !term axios.get('https://api.example.com').then(v => v.data)" }, { quoted: msg });
    }
    const input = args.join(" ").trim();
    try {
      if (input.match(/^[a-z0-9_\-\.\/\s]+$/i)) {
        const { stdout, stderr } = await execAsync(input, { timeout: 5000 });
        const output = stdout || stderr || "Selesai (ga ada output)";
        await sock.sendMessage(msg.from, { text: output }, { quoted: msg });
      } else {
        const result = await eval(`(async () => {
          try {
            return ${input};
          } catch (e) {
            return e.message;
          }
        })()`);
        await sock.sendMessage(msg.from, { text: String(result) }, { quoted: msg });
      }
    } catch (err) {
      console.log(`Error di term: ${err.message}`);
      await sock.sendMessage(msg,from, { text: `Gagal eksekusi: ${err.message || err}` }, { quoted: msg });
    }
  }
};
