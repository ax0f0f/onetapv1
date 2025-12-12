const {
  ChannelType,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  OverwriteType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('discord.js');
const axios = require("axios"); // Make sure axios is imported at the top of this file

const cooldown = new Set();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client, db) {
    const sendDM = async (member, content) => {
        try {
            const textComponent = new TextDisplayBuilder().setContent(content);
            const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
            await member.send({
                flags: MessageFlags.IsComponentsV2,
                components: [containerComponent],
            });
        } catch (e) {
            console.warn('Could not DM user:', e.message);
        }
    };
    if (!newState.guild) return;

    const guildId = newState.guild.id;
    const userId = newState.id;

    db.get(`SELECT room_id FROM guild_config WHERE guild_id = ?`, [guildId], async (err, row) => {
      if (err) return console.error(err);
      if (!row) return;

      const tempRoomId = row.room_id;

      // User joins temp room
      if (
        (!oldState.channelId || oldState.channelId !== tempRoomId) &&
        newState.channelId === tempRoomId
      ) {
        // Cooldown check
        if (cooldown.has(userId)) {
          const dmContent = `**😈 I Caught You!**\nYou tried to bug the system.\n\n> **Nice try daddy.**\n> Leave the trigger voice channel and wait **3 seconds** before trying again.`;
          await sendDM(newState.member, dmContent);
          return;
        }

        cooldown.add(userId);
        setTimeout(() => cooldown.delete(userId), 3000); // 3s cooldown

        try {
          const parentCategory = newState.guild.channels.cache.get(tempRoomId)?.parent;
          const channelName = ` ${newState.member.displayName}`;

          const newVoiceChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: parentCategory?.id || null,
            lockPermissions: true,
          });
          try {
            const url = `https://discord.com/api/v10/channels/${newVoiceChannel.id}/voice-status`;
            const payload = { status: `**${newState.guild.name}**` };
          
            await axios.put(url, payload, {
              headers: {
                Authorization: `Bot ${client.token}`,
                'Content-Type': 'application/json',
              },
            });
          
            console.log(`Voice status set to server name "${newState.guild.name}" for channel ${newVoiceChannel.name}`);
          } catch (err) {
            console.error('Failed to update voice status for new voice channel:', err?.response?.data || err.message);
          }
          // 1. Sync permissions with category first
          if (parentCategory) {
            const parentOverwrites = parentCategory.permissionOverwrites.cache.map(overwrite => ({
              id: overwrite.id,
              allow: overwrite.allow,
              deny: overwrite.deny,
              type: overwrite.type,
            }));
            await newVoiceChannel.permissionOverwrites.set(parentOverwrites).catch(console.error);
          }

          // 2. Add whitelist and blacklist overwrites
          db.all(
            `SELECT whitelisted_id FROM whitelist_users WHERE owner_id = ? AND guild_id = ?`,
            [userId, guildId],
            async (err, whitelistRows) => {
              if (err) return console.error('DB whitelist fetch error:', err);

              db.all(
                `SELECT blacklisted_id FROM blacklist_users WHERE owner_id = ? AND guild_id = ?`,
                [userId, guildId],
                async (err2, blacklistRows) => {
                  if (err2) return console.error('DB blacklist fetch error:', err2);

                  const permissionOverwrites = [...newVoiceChannel.permissionOverwrites.cache.values()].map(overwrite => ({
                    id: overwrite.id,
                    allow: overwrite.allow,
                    deny: overwrite.deny,
                    type: overwrite.type,
                  }));

                  if (whitelistRows?.length) {
                    for (const wlUser of whitelistRows) {
                      try {
                        const member = await newState.guild.members.fetch(wlUser.whitelisted_id).catch(() => null);
                        if (member) {
                          permissionOverwrites.push({
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect],
                            type: OverwriteType.Member,
                          });
                        }
                      } catch {}
                    }
                  }

                  if (blacklistRows?.length) {
                    for (const blUser of blacklistRows) {
                      try {
                        const member = await newState.guild.members.fetch(blUser.blacklisted_id).catch(() => null);
                        if (member) {
                          permissionOverwrites.push({
                            id: member.id,
                            deny: [PermissionFlagsBits.Connect],
                            type: OverwriteType.Member,
                          });
                        }
                      } catch {}
                    }
                  }

                  // Apply whitelist & blacklist overwrites now
                  await newVoiceChannel.permissionOverwrites.set(permissionOverwrites).catch(console.error);

                  // 3. Finally, **explicitly allow the owner full voice permissions**
                  await newVoiceChannel.permissionOverwrites.edit(newState.member.id, {
                    Connect: true,
                    Speak: true,
                    ViewChannel: true,
                  }).catch(console.error);
                }
              );
            }
          );

          // Safe move check
          if (newState.channel) {
            try {
              await newState.setChannel(newVoiceChannel);
            } catch (err) {
              console.error('❌ Failed to move user into new voice channel:', err.message);
            }
          } else {
            console.warn('<:warn1:1448792086810726601> User left before being moved. Deleting temp VC...');
            try {
              await newVoiceChannel.delete('User left before being moved into temp VC.');
              db.run(`DELETE FROM temp_channels WHERE channel_id = ?`, [newVoiceChannel.id], (err) => {
                if (err) console.error('Failed to delete temp channel from DB:', err);
              });
            } catch (err) {
              console.error('Error deleting temp channel after user left:', err.message);
            }
            return;
          }

          db.run(
            `INSERT OR REPLACE INTO temp_channels (channel_id, owner_id, guild_id) VALUES (?, ?, ?)`,
            [newVoiceChannel.id, userId, guildId],
            (err) => {
              if (err) console.error('Failed to save temp channel:', err);
            }
          );

          setTimeout(async () => {
            const stillExists = newVoiceChannel.guild.channels.cache.has(newVoiceChannel.id);
            if (stillExists && newVoiceChannel.members.size === 0) {
              try {
                await newVoiceChannel.delete('Empty temp VC after 3s');
                db.run(`DELETE FROM temp_channels WHERE channel_id = ?`, [newVoiceChannel.id], (err) => {
                  if (err) console.error('Failed to remove temp channel from DB:', err);
                });
              } catch (error) {
                console.error('Auto-delete error:', error);
              }
            }
          }, 3000);

                  const panelContent = [
                    ` # Control Panel `,
                    `> **•  <@${userId}> mrhba bik f Tap dylk.**
> **•  We are honored by your presence in our community and hope you will be valued guests.**`,
                    `[Developed by ax0f](https://discord.gg/hmm7u4rCrk)`
                  ].join('\n');

                  const mentionComponent = new TextDisplayBuilder().setContent(`${newState.guild.name}`);
                  const textComponent = new TextDisplayBuilder().setContent(panelContent);

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
                        new StringSelectMenuOptionBuilder()
                          .setLabel('sb - ON')
                          .setValue('soundboard_on')
                          .setEmoji('<:arcadiasbon:1448781948196753609>'),
                        new StringSelectMenuOptionBuilder()
                          .setLabel('sb - OFF')
                          .setValue('soundboard_off')
                          .setEmoji('<:arcadiasboff:1448781989846188106>'),
                        new StringSelectMenuOptionBuilder()
                          .setLabel('Cam - ON')
                          .setValue('camera_on')
                          .setEmoji('<:arcadiacamon:1448782034796544150>'),
                        new StringSelectMenuOptionBuilder()
                          .setLabel('Cam - OFF')
                          .setValue('camera_off')
                          .setEmoji('<:arcadiacamoff:1448782170775621681>'),
                        new StringSelectMenuOptionBuilder()
                          .setLabel('Activities - ON')
                          .setValue('activities_on')
                          .setEmoji('<:acradiaacton:1448782206138056796>'),
                        new StringSelectMenuOptionBuilder()
                          .setLabel('Activities - OFF')
                          .setValue('activities_off')
                          .setEmoji('<:arcadiaactoff:1448782244289445989>')
                      )
                  );

                  const mediaGallery = new MediaGalleryBuilder()
                    .addItems(
                      mediaGalleryItem => mediaGalleryItem
                        .setURL('https://cdn.discordapp.com/attachments/1400466495833772236/1400469462091698409/30770-nxvaxo.gif?ex=693c17d3&is=693ac653&hm=f91834b5d437ecc9a14862fc4a848d51d9e0bfc7c01ea30816c8484ce013ddaa&')
                    );

                  const containerComponent = new ContainerBuilder()
                    .addTextDisplayComponents(mentionComponent, textComponent)
                    .addMediaGalleryComponents(mediaGallery)
                    .addActionRowComponents(row3, row1, row2);

                  await newVoiceChannel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components: [containerComponent]
                  });

        } catch (error) {
          console.error('Error creating temp voice channel:', error);
        }
      }

      // Check for empty temp channel to delete on leave
      if (oldState.channelId) {
        db.get(`SELECT owner_id FROM temp_channels WHERE channel_id = ?`, [oldState.channelId], async (err, tempRow) => {
          if (err) return console.error(err);
          if (!tempRow) return;

          const tempChannel = oldState.guild.channels.cache.get(oldState.channelId);
          if (!tempChannel) {
            db.run(`DELETE FROM temp_channels WHERE channel_id = ?`, [oldState.channelId], (err) => {
              if (err) console.error('Failed to delete temp channel from DB:', err);
            });
            return;
          }

          if (tempChannel.members.size === 0) {
            try {
              await tempChannel.delete('Temp voice channel empty, deleting...');
              db.run(`DELETE FROM temp_channels WHERE channel_id = ?`, [oldState.channelId], (err) => {
                if (err) console.error('Failed to delete temp channel from DB:', err);
              });
            } catch (error) {
              console.error('Failed to delete temp voice channel:', error);
            }
          }
        });
      }
    });
  },
};
