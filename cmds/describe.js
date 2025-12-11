const {
    TextDisplayBuilder,
    ContainerBuilder,
    MessageFlags,
    PermissionsBitField
} = require('discord.js');

module.exports = {
    name: 'describe',
    description: 'Sends a detailed announcement about the bot.',
    async execute(message, args, client) {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const textComponent = new TextDisplayBuilder().setContent('🚫 You need **Administrator** permission to use this command.');
            const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
            return message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [containerComponent],
            });
        }

        const titleText = new TextDisplayBuilder().setContent(`## @everyone @here📢 Bot Announcement: ax0f is Now Public!`);
        const introText = new TextDisplayBuilder().setContent(`> Great news! **ax0f** is now available for everyone to use.`);
        const featuresTitle = new TextDisplayBuilder().setContent(`### What I do:`);
        const featuresText = new TextDisplayBuilder().setContent(`I create temporary voice and text channels instantly. Just join the **"One Tap"** voice channel, and I'll give you a private room. As the room owner, you can use the control panel in the **#interface** channel to manage it.`);
        const styleTitle = new TextDisplayBuilder().setContent(`### New Look:`);
        const styleText = new TextDisplayBuilder().setContent(`I've been updated with a fresh, new visual style for all my messages to provide a cleaner and more intuitive experience.`);
        const commandsTitle = new TextDisplayBuilder().setContent(`### Available Commands:`);
        const commandsIntro = new TextDisplayBuilder().setContent(`Here's a quick overview. For more details, use the \`.v help\` command.`);
        const voiceCommands = new TextDisplayBuilder().setContent(`- **Voice:** \`lock\`, \`unlock\`, \`permit\`, \`deny\`, \`kick\`, \`limit\`, \`name\`, \`claim\`, \`transfer\``);
        const managerCommands = new TextDisplayBuilder().setContent(`- **Managers:** \`man-add\`, \`man-remove\`, \`man-clear\``);
        const whitelistCommands = new TextDisplayBuilder().setContent(`- **Whitelist:** \`wl-add\`, \`wl-remove\`, \`wl-list\``);
        const blacklistCommands = new TextDisplayBuilder().setContent(`- **Blacklist:** \`bl-add\`, \`bl-remove\`, \`bl-list\``);
        const footerText = new TextDisplayBuilder().setContent(`[Developed by ichbi9o](https://discord.gg/hmm7u4rCrk)`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                titleText, 
                introText,
                featuresTitle,
                featuresText,
                styleTitle,
                styleText,
                commandsTitle,
                commandsIntro,
                voiceCommands,
                managerCommands,
                whitelistCommands,
                blacklistCommands,
                footerText
            );

        await message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
};