const { EmbedBuilder, Events, PermissionsBitField } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client, db) {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'features_menu') return;
    if (!interaction.guild || !interaction.channel) return;

    const member = interaction.member;
    const channel = interaction.channel;
    const selected = interaction.values[0];

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

    const auth = await isAuthorized(channel.id, member.id);
    if (!auth.authorized) {
      return interaction.reply({
        ephemeral: true,
        embeds: [createEmbed('<:traverser:1400313375547850877> Only the voice channel owner or their managers can use this menu.')],
      });
    }

    try {
      let response;

      switch (selected) {
        case 'soundboard_on':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.UseSoundboard]: true,
          });
          response = '<:arcadiasbon:1384183874405273681> Soundboard enabled in this channel.';
          break;

        case 'soundboard_off':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.UseSoundboard]: false,
          });
          response = '<:arcadiasboff:1384185071304445963> Soundboard disabled in this channel.';
          break;

        case 'camera_on':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.Stream]: true,
          });
          response = '<:arcadiacamon:1384185720293560451> Camera (stream) enabled in this channel.';
          break;

        case 'camera_off':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.Stream]: false,
          });
          response = '<:arcadiacamoff:1384186030592102461> Camera (stream) disabled in this channel.';
          break;

        case 'activities_on':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.UseExternalApps]: true,
          });
          response = '<:acradiaacton:1384186660731883570> Activities enabled in this channel.';
          break;

        case 'activities_off':
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            [PermissionsBitField.Flags.UseExternalApps]: false,
          });
          response = '<:arcadiaactoff:1384186982443384842> Activities disabled in this channel.';
          break;

        default:
          response = '<:traverser:1400313375547850877> Unknown selection.';
      }

      await interaction.reply({
        ephemeral: true,
        embeds: [createEmbed(response)],
      });

    } catch (err) {
      console.error('<:traverser:1400313375547850877> Feature menu error:', err);
      await interaction.reply({
        ephemeral: true,
        embeds: [createEmbed('<:traverser:1400313375547850877> Something went wrong while applying the feature.', 0xff0000)],
      });
    }
  }
};
