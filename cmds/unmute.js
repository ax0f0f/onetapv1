const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Removes the server mute from a user within the current voice channel. Only usable by the channel owner or manager.',
    usage: '.v unmute <user>',
    aliases: ['unshush', 'hder'],
    
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
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user mention or ID to unmute.');
        }

        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = "Unmuted by channel owner/manager.";

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
        
        // Check if the target is already unmuted
        if (!targetMember.voice.serverMute) {
            return sendReply(`<:discotoolsxyzicon:1448758684535488562> ${targetMember.user.tag} is not currently server-muted.`);
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
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner or a manager to unmute users.');
            }
            
            // --- Self/Hierarchy Checks (Prevent managers from unmuting the owner if they were muted by someone else) ---

            if (targetMember.id === '335869842748080140') {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You can’t unmute the developer.');
            }
            
            // --- 3. CORE CHANGE: Voice Unmute Logic ---
            
            // Use setMute() to server-unmute the member in the voice channel
            await targetMember.voice.setMute(false, reason);
            
            // Success reply
            return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully **server-unmuted** **${targetMember.user.tag}** in the voice channel.`);

        } catch (error) {
            console.error('Error setting voice unmute:', error);
            // The bot requires the 'MUTE_MEMBERS' permission to do this!
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to unmute user. Ensure the bot has the **Mute Members** permission.');
        }
    }
};
