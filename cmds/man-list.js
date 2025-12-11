const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'man-list',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    db.run(`
      CREATE TABLE IF NOT EXISTS user_managers (
        owner_id TEXT,
        manager_id TEXT,
        PRIMARY KEY (owner_id, manager_id)
      )
    `, (err) => {
      if (err) {
        console.error(err);
        return sendReply('<:arcadiafalse:1381422467251306496> Database error occurred.');
      }

      db.all(`SELECT manager_id FROM user_managers WHERE owner_id = ?`, [message.author.id], async (err, rows) => {
        if (err) {
          console.error(err);
          return sendReply('<:arcadiafalse:1381422467251306496> Failed to fetch your manager list from the database.');
        }

        if (!rows.length) {
          return sendReply('ℹ️ You have no managers set yet.');
        }

        const managers = rows.map(r => {
          const user = message.guild.members.cache.get(r.manager_id);
          return user ? `${user.user.tag} (<@${r.manager_id}>)` : `Unknown User (<@${r.manager_id}>)`;
        });

        const description = `🛡️ **Your managers:**\n${managers.join('\n')}`;

        sendReply(description);
      });
    });
  }
};
