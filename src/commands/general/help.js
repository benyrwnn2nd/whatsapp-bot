export default {
  name: "help",
  alias: ["menu"],
  category: "general",
  desc: "Menampilkan daftar perintah yang tersedia di bot ini",
  async exec({ sock, msg, commands, isOwner }) {
    let helpText = `*MENU BOT* \n\n`;
    const categories = {};
    const processedCommands = new Set();
    for (const cmd of Object.values(commands)) {
      if (!cmd.name || processedCommands.has(cmd.name)) continue;
      if (cmd.category === "private" && !isOwner) continue;
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
      processedCommands.add(cmd.name);
      if (cmd.alias) {
        cmd.alias.forEach(alias => processedCommands.add(alias));
      }
    }
    for (const [category, cmds] of Object.entries(categories)) {
      helpText += `*${category.toUpperCase()}*\n`;
      for (const cmd of cmds) {
        helpText += `!${cmd.name}\n`;
        if (cmd.alias && cmd.alias.length > 0) {
          helpText += `Alias: ${cmd.alias.join(", ")}\n`;
        }
        helpText += `Desc: ${cmd.desc}\n\n`;
      }
    }
    await msg.reply(helpText);
  },
};
