const { TextDisplayBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'tman-remove',
  description: 'Remove a manager role from task settings.',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };
    // Check admin permission
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

    // Fetch current managers
    db.get(`SELECT managers FROM task_settings WHERE guild_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error('DB error:', err);
        return sendReply('⚠️ Database error occurred.');
      }

      if (!row?.managers) {
        return sendReply('<:warn1:1448792086810726601> No manager roles are configured yet.');
      }

      let currentManagers = row.managers.split(',');
      if (!currentManagers.includes(role.id)) {
        return sendReply('<:warn1:1448792086810726601> This role is not listed as a manager.');
      }

      // Remove role ID
      currentManagers = currentManagers.filter(id => id !== role.id);
      const updatedManagers = currentManagers.join(',');

      db.run(`
        UPDATE task_settings SET managers = ? WHERE guild_id = ?
      `, [updatedManagers, guildId], (err2) => {
        if (err2) {
          console.error('DB error on update:', err2);
          return sendReply('<:warn1:1448792086810726601> Failed to update manager roles in the database.');
        }

        sendReply(`<:discotoolsxyzicon1:1448758665963110603> Role <@&${role.id}> has been removed from managers.`);
      });
    });
  }
};
