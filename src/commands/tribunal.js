const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'tribunal',
    data: new SlashCommandBuilder()
        .setName('tribunal')
        .setDescription('Ouvrir un procès avec accusé et avocat du plaignant')
        .addUserOption(option =>
            option.setName('accusé')
                .setDescription('La personne accusée')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('avocat')
                .setDescription('L\'avocat du plaignant')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('chef-accusation')
                .setDescription('Le chef d\'accusation (motif du procès)')
                .setRequired(true)
                .setMaxLength(200))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const accuse = interaction.options.getUser('accusé');
        const avocatPlaignant = interaction.options.getUser('avocat');
        const chefAccusation = interaction.options.getString('chef-accusation');
        const plaignant = interaction.user;
        const guild = interaction.guild;

        // Vérifications
        if (accuse.bot) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas accuser un bot.', ephemeral: true });
        }
        if (avocatPlaignant.bot) {
            return interaction.reply({ content: '❌ L\'avocat ne peut pas être un bot.', ephemeral: true });
        }
        if (accuse.id === plaignant.id) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas vous accuser vous-même.', ephemeral: true });
        }
        if (avocatPlaignant.id === plaignant.id) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas être votre propre avocat.', ephemeral: true });
        }
        if (accuse.id === avocatPlaignant.id) {
            return interaction.reply({ content: '❌ L\'accusé ne peut pas être son propre avocat.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            // Créer/récupérer les rôles
            let roleAccuse = guild.roles.cache.find(r => r.name === '⚖️ Accusé');
            if (!roleAccuse) {
                roleAccuse = await guild.roles.create({
                    name: '⚖️ Accusé',
                    color: 0xFF0000, // Rouge
                    reason: 'Rôle pour les procès',
                });
            }

            let roleAvocat = guild.roles.cache.find(r => r.name === '👔 Avocat');
            if (!roleAvocat) {
                roleAvocat = await guild.roles.create({
                    name: '👔 Avocat',
                    color: 0x2196F3, // Bleu
                    reason: 'Rôle pour les avocats',
                });
            }

            // Créer/récupérer la catégorie
            let categorie = guild.channels.cache.find(c => c.name === '⚖️ TRIBUNAUX' && c.type === ChannelType.GuildCategory);
            if (!categorie) {
                categorie = await guild.channels.create({
                    name: '⚖️ TRIBUNAUX',
                    type: ChannelType.GuildCategory,
                });
            }

            // Créer le channel tribunal
            const channelName = `⚖️│proces-de-${accuse.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            const tribunalChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categorie.id,
                topic: `⚖️ Procès | Plaignant: ${plaignant.id} | Accusé: ${accuse.id} | AvocatPlaignant: ${avocatPlaignant.id} | AvocatDefense: null | Juge: null | ChefAccusation: ${Buffer.from(chefAccusation).toString('base64')}`,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: guild.roles.everyone,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AddReactions
                        ],
                    },
                ],
            });

            // Attribuer les rôles
            const accuseMember = await guild.members.fetch(accuse.id);
            const avocatPlaignantMember = await guild.members.fetch(avocatPlaignant.id);
            
            await accuseMember.roles.add(roleAccuse);
            await avocatPlaignantMember.roles.add(roleAvocat);

            // Embed d'ouverture
            const embed = {
                color: 0x5865F2,
                title: '⚖️ OUVERTURE DU PROCÈS',
                description: `**Un nouveau procès a été ouvert !**\n\n📋 **Chef d'accusation :** ${chefAccusation}\n\n👤 **Plaignant :** ${plaignant}\n👔 **Avocat du plaignant :** ${avocatPlaignant} ${roleAvocat}\n⚠️ **Accusé :** ${accuse} ${roleAccuse}\n👔 **Avocat de la défense :** *En attente de sélection par l'accusé*\n👨‍⚖️ **Juge :** Aucun (utilisez le bouton ci-dessous)`,
                timestamp: new Date(),
                footer: { text: '⚖️ Système de Tribunal' },
            };

            // Bouton pour devenir juge
            const jugeButton = new ButtonBuilder()
                .setCustomId('tribunal_devenir_juge:' + tribunalChannel.id)
                .setLabel('👨‍⚖️ Devenir Juge')
                .setStyle(ButtonStyle.Primary);
            
            const buttonRow = new ActionRowBuilder().addComponents(jugeButton);

            // Message permanent
            await tribunalChannel.send({ embeds: [embed], components: [buttonRow] });

            // Menu de sélection pour l'avocat de la défense (visible uniquement par l'accusé)
            const members = await guild.members.fetch();
            const availableMembers = members.filter(m => 
                !m.user.bot && 
                m.id !== accuse.id && 
                m.id !== avocatPlaignant.id
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('tribunal_select_avocat_defense:' + tribunalChannel.id)
                .setPlaceholder('Sélectionnez votre avocat de la défense')
                .addOptions(
                    Array.from(availableMembers.values()).slice(0, 25).map(member => ({
                        label: member.user.username,
                        description: `ID: ${member.id}`,
                        value: member.id,
                    }))
                );

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            await tribunalChannel.send({
                content: `${accuse}, veuillez sélectionner votre avocat de la défense :`,
                components: [selectRow],
            });

            await interaction.editReply({
                content: `✅ Procès ouvert dans ${tribunalChannel} !\n\n⚠️ ${accuse}, veuillez sélectionner votre avocat de la défense dans le channel.`,
            });

        } catch (error) {
            console.error('Erreur lors de la création du tribunal:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue : ${error.message}`,
            });
        }
    },
};
