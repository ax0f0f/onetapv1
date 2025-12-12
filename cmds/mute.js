const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'mute',
    description: 'Server-mutes a user within the current voice channel. Only usable by the channel owner or manager.',
    usage: '.v mute <user> [reason]',
    aliases: ['shush', 'silence'],
    
    async execute(message, args, client, db) {
        const userId = message.author.id;
        const guildId = message.guild.id;

        // --- Custom Component Reply Function ---
        const sendReply = (content) => {
            const textComponent = new TextDisplayBuilder().setContent(content);
            const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
            message.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [containerComponent],
            });
        };

        // --- 1. Argument and Target Validation ---

        if (!args[0]) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user mention or ID to mute, and optionally a reason.');
        }

        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(" ") || "Muted by channel owner/manager.";

        if (!targetMember) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Target user not found in this server.');
        }
        
        // --- 2. Channel and Authority Check (Uses existing DB logic) ---
        
        const member = message.guild.members.cache.get(userId);
        const voiceChannel = member?.voice.channel;
        
        if (!voiceChannel) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be connected to a voice channel to use this command.');
        }
        
        // Check if the target is in the same channel as the commander
        if (targetMember.voice.channelId !== voiceChannel.id) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> The user is not connected to your voice channel.');
        }
        
        // Check if the target is already muted
        if (targetMember.voice.serverMute) {
            return sendReply(`<:discotoolsxyzicon:1448758684535488562> ${targetMember.user.tag} is already server-muted.`);
        }

        try {
            // Check if the current voice channel is a temporary one and who the owner is
            const tempChannelRow = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
                    [voiceChannel.id, guildId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            if (!tempChannelRow) {
                // Not a bot-managed temporary channel, so the command is not valid here.
                return sendReply('<:discotoolsxyzicon:1448758684535488562> This command only works in voice channels managed by the bot.');
            }
            
            const channelOwnerId = tempChannelRow.owner_id;
            
            // Check for channel managers from the database
            const managerRows = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT manager_id FROM user_managers WHERE owner_id = ?`,
                    [channelOwnerId],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });

            const managers = managerRows.map(r => r.manager_id);
            const isOwner = channelOwnerId === userId;
            const isManager = managers.includes(userId);
            
            // --- Strict Ownership/Manager Check ---
            if (!isOwner && !isManager) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or a manager to mute users.');
            }
            
            // --- Self/Hierarchy Checks ---

            if (targetMember.id === userId) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You cannot mute yourself.');
            }
            if (targetMember.id === '335869842748080140') {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You can’t mute the developer.');
            }
            if (!isOwner && targetMember.id === channelOwnerId) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> Managers cannot mute the channel owner.');
            }
            if (!isOwner && managers.includes(targetMember.id)) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> Managers cannot mute other managers.');
            }
            
            // --- 3. CORE CHANGE: Voice Mute Logic ---
            
            // Use setMute() to server-mute the member in the voice channel
            await targetMember.voice.setMute(true, reason);
            
            // Success reply
            return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully **server-muted** **${targetMember.user.tag}** in the voice channel. Reason: *${reason}*`);

        } catch (error) {
            console.error('Error setting voice mute:', error);
            // The bot requires the 'MUTE_MEMBERS' permission to do this!
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to mute user. Ensure the bot has the **Mute Members** permission.');
        }
    }
};
