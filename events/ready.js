module.exports = {
  name: "ready",
  once: true,
  execute(client) {

    console.log(`✅ Logged in as ${client.user.tag}`);

    // ⭕ Your custom presence
    client.user.setPresence({
      activities: [
        {
          name: ".v help | Made in Heaven By AxOf", 
          type: 3 
        }
      ],
      status: "dnd" 
    });

    console.log("👀 Presence set: Watching .v help | Made in Heaven By AxOf (DND)");
  }
};
