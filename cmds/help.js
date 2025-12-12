const {
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  MediaGalleryBuilder, // Imported
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SeparatorBuilder,
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// --- Helper function to count lines ---
async function countLines() {
  const targetDirs = ['.', './cmds', './events'];
  const allowedExtensions = ['.js'];
  const excludedDirs = ['node_modules', '.git', 'sqlite', 'database', 'data'];
  let totalLines = 0;

  async function countLinesInFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return content.split('\n').length;
  }

  async function scanDirectory(dirPath) {
    const entries = await fs.readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        if (!excludedDirs.includes(entry)) await scanDirectory(fullPath);
      } else if (allowedExtensions.includes(path.extname(entry))) {
        totalLines += await countLinesInFile(fullPath);
      }
    }
  }

  for (const dir of targetDirs) {
    await scanDirectory(path.resolve(dir));
  }
  return totalLines;
}

// --- Command Data ---
const helpData = {
  voice: {
    label: 'Voice Commands',
    description: 'Commands for voice channel management.',
    commands: [
      { name: 'lock', value: 'Close your channel to everyone.' },
      { name: 'unlock', value: 'Open your channel for everyone.' },
      { name: 'permit', value: 'Allow a specific user to join.' },
      { name: 'deny', value: 'Prevent a specific user from joining.' },
      { name: 'kick', value: 'Remove a user from your channel.' },
      { name: 'limit', value: 'Set a user limit for your channel.' },
      { name: 'name', value: 'Change your channel’s name.' },
      { name: 'claim', value: 'Claim ownership of an empty channel.' },
      { name: 'transfer', value: 'Transfer ownership to another user.' },
    ],
  },
  setup: {
    label: 'Setup Commands',
    description: 'Commands for server administrators to configure the bot.',
    commands: [
      { name: '.v setup-room', value: 'Update One Tap Voice.' },
      { name: '.v auto-setup', value: 'Automatically set up the one Tap category with One Tap voice and interface channels.' },
      { name: '.v set-event-manager', value: 'Set the event manager role.' },
      { name: '.v set-event-category', value: 'Set the category for event channels.' },
      { name: '.v set-event-logs', value: 'Set the channel for event logs.' },
    ],
  },
  manager: {
    label: 'Manager Commands',
    description: 'Commands to manage bot managers.',
    commands: [
      { name: 'man-add', value: 'Add a manager.' },
      { name: 'man-remove', value: 'Remove a manager.' },
      { name: 'man-clear', value: 'Clear all managers.' },
    ],
  },
  whitelist: {
    label: 'Whitelist Commands',
    description: 'Manage users who can bypass channel locks.',
    commands: [
      { name: 'wl-add', value: 'Add a user to your whitelist.' },
      { name: 'wl-remove', value: 'Remove a user from your whitelist.' },
      { name: 'wl-list', value: 'View your whitelisted users.' },
    ],
  },
  blacklist: {
    label: 'Blacklist Commands',
    description: 'Manage users who are banned from your channels.',
    commands: [
      { name: 'bl-add', value: 'Add a user to your blacklist.' },
      { name: 'bl-remove', value: 'Remove a user from your blacklist.' },
      { name: 'bl-list', value: 'View your blacklisted users.' },
    ],
  },
};

module.exports = {
  name: 'help',
  description: 'Show bot help with category select menu',
  async execute(message, args, client) {
    if (!message.content.toLowerCase().startsWith('.v help')) return;

    const totalLines = await countLines();
    const serverLink = 'https://discord.gg/hmm7u4rCrk';

    // --- Builders ---
    const mediaGallery = new MediaGalleryBuilder().addItems(item =>
        item.setURL('https://cdn.discordapp.com/attachments/1400466495833772236/1400469462091698409/30770-nxvaxo.gif?ex=693c17d3&is=693ac653&hm=f91834b5d437ecc9a14862fc4a848d51d9e0bfc7c01ea30816c8484ce013ddaa&')
    );

    const titleText = new TextDisplayBuilder().setContent('# Pivot Help Center');

    const descriptionText = new TextDisplayBuilder().setContent(
      `> **Pivot** ➕ creates smooth, secure, and instant temporary voice channels on Discord`
    );
    const footerText = new TextDisplayBuilder().setContent(`[Developed by ax0f](https://discord.gg/hmm7u4rCrk)`);

    // --- Interactive Components ---
    const selectMenuOptions = Object.keys(helpData).map(key => ({
      label: helpData[key].label,
      description: helpData[key].description,
      value: key,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category-select')
      .setPlaceholder('Choose a command category')
      .addOptions(selectMenuOptions);

    const linkButton = new ButtonBuilder()
      .setLabel('Support Server')
      .setEmoji('<:discotoolsxyzicon2:1448758560019189802>')
      .setStyle(ButtonStyle.Link)
      .setURL(serverLink);

    const separator = new SeparatorBuilder();
    const buttonActionRow = new ActionRowBuilder().addComponents(linkButton);

    const menuActionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Manually construct the JSON payload (Initial Message)
    const mainPayload = {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: 17, // Container
          components: [
            titleText.toJSON(),
            descriptionText.toJSON(),
            footerText.toJSON(),
             // Adding the Media Gallery here
             mediaGallery.toJSON(),
            separator.toJSON(),
            menuActionRow.toJSON(),
            buttonActionRow.toJSON(),
          ],
        },
      ],
    };

    const sentMessage = await message.channel.send(mainPayload);

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000, // 2 minutes
      filter: i => i.user.id === message.author.id,
    });

    collector.on('collect', async interaction => {
      const selectedKey = interaction.values[0];
      const category = helpData[selectedKey];

      // --- Category Help Components ---
      const categoryTitle = new TextDisplayBuilder().setContent(`# ${category.label}`);

      const categoryDescription = new TextDisplayBuilder().setContent(category.description);
      const commandTexts = category.commands.map(cmd => 
        new TextDisplayBuilder().setContent(`**\`${cmd.name}\`**: ${cmd.value}`)
      );
      const categoryFooter = new TextDisplayBuilder().setContent(`*Developed by ax0f • Use the menu to switch categories.*`);

      const categoryPayload = {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: 17, // Container
            components: [
              categoryTitle.toJSON(),
              categoryDescription.toJSON(),
              ...commandTexts.map(c => c.toJSON()),
              categoryFooter.toJSON(),
             // Adding the Media Gallery here to persist across updates
             mediaGallery.toJSON(), 
              separator.toJSON(),
              menuActionRow.toJSON(),
              buttonActionRow.toJSON(),
            ],
          },
        ],
      };

      await interaction.update(categoryPayload);
    });

    collector.on('end', async () => {
      try {
        const disabledMenuActionRow = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
        const finalPayload = {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: 17, // Container
              components: [
                titleText.toJSON(),
                descriptionText.toJSON(),
                footerText.toJSON(),
                 // Adding the Media Gallery here
                 mediaGallery.toJSON(),
                separator.toJSON(),
                disabledMenuActionRow.toJSON(),
                buttonActionRow.toJSON(),
              ],
            },
          ],
        };
        await sentMessage.edit(finalPayload);
      } catch (error) {
        console.error('Failed to disable help menu:', error);
      }
    });
  },
};