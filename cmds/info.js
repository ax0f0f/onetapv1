const { TextDisplayBuilder, ContainerBuilder, MessageFlags, PermissionsBitField, OverwriteType } = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Show voice channel info.',
  usage: '.v info',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    console.log('✅ .v info triggered');

    const guild = message.guild;
    const member = message.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You must be in a voice channel to use this command.');
    }

    const guildId = guild.id;
    const voiceChannelId = voiceChannel.id;

    console.log(`🔍 Checking DB for channel ${voiceChannelId} in guild ${guildId}`);

    db.get(
      `SELECT owner_id FROM temp_channels WHERE channel_id = ? AND guild_id = ?`,
      [voiceChannelId, guildId],
      async (err, row) => {
        if (err) {
          console.error('❌ DB error:', err);
          return sendReply('❌ Database error occurred.');
        }

        let ownerMention = 'Not managed by bot';
        if (row) {
          try {
            const ownerMember = await guild.members.fetch(row.owner_id);
            ownerMention = ownerMember.toString();
          } catch (e) {
            console.warn('⚠️ Could not fetch owner:', e);
            ownerMention = `<@${row.owner_id}>`;
          }
        }

        const connectedMembers = voiceChannel.members.map(m => m.toString());

        const deniedMembers = [];
        for (const [id, overwrite] of voiceChannel.permissionOverwrites.cache) {
          if (
            overwrite.type === OverwriteType.Member &&
            overwrite.deny.has(PermissionsBitField.Flags.Connect)
          ) {
            try {
              const deniedMember = await guild.members.fetch(id);
              deniedMembers.push(deniedMember.toString());
            } catch (err) {
              console.warn(`⚠️ Could not fetch denied member (${id}):`, err.message);
              deniedMembers.push(`<@${id}>`);
            }
          }
        }

        const replyContent = [
          `**<:info:1448785612743377007> Info for: ${voiceChannel.name}**`,
          `**<:couronne1Copy:1448781704000180315> Owner:** ${ownerMention}`,
          `**<:id1:1448786549285195877> Channel ID:** \`${voiceChannelId}\``,
          ' ',
          `**<:ajoutdutilisateur:1448781790444650707> Members in voice:**`,
          connectedMembers.length > 0 ? connectedMembers.join('\n') : '*None*',
          ' ',
          `**<:supprimerlutilisateur:1448781831074873507> Rejected Members:**`,
          deniedMembers.length > 0 ? deniedMembers.join('\n') : '*None*'
        ].join('\n');

        return sendReply(replyContent);
      }
    );
  }
};
