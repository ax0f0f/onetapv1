const {
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  name: 'panel',
  description: 'Send the voice room control panel.',
  async execute(message, args, client) {
    // Optional: restrict to admins or your own ID
    // if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const titleText = new TextDisplayBuilder().setContent(`# Voice Channel Control Panel`);
    const descriptionText = new TextDisplayBuilder().setContent(`> As a voice channel owner, you can manage your room using the buttons below.`);
    const footerText = new TextDisplayBuilder().setContent(`[Developed by ichbi9o](https://discord.gg/hmm7u4rCrk)`);

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lock').setEmoji('<:controledacces:1400312918695874640>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('unlock').setEmoji('<:accesrefuse:1400312914845634653>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('claim').setEmoji('<:couronne1Copy:1400312921698861076>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('setVoiceLimit').setEmoji('<:arcadialimit:1381416262483050589>').setStyle(ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('permit').setEmoji('<:ajoutdutilisateur:1400312916263178283>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('deny').setEmoji('<:supprimerlutilisateur:1400312929156464660>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('trash').setEmoji('<:poubelle:1400312926975295598>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('name').setEmoji('<:acadiarename:1381416711001079809>').setStyle(ButtonStyle.Secondary)
    );
    
    const row3 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('features_menu')
        .setPlaceholder('🔧 Channel Features')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('sb - ON')
            .setValue('soundboard_on')
            .setEmoji('<:arcadiasbon:1384183874405273681>'),
          new StringSelectMenuOptionBuilder()
            .setLabel('sb - OFF')
            .setValue('soundboard_off')
            .setEmoji('<:arcadiasboff:1384185071304445963>'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Cam - ON')
            .setValue('camera_on')
            .setEmoji('<:arcadiacamon:1384185720293560451>'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Cam - OFF')
            .setValue('camera_off')
            .setEmoji('<:arcadiacamoff:1384186030592102461>'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Activities - ON')
            .setValue('activities_on')
            .setEmoji('<:acradiaacton:1384186660731883570>'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Activities - OFF')
            .setValue('activities_off')
            .setEmoji('<:arcadiaactoff:1384186982443384842>')
        )
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(titleText, descriptionText, footerText)
        .addActionRowComponents(row3, row1, row2);

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
