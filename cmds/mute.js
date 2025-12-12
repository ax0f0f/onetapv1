const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'mute',
    description: 'Mutes a user by applying the Muted role. Works globally, but ownership is checked first.',
    usage: '.v mute <user> [reason]',
    aliases: ['skt', 'stfu'],
    
    // The command must be async because it performs database lookups
    async execute(message, args, client, db) {
        const userId = message.author.id;
        const guildId = message.guild.id;

        // --- Custom Component Reply Function ---
        // Exactly matches the structure from your kick command.
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
        const reason = args.slice(1).join(" ") || "No reason provided by moderator.";

        if (!targetMember) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Target user not found in this server.');
        }

        if (targetMember.id === '335869842748080140') {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> You can’t mute the developer.');
        }

        if (targetMember.id === userId) {
            return sendReply('<:discotoolsxyzicon:1448758684535488562> You cannot mute yourself.');
        }
        
        // --- 2. Permission/Authority Check (Uses the same channel logic for consistency) ---
        
        // Get the channel the user is currently in (to check if they own/manage it)
        const member = message.guild.members.cache.get(userId);
        const voiceChannel = member?.voice.channel;
        
        // This command traditionally relies on server permissions, but since the kick command
        // focuses on channel ownership, we will check that first.

        let isOwnerOrManager = false;
        
        if (voiceChannel) {
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

                if (tempChannelRow) {
                    const channelOwnerId = tempChannelRow.owner_id;
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
                    
                    if (isOwner || isManager) {
                        isOwnerOrManager = true;
                        
                        // Additional checks from the kick command
                        if (!isOwner && targetMember.id === channelOwnerId) {
                            return sendReply('<:discotoolsxyzicon:1448758684535488562> Managers cannot mute the channel owner.');
                        }
                        if (!isOwner && managers.includes(targetMember.id)) {
                            return sendReply('<:discotoolsxyzicon:1448758684535488562> Managers cannot mute other managers.');
                        }
                    }
                }
            } catch (error) {
                console.error('DB lookup error in mute command:', error);
                // Continue to check for global permissions if DB fails
            }
        }
        
        // --- Global Permission Fallback (if not channel owner/manager) ---
        // If the user is not a channel owner/manager, check if they have the global Mute permission
        if (!isOwnerOrManager) {
            if (!message.member.permissions.has('MUTE_MEMBERS')) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be the voice channel owner/manager or have the `MUTE_MEMBERS` permission to use this command.');
            }
        }
        
        // --- 3. Muting Logic ---
        
        try {
            // Find the 'Muted' role
            const mutedRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('muted')); 

            if (!mutedRole) {
                return sendReply('<:discotoolsxyzicon:1448758684535488562> Error: The server must have a role named "Muted" (or similar) set up.');
            }
            
            // Check if the user is already muted
            if (targetMember.roles.cache.has(mutedRole.id)) {
                return sendReply(`<:discotoolsxyzicon:1448758684535488562> ${targetMember.user.tag} is already muted.`);
            }

            // Apply the role
            await targetMember.roles.add(mutedRole, reason);
            
            // Success reply
            return sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully muted **${targetMember.user.tag}**. Reason: *${reason}*`);

        } catch (error) {
            console.error('Error applying mute role:', error);
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to mute user due to an unexpected error. Check the bot\'s role hierarchy.');
        }
    }
};
