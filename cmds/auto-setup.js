const {
    PermissionsBitField,
    ChannelType,
    TextDisplayBuilder,
    ContainerBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

module.exports = {
    name: 'auto-setup',
    description: 'Automatically sets up the ax0f category with One Tap voice and interface channels.',
    async execute(message, args, client, db) {
        const sendReply = (content) => {
            const textComponent = new TextDisplayBuilder().setContent(content);
            const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
            message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [containerComponent],
            });
        };

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendReply('<:traverser:1400313375547850877> You need **Administrator** permission to use this command.');
        }

        const guild = message.guild;
        const categoryName = 'AX0F';
        const voiceChannelName = 'One Tap';
        const textChannelName = 'interface';

        try {
            // Find or create the category
            let category = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
            if (!category) {
                category = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                });
            }

            // Find or create the voice channel
            let voiceChannel = guild.channels.cache.find(c => c.name === voiceChannelName && c.parentId === category.id);
            if (!voiceChannel) {
                voiceChannel = await guild.channels.create({
                    name: voiceChannelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                });
            }

            // Find or create the text channel
            let textChannel = guild.channels.cache.find(c => c.name === textChannelName && c.parentId === category.id);
            if (!textChannel) {
                textChannel = await guild.channels.create({
                    name: textChannelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                });
            }

            // Update the database with the voice channel ID
            db.get(`SELECT * FROM guild_config WHERE guild_id = ?`, [guild.id], (err, row) => {
                if (err) {
                    console.error(err);
                    return sendReply('<:traverser:1400313375547850877> Failed to access configuration.');
                }
                const query = row
                    ? `UPDATE guild_config SET room_id = ? WHERE guild_id = ?`
                    : `INSERT INTO guild_config (room_id, guild_id) VALUES (?, ?)`;

                db.run(query, [voiceChannel.id, guild.id], (dbErr) => {
                    if (dbErr) {
                        console.error(dbErr);
                        return sendReply('<:traverser:1400313375547850877> Failed to save configuration.');
                    }
                });
            });

            // Clear previous panel messages from the bot
            const messages = await textChannel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            if (botMessages.size > 0) {
               await textChannel.bulkDelete(botMessages, true);
            }

            // Send the control panel
            const titleText = new TextDisplayBuilder().setContent(`# Voice Channel Control Panel`);
            const descriptionText = new TextDisplayBuilder().setContent(`> As a voice channel owner, you can manage your room using the buttons below.`);
            const footerText = new TextDisplayBuilder().setContent(`[Developed by ichbi9o](https://discord.gg/hmm7u4rCrk)`);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lock').setEmoji('<:controledacces:1400312918695874640>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('unlock').setEmoji('<:accesrefuse:1400312914845634653>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('claim').setEmoji('<:couronne1Copy:1400312921698861076>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('setVoiceLimit').setEmoji('<:arcadialimit:1381416262483050589>').setStyle(ButtonStyle.Secondary)
            );
            
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('permit').setEmoji('<:ajoutdutilisateur:1400312916263178283>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('deny').setEmoji('<:supprimerlutilisateur:1400312929156464660>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('trash').setEmoji('<:poubelle:1400312926975295598>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('name').setEmoji('<:acadiarename:1381416711001079809>').setStyle(ButtonStyle.Secondary)
            );
            
            const row3 = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('features_menu')
                    .setPlaceholder('🔧 Channel Features')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('sb - ON').setValue('soundboard_on').setEmoji('<:arcadiasbon:1384183874405273681>'),
                        new StringSelectMenuOptionBuilder().setLabel('sb - OFF').setValue('soundboard_off').setEmoji('<:arcadiasboff:1384185071304445963>'),
                        new StringSelectMenuOptionBuilder().setLabel('Cam - ON').setValue('camera_on').setEmoji('<:arcadiacamon:1384185720293560451>'),
                        new StringSelectMenuOptionBuilder().setLabel('Cam - OFF').setValue('camera_off').setEmoji('<:arcadiacamoff:1384186030592102461>'),
                        new StringSelectMenuOptionBuilder().setLabel('Activities - ON').setValue('activities_on').setEmoji('<:acradiaacton:1384186660731883570>'),
                        new StringSelectMenuOptionBuilder().setLabel('Activities - OFF').setValue('activities_off').setEmoji('<:arcadiaactoff:1384186982443384842>')
                    )
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(titleText, descriptionText, footerText)
                .addActionRowComponents(row3, row1, row2);

            await textChannel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            sendReply(`<:verifier:1400313376521064551> **Auto-setup complete!** The ax0f category and channels have been configured.`);

        } catch (error) {
            console.error('Auto-setup failed:', error);
            sendReply('<:traverser:1400313375547850877> An error occurred during setup. Please check my permissions and try again.');
        }
    },
};
