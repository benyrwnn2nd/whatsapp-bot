import fs from 'fs/promises';
import path from 'path';

async function loadCommands(commandsDir) {
    const commands = {};
    try {
        try {
            await fs.access(commandsDir);
        } catch (err) {
            console.error(`Folder ${commandsDir} ga ada atau ga bisa diakses: ${err.message}`);
            return commands;
        }
        const categories = await fs.readdir(commandsDir);
        for (const category of categories) {
            const categoryPath = path.join(commandsDir, category);
            const isDirectory = await fs.stat(categoryPath).then(stat => stat.isDirectory()).catch(() => false);
            if (!isDirectory) continue;
            
            const commandFiles = await fs.readdir(categoryPath)
                .then(files => files.filter(file => file.endsWith('.js')))
                .catch(() => []);
            
            for (const file of commandFiles) {
                try {
                    const command = await import(`file://${path.join(categoryPath, file)}`);
                    if (!command.default?.name || !command.default?.exec) continue;
                    command.default.category = category;
                    commands[command.default.name.toLowerCase()] = command.default;
                    if (command.default.alias) {
                        command.default.alias.forEach(alias => {
                            if (!commands[alias.toLowerCase()]) {
                                commands[alias.toLowerCase()] = command.default;
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Error loading command ${file}: ${err.message}`);
                }
            }
        }
    } catch (err) {
        console.error(`Terjadi kesalahan : ${err.message}`);
    }
    return commands;
}

export default loadCommands;
