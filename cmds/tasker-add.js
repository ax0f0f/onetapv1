const { TextDisplayBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'tasker-add',
  description: 'Add a tasker role to task settings.',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> You need Administrator permissions to use this command.');
    }

    const guildId = message.guild.id;
    let role = message.mentions.roles.first();

    if (!role && args[0]) {
      try {
        role = await message.guild.roles.fetch(args[0]);
      } catch {
        return sendReply('<:discotoolsxyzicon:1448758684535488562> Invalid role ID or mention.');
      }
    }

    if (!role) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please mention a role or provide a valid role ID.');
    }

    db.get(`SELECT taskers FROM task_settings WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error(err);
        return sendReply('⚠️ Database error occurred.');
      }

      let currentTaskers = row?.taskers ? row.taskers.split(',') : [];
      if (currentTaskers.includes(role.id)) {
        return sendReply('<:warn1:1448792086810726601> This role is already a tasker.');
      }

      currentTaskers.push(role.id);
      const updated = currentTaskers.join(',');

      db.run(`
        INSERT INTO task_settings (guild_id, taskers)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET taskers = excluded.taskers
      `, [guildId, updated], (err2) => {
        if (err2) {
          console.error(err2);
          return sendReply('⚠️ Failed to update tasker roles in the database.');
        }

        sendReply(`<:discotoolsxyzicon1:1448758665963110603> Role <@&${role.id}> has been added as a tasker.`);
      });
    });
  }
};
