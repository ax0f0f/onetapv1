const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'man-add',
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
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a user mention or ID to add as manager.\nUsage: `.v man-add @user` or `.v man-add userID`');
    }

    const userId = userArg.match(/^<@!?(\d+)>$/)?.[1] || (userArg.match(/^\d{17,19}$/) ? userArg : null);
    if (!userId) {
      return sendReply('<:discotoolsxyzicon:1448758684535488562> Please provide a valid user mention or ID.');
    }

    db.all(`SELECT * FROM user_managers WHERE owner_id = ?`, [message.author.id], (err, rows) => {
      if (err) {
        console.error(err);
        return sendReply('<:discotoolsxyzicon:1448758684535488562> Database query error occurred.');
      }

      if (rows.length >= 6) {
        return sendReply('<:discotoolsxyzicon:1448758684535488562> Maximum number of managers (6) reached for you.');
      }

      db.get(`SELECT * FROM user_managers WHERE owner_id = ? AND manager_id = ?`, [message.author.id, userId], (err, row) => {
        if (err) {
          console.error(err);
          return sendReply('<:discotoolsxyzicon:1448758684535488562> Database query error occurred.');
        }

        if (row) {
          return sendReply('<:discotoolsxyzicon:1448758684535488562> This user is already your manager.');
        }

        db.run(`INSERT INTO user_managers (owner_id, manager_id) VALUES (?, ?)`, [message.author.id, userId], (err) => {
          if (err) {
            console.error(err);
            return sendReply('<:discotoolsxyzicon:1448758684535488562> Failed to add manager due to database error.');
          }

          sendReply(`<:discotoolsxyzicon1:1448758665963110603> Successfully added <@${userId}> as your manager.`);
        });
      });
    });
  }
};
