const {
  TextDisplayBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

module.exports = {
  name: 'panel',
  description: 'Send the voice room control panel.',
  async execute(message, args, client) {

    // Text components
    const titleText = new TextDisplayBuilder().setContent(`# Voice Channel Control Panel`);
    const descriptionText = new TextDisplayBuilder().setContent(`> As a voice channel owner, you can manage your room using the buttons below.`);
    const footerText = new TextDisplayBuilder().setContent(`[Developed by ax0f](https://discord.gg/hmm7u4rCrk)`);

    // Buttons
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lock').setEmoji('<:controledacces:1448781573985009826>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('unlock').setEmoji('<:accesrefuse:1448781645833568287>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('claim').setEmoji('<:couronne1Copy:1448781704000180315>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('setVoiceLimit').setEmoji('<:arcadialimit:1448781741459505443>').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('permit').setEmoji('<:ajoutdutilisateur:1448781790444650707>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('deny').setEmoji('<:supprimerlutilisateur:1448781831074873507>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('trash').setEmoji('<:poubelle:1400312926975295598>').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('name').setEmoji('<:acadiarename:1448781911735402498>').setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('features_menu')
        .setPlaceholder('Channel Features')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('sb - ON').setValue('soundboard_on').setEmoji('<:arcadiasbon:1448781948196753609>'),
          new StringSelectMenuOptionBuilder().setLabel('sb - OFF').setValue('soundboard_off').setEmoji('<:arcadiasboff:1448781989846188106>'),
          new StringSelectMenuOptionBuilder().setLabel('Cam - ON').setValue('camera_on').setEmoji('<:arcadiacamon:1448782034796544150>'),
          new StringSelectMenuOptionBuilder().setLabel('Cam - OFF').setValue('camera_off').setEmoji('<:arcadiacamoff:1448782170775621681>'),
          new StringSelectMenuOptionBuilder().setLabel('Activities - ON').setValue('activities_on').setEmoji('<:acradiaacton:1448782206138056796>'),
          new StringSelectMenuOptionBuilder().setLabel('Activities - OFF').setValue('activities_off').setEmoji('<:arcadiaactoff:1448782244289445989>')
        )
    );

    // Media gallery (animated GIF example)
    const mediaGallery = new MediaGalleryBuilder().addItems(item =>
      item.setURL('https://cdn.discordapp.com/attachments/1400466495833772236/1400469462091698409/30770-nxvaxo.gif?ex=693c17d3&is=693ac653&hm=f91834b5d437ecc9a14862fc4a848d51d9e0bfc7c01ea30816c8484ce013ddaa&')
    );

    // Container with text, media, and buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(titleText, descriptionText, footerText)
      .addMediaGalleryComponents(mediaGallery)
      .addActionRowComponents(row3, row1, row2);

    // Send the panel
    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
