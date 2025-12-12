// cmds/ping.js

module.exports = {
    // --- 1. COMMAND METADATA ---
    name: "ping", // The command name (users will type .vping)
    description: "Checks the bot's latency.",
    // You can add more metadata if your bot uses it:
    // category: "Utility", 
    // aliases: ["latency", "speed"], 
    
    // --- 2. COMMAND EXECUTION ---
    // The arguments usually passed are (message, args, client, ...)
    async execute(message, args, client) {
        // 'message' is the Discord Message object that triggered the command.
        // 'client' is the Discord client object (your bot instance).

        // Send an initial reply to get the timestamp quickly
        const sent = await message.reply({ 
            content: 'Pinging...', 
            fetchReply: true // Get the Message object of the bot's reply
        });
        
        // Calculate the two types of latency:
        
        // 1. **Response Latency (User to Bot Reply):** //    The time elapsed between the command message being created and the bot's reply message being created.
        const responseLatency = sent.createdTimestamp - message.createdTimestamp;

        // 2. **API Latency (Bot to Discord Gateway):**
        //    The latency of the bot's connection to the Discord API (Ping).
        const apiLatency = Math.round(client.ws.ping);

        // Edit the initial "Pinging..." message with the results
        sent.edit({
            content: `🏓 **Pong!**
            **Response Latency:** ${responseLatency}ms
            **API Latency:** ${apiLatency}ms`
        });
    }
};
