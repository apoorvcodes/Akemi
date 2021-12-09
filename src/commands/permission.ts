import {
	CommandInteraction,
	ApplicationCommandData,
	Constants,
	AutocompleteInteraction,
	ApplicationCommandOptionChoice,
	Permissions,
	Formatters,
} from 'discord.js';

import { closest } from 'fastest-levenshtein';
import { getMongoManager } from 'typeorm';
import { Config } from '../schemas/Config';

export default {
	name: 'permission',
	description: 'Set the permission for a command',
	options: [
		{
			name: 'command',
			description: 'The command to set permission',
			type: Constants.ApplicationCommandOptionTypes.STRING,
			autocomplete: true,
			required: true,
		},
		{
			name: 'query',
			description: 'The member or role to set permission for',
			type: Constants.ApplicationCommandOptionTypes.MENTIONABLE,
			required: true,
		},
		{
			name: 'type',
			description: 'The command to set permission for',
			type: Constants.ApplicationCommandOptionTypes.STRING,
			required: true,
			choices: [
				{
					name: 'User',
					value: 'USER',
				},
				{
					name: 'Role',
					value: 'ROLE',
				},
			],
		},
		{
			name: 'permission',
			description: 'The to set permission',
			type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
			required: true,
		},
	],
	ephemeral: true,
	async execute(interaction: CommandInteraction) {
		if (!interaction.inCachedGuild()) return;

		const manager = getMongoManager();

		let config = await manager.findOne(Config, { guild: interaction.guildId });

		if (
			!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
			config &&
			config.roles?.moderator &&
			!interaction.member.roles.cache.has(config.roles?.moderator)
		) {
			return interaction.editReply(
				`Only people with ${Formatters.inlineCode(
					'ADMINISTRATOR',
				)} permission or the ${config.roles?.moderator ? interaction.guild.roles.cache.get(config.roles?.moderator)?.toString() : 'moderator'} role can run this command`,
			);
		}

		await interaction.client.application?.commands.fetch();
		await interaction.guild?.commands.fetch();

		const command =
			interaction.guild?.commands.cache.find(
				(cmd) => cmd.name === interaction.options.getString('command')!,
			) ||
			interaction.client.application?.commands.cache.find(
				(cmd) => cmd.name === interaction.options.getString('command')!,
			);
		const query = interaction.options.getMentionable('query')!;
		const type = interaction.options.getString('type');
		const permission = interaction.options.getBoolean('permission')!;

		if (type !== 'USER' && type !== 'ROLE') return;
		if (!command) return interaction.editReply('Command not found');

		interaction.guild?.commands.permissions.add({
			command: command.id,
			permissions: [
				{
					id: query.id,
					type,
					permission,
				},
			],
		});
		interaction.editReply(
			`Permission setted successfully for ${
				command.name
			} command for ${query} ${type.toLowerCase()} as ${permission}`,
		);
	},
	async complete(interaction: AutocompleteInteraction) {
		const options: ApplicationCommandOptionChoice[] = [];
		let commands = [
			...interaction.client._commands
				.filter((command) => command.name !== 'eval')
				.map((command) => command.name)
				.values(),
		];

		const option = interaction.options.getFocused();

		if (!option) {
			commands.map((command) => options.push({ name: command, value: command }));
			return interaction.respond(options);
		}

		for (let i = 0; i <= 5 && commands.length !== 0; i++) {
			const _closest = closest(option.toString(), commands);
			options.push({ name: _closest, value: _closest });
			commands = commands.filter((command) => command !== _closest);
		}
		interaction.respond(options);
	},
} as ApplicationCommandData;
