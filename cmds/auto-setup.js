const {
    PermissionsBitField,
    ChannelType,
    TextDisplayBuilder,
    ContainerBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

module.exports = {
    name: 'auto-setup',
    description: 'Automatically sets up the One Tap category with One Tap voice and interface channels.',
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
            return sendReply('<:discotoolsxyzicon:1448758684535488562> You need **Administrator** permission to use this command.');
        }

        const guild = message.guild;
        const categoryName = 'One Tap ';
        const voiceChannelName = '➕ One Tap';
        const textChannelName = 'One tap help';

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
                    return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to access configuration.');
                }
                const query = row
                    ? `UPDATE guild_config SET room_id = ? WHERE guild_id = ?`
                    : `INSERT INTO guild_config (room_id, guild_id) VALUES (?, ?)`;

                db.run(query, [voiceChannel.id, guild.id], (dbErr) => {
                    if (dbErr) {
                        console.error(dbErr);
                        return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to save configuration.');
                    }
                });
            });

            // Clear previous panel messages from the bot
            const messages = await textChannel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            if (botMessages.size > 0) {
               await textChannel.bulkDelete(botMessages, true);
            }

            // Create control panel components
            const titleText = new TextDisplayBuilder().setContent(`# Voice Channel Control Panel`);
            const descriptionText = new TextDisplayBuilder().setContent(`> As a voice channel owner, you can manage your room using the buttons below.`);
            const footerText = new TextDisplayBuilder().setContent(`[Developed by ax0f](https://discord.gg/hmm7u4rCrk)`);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lock').setEmoji('<:controledacces:1448781573985009826>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('unlock').setEmoji('<:accesrefuse:1448781645833568287>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('claim').setEmoji('<:couronne1Copy:1448781704000180315>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('setVoiceLimit').setEmoji('<:arcadialimit:1448781741459505443>').setStyle(ButtonStyle.Secondary)
            );
            
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('permit').setEmoji('<:ajoutdutilisateur:1448781790444650707>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('deny').setEmoji('<:supprimerlutilisateur:1448781831074873507>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('trash').setEmoji('<:poubelle:1400312926975295598>').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('name').setEmoji('<:acadiarename:1448781911735402498>').setStyle(ButtonStyle.Secondary)
            );
            
            const row3 = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('features_menu')
                    .setPlaceholder('Channel Features')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('sb - ON').setValue('soundboard_on').setEmoji('<:arcadiasbon:1448781948196753609>'),
                        new StringSelectMenuOptionBuilder().setLabel('sb - OFF').setValue('soundboard_off').setEmoji('<:arcadiasboff:1448781989846188106>'),
                        new StringSelectMenuOptionBuilder().setLabel('Cam - ON').setValue('camera_on').setEmoji('<:arcadiacamon:1448782034796544150>'),
                        new StringSelectMenuOptionBuilder().setLabel('Cam - OFF').setValue('camera_off').setEmoji('<:arcadiacamoff:1448782170775621681>'),
                        new StringSelectMenuOptionBuilder().setLabel('Activities - ON').setValue('activities_on').setEmoji('<:acradiaacton:1448782206138056796>'),
                        new StringSelectMenuOptionBuilder().setLabel('Activities - OFF').setValue('activities_off').setEmoji('<:arcadiaactoff:1448782244289445989>')
                    )
            );

            const mediaGallery = new MediaGalleryBuilder().addItems(
                item => item.setURL('https://cdn.discordapp.com/attachments/1400466495833772236/1400469462091698409/30770-nxvaxo.gif?ex=693c17d3&is=693ac653&hm=f91834b5d437ecc9a14862fc4a848d51d9e0bfc7c01ea30816c8484ce013ddaa&')
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(titleText, descriptionText, footerText)
                .addMediaGalleryComponents(mediaGallery) //  Added media gallery
                .addActionRowComponents(row3, row1, row2);

            await textChannel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });

            sendReply(`<:discotoolsxyzicon1:1448758665963110603> **Auto-setup complete!** The One Tap category and channels have been configured.`);

        } catch (error) {
            console.error('Auto-setup failed:', error);
            sendReply('<:discotoolsxyzicon:1448758684535488562> An error occurred during setup. Please check my permissions and try again.');
        }
    },
};
