const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client, db) {
    if (!interaction.guild) return;

    const { member, guild } = interaction;

    const createEmbed = (desc) =>
      new EmbedBuilder().setDescription(desc).setColor('#f5eee2');

    async function isManagerOf(ownerId, managerId) {
      return new Promise((resolve) => {
        db.get(
          `SELECT 1 FROM user_managers WHERE owner_id = ? AND manager_id = ?`,
          [ownerId, managerId],
          (err, row) => {
            if (err) {
              console.error('DB Error (user_managers):', err);
              return resolve(false);
            }
            resolve(!!row);
          }
        );
      });
    }

    async function getOwnerId(channelId) {
      return new Promise((resolve) => {
        db.get(
          `SELECT owner_id FROM temp_channels WHERE channel_id = ?`,
          [channelId],
          (err, row) => {
            if (err) {
              console.error('DB Error (temp_channels):', err);
              return resolve(null);
            }
            resolve(row ? row.owner_id : null);
          }
        );
      });
    }

    async function isAuthorized(channelId, memberId) {
      const ownerId = await getOwnerId(channelId);
      if (!ownerId) return { authorized: false, ownerId: null };
      const isOwner = ownerId === memberId;
      const isManager = await isManagerOf(ownerId, memberId);
      return { authorized: isOwner || isManager, ownerId, isOwner };
    }

    async function lockChannel(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel.')],
          ephemeral: true,
        });
    
      const { authorized, ownerId, isOwner } = await isAuthorized(voiceChannel.id, interaction.member.id);
      if (!authorized)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are not authorized to lock this channel.')],
          ephemeral: true,
        });
    
      try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: false,
          Speak: true,
        });
    
        if (ownerId) {
          const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
          if (ownerMember) {
            await voiceChannel.permissionOverwrites.edit(ownerMember, {
              Connect: true,
              Speak: true,
            });
          }
        }
    
        await interaction.reply({
          embeds: [createEmbed('<:controledacces:1400312918695874640> Voice channel locked for everyone except authorized users.')],
          ephemeral: true,
        });
      } catch (error) {
        console.error('Lock error:', error);
        await interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to lock the channel.')],
          ephemeral: true,
        });
      }
    }
    
    

    async function unlockChannel(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel.')],
          ephemeral: true,
        });

      const { authorized } = await isAuthorized(voiceChannel.id, interaction.member.id);
      if (!authorized)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are not authorized to unlock this channel.')],
          ephemeral: true,
        });

      try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Connect: true,
          Speak: true,
        });
        await interaction.reply({
          embeds: [createEmbed('<:accesrefuse:1400312914845634653> Voice channel unlocked for everyone.')],
          ephemeral: true,
        });
      } catch (error) {
        console.error('Unlock error:', error);
        await interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to unlock the channel.')],
          ephemeral: true,
        });
      }
    }
    async function clearPanelMessages(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel.')],
          ephemeral: true,
        });
      }
    
      const { authorized } = await isAuthorized(voiceChannel.id, interaction.member.id);
      if (!authorized) {
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are not authorized to use the trash button.')],
          ephemeral: true,
        });
      }
    
      try {
        await interaction.deferReply({ ephemeral: true });
    
        const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
        const messages = fetchedMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
        const [firstMessage, ...restMessages] = messages.values();
        const deletions = restMessages.map((msg) => msg.delete().catch(() => null));
        await Promise.all(deletions);
    
        return interaction.editReply({
          embeds: [createEmbed('🗑️ All messages except the control panel were deleted.')],
        });
      } catch (error) {
        console.error('Error clearing messages:', error);
        return interaction.editReply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to clear messages.')],
        });
      }
    }
    
    
    async function claimChannel(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel to claim it.')],
          ephemeral: true,
        });

      db.get(
        `SELECT owner_id FROM temp_channels WHERE channel_id = ?`,
        [voiceChannel.id],
        async (err, row) => {
          if (err) {
            console.error('DB Error (claim):', err);
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Database error.')],
              ephemeral: true,
            });
          }

          if (!row) {
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> This voice channel is not a temp channel.')],
              ephemeral: true,
            });
          }

          if (row.owner_id === interaction.member.id) {
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are already the owner of this voice channel.')],
              ephemeral: true,
            });
          }

          const ownerMember = interaction.guild.members.cache.get(row.owner_id);
          if (ownerMember && ownerMember.voice.channelId === voiceChannel.id) {
            return interaction.reply({
              embeds: [createEmbed(`<:arcadiafalse:1381422467251306496> The current owner <@${row.owner_id}> is still connected to this channel.`)],
              ephemeral: true,
            });
          }

          db.run(
            `UPDATE temp_channels SET owner_id = ? WHERE channel_id = ?`,
            [interaction.member.id, voiceChannel.id],
            (updateErr) => {
              if (updateErr) {
                console.error('DB Error (update owner):', updateErr);
                return interaction.reply({
                  embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to claim ownership.')],
                  ephemeral: true,
                });
              }

              interaction.reply({
                embeds: [createEmbed(`<:arcadiatrue:1381421969055944707> You have claimed ownership of the voice channel **${voiceChannel.name}**.`)],
                ephemeral: true,
              });
            }
          );
        }
      );
    }

    async function openModal(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel.')],
          ephemeral: true,
        });
    
      const { authorized } = await isAuthorized(voiceChannel.id, interaction.member.id);
      if (!authorized)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are not authorized to use this modal.')],
          ephemeral: true,
        });
    
      let modal = new ModalBuilder().setCustomId(`${interaction.customId}_modal`);
    
      if (interaction.customId === 'permit' || interaction.customId === 'deny') {
        modal.setTitle(interaction.customId === 'permit' ? 'Permit a User' : 'Deny a User');
    
        const userInput = new TextInputBuilder()
          .setCustomId('target_user')
          .setLabel('Enter the user ID or mention')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 123456789012345678 or @username')
          .setRequired(true);
    
        modal.addComponents(new ActionRowBuilder().addComponents(userInput));
      } else if (interaction.customId === 'setVoiceLimit') {
        modal.setTitle('Set Voice Channel User Limit');
    
        const limitInput = new TextInputBuilder()
          .setCustomId('voice_limit')
          .setLabel('Enter voice channel user limit (0-99)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 10')
          .setRequired(true);
    
        modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
      } else if (interaction.customId === 'name') {
        modal.setTitle('Change Voice Channel Name');
    
        const nameInput = new TextInputBuilder()
          .setCustomId('voice_name')  // Unique input id for name
          .setLabel('Enter new voice channel name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. My Voice Channel')
          .setRequired(true);
    
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      }
    
      return interaction.showModal(modal);
    }
    
    
    async function handleModalSubmit(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You must be in a voice channel.')],
          ephemeral: true,
        });
    
      const { authorized, ownerId, isOwner } = await isAuthorized(voiceChannel.id, interaction.member.id);
      if (!authorized)
        return interaction.reply({
          embeds: [createEmbed('<:arcadiafalse:1381422467251306496> You are not authorized to use this modal.')],
          ephemeral: true,
        });
    
      if (interaction.customId === 'permit_modal' || interaction.customId === 'deny_modal') {
        const targetUserInput = interaction.fields.getTextInputValue('target_user').trim();
        let targetUserId = targetUserInput.replace(/[<@!>]/g, '');
    
        if (!/^\d{17,19}$/.test(targetUserId)) {
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Please enter a valid user ID or mention.')],
            ephemeral: true,
          });
        }
    
        const targetMember = interaction.guild.members.cache.get(targetUserId);
        if (!targetMember) {
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> User not found in this guild.')],
            ephemeral: true,
          });
        }
    
        if (interaction.customId === 'permit_modal') {
          try {
            await voiceChannel.permissionOverwrites.edit(targetMember, {
              Connect: true,
              Speak: true,
              ViewChannel: true,
            });
            return interaction.reply({
              embeds: [createEmbed(`<:arcadiatrue:1381421969055944707> Permitted <@${targetUserId}> to connect and speak in your voice channel.`)],
              ephemeral: true,
            });
          } catch (e) {
            console.error('Permit error:', e);
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to permit this user.')],
              ephemeral: true,
            });
          }
        }
    
        if (interaction.customId === 'deny_modal') {
          if (targetUserId === ownerId && !isOwner) {
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Managers cannot deny the owner.')],
              ephemeral: true,
            });
          }
    
          try {
            await voiceChannel.permissionOverwrites.edit(targetMember, {
              Connect: false,
              Speak: false,
              ViewChannel: false,
            });
            return interaction.reply({
              embeds: [createEmbed(`🚫 Denied <@${targetUserId}> from connecting or speaking in your voice channel.`)],
              ephemeral: true,
            });
          } catch (e) {
            console.error('Deny error:', e);
            return interaction.reply({
              embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to deny this user.')],
              ephemeral: true,
            });
          }
        }
      } else if (interaction.customId === 'setVoiceLimit_modal') {
        // Read the voice limit input value
        const limitInput = interaction.fields.getTextInputValue('voice_limit').trim();
      
        const limit = parseInt(limitInput, 10);
        if (isNaN(limit) || limit < 0 || limit > 99) {
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Please enter a valid number between 0 and 99.')],
            ephemeral: true,
          });
        }
      
        try {
          await voiceChannel.setUserLimit(limit);
          return interaction.reply({
            embeds: [createEmbed(`<:arcadiatrue:1381421969055944707> Set voice channel user limit to ${limit}.`)],
            ephemeral: true,
          });
        } catch (e) {
          console.error('SetVoiceLimit error:', e);
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to set voice channel user limit.')],
            ephemeral: true,
          });
        }
      }
      
      // <:arcadiatrue:1381421969055944707> NEW block: rename voice channel
      if (interaction.customId === 'name_modal') {
        const newName = interaction.fields.getTextInputValue('voice_name').trim();

        if (!newName || newName.length > 100) {
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Invalid channel name. Must be between 1 and 100 characters.')],
            ephemeral: true,
          });
        }

        try {
          await voiceChannel.setName(newName);
          return interaction.reply({
            embeds: [createEmbed(`<:arcadiatrue:1381421969055944707> Channel name changed to **${newName}**.`)],
            ephemeral: true,
          });
        } catch (error) {
          console.error('Error renaming channel:', error);
          return interaction.reply({
            embeds: [createEmbed('<:arcadiafalse:1381422467251306496> Failed to rename the voice channel.')],
            ephemeral: true,
          });
        }
      }
    }


if (interaction.isCommand()) {
  switch (interaction.commandName) {
    case 'lock': return lockChannel(interaction);
    case 'unlock': return unlockChannel(interaction);
    case 'claim': return claimChannel(interaction);
    case 'permit':
    case 'deny':
    case 'setVoiceLimit':
    case 'name':
      return openModal(interaction);
    default:
      return;
  }

} else if (interaction.isButton()) {
  const { customId } = interaction;

  if ([
    'lock', 'unlock', 'claim', 'permit', 'deny', 'setVoiceLimit', 'name', 'trash',
    'activities_on', 'activities_off',
    'camera_on', 'camera_off',
    'soundboard_on', 'soundboard_off'
  ].includes(customId)) {

    switch (customId) {
      case 'lock': return lockChannel(interaction);
      case 'unlock': return unlockChannel(interaction);
      case 'claim': return claimChannel(interaction);
      case 'permit':
      case 'deny':
      case 'setVoiceLimit':
      case 'name':
        return openModal(interaction);
      case 'trash': return clearPanelMessages(interaction);

      case 'activities_on':
        return handleFeatureToggle(
          interaction,
          PermissionsBitField.Flags.UseEmbeddedActivities,
          true,
          'Activities',
          '<:arcadiaactivities:1381390452304545822>'
        );
      case 'activities_off':
        return handleFeatureToggle(
          interaction,
          PermissionsBitField.Flags.UseEmbeddedActivities,
          false,
          'Activities',
          '<:arcadiaactivities:1381390452304545822>'
        );
      // same for camera/soundboard if needed
    }
  }
}
 else if (interaction.isModalSubmit()) {
  if (['permit_modal', 'deny_modal', 'setVoiceLimit_modal', 'name_modal'].includes(interaction.customId)) {
    return handleModalSubmit(interaction);
  }

}

  
}}
