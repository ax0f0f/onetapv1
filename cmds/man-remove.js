const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'man-remove',
  description: 'Remove a manager from your manager list.',
  usage: '.v man-remove @user or .v man-remove userID',
  async execute(message, args, client, db) {
    const sendReply = (content) => {
        const textComponent = new TextDisplayBuilder().setContent(content);
        const containerComponent = new ContainerBuilder().addTextDisplayComponents(textComponent);
        message.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [containerComponent],
        });
    };

    const userArg = args[0];
    if (!userArg) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user mention or ID to remove as manager.\nUsage: `.v man-remove @user` or `.v man-remove userID`');
    }

    const managerId = userArg.match(/^<@!?(\d+)>$/)?.[1] || (userArg.match(/^\d{17,19}$/) ? userArg : null);
    if (!managerId) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a valid user mention or ID.');
    }

    const ownerId = message.author.id;

    db.run(`
      CREATE TABLE IF NOT EXISTS user_managers (
        owner_id TEXT,
        manager_id TEXT,
        PRIMARY KEY (owner_id, manager_id)
      )
    `, (err) => {
      if (err) {
        console.error(err);
        return sendReply('<:discotoolsxyzicon:1448758684535488562> Database error occurred while ensuring table exists.');
      }

      db.get(`SELECT * FROM user_managers WHERE owner_id = ? AND manager_id = ?`, [ownerId, managerId], (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database query error occurred.');
        }

        if (!row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This user is not your manager.');
        }

        db.run(`DELETE FROM user_managers WHERE owner_id = ? AND manager_id = ?`, [ownerId, managerId], (err) => {
          if (err) {
            console.error(err);
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to remove manager due to database error.');
          }

          sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully removed <@${managerId}> from your managers.`);
        });
      });
    });
  }
};
