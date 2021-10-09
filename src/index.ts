import { Client, Intents, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { config } from 'dotenv';

config();

declare module 'discord.js' {
   // eslint-disable-next-line
   interface Client {
	_commands: Collection<string, any>
   }
}

const client = new Client({ intents: [ Intents.FLAGS.GUILDS ] });
client._commands = new Collection();

const eventFiles = readdirSync('.build/events');
for (const file of eventFiles) {
	(async () => {
		const event = await import(`./events/${file}`);
		event.default.once ? client.once(event.default.name, (...args: any) => event.default.execute(...args)) : client.on(event.default.name, (...args: any) => event.default.execute(...args)); 
	})();
}

const commandFiles = readdirSync('.build/commands');
for (const file of commandFiles) {
	(async () => {
		const command = await import(`./commands/${file}`); 
		client._commands.set(command.default.name, command.default.execute);
	})();
}

client.login();