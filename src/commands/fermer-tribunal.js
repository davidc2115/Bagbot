const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fermer-tribunal')
        .setDescription('Fermer un procès et supprimer le channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le channel tribunal à fermer (par défaut: channel actuel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const guild = interaction.guild;

        // Vérifier que c'est un channel de tribunal
        if (!targetChannel.topic || !targetChannel.topic.includes('⚖️ Procès')) {
            return interaction.reply({ 
                content: '❌ Ce channel n\'est pas un tribunal.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            // Parser le topic pour récupérer les IDs
            const topic = targetChannel.topic;
            const plaignantMatch = topic.match(/Plaignant: (\d+)/);
            const accuseMatch = topic.match(/Accusé: (\d+)/);
            const avocatPlaignantMatch = topic.match(/AvocatPlaignant: (\d+)/);
            const avocatDefenseMatch = topic.match(/AvocatDefense: (\d+|null)/);
            const jugeMatch = topic.match(/Juge: (\d+|null)/);
            const chefAccusationMatch = topic.match(/ChefAccusation: ([A-Za-z0-9+/=]+)/);

            // Décoder le chef d'accusation
            let chefAccusation = 'Non spécifié';
            if (chefAccusationMatch && chefAccusationMatch[1] !== 'null') {
                try {
                    chefAccusation = Buffer.from(chefAccusationMatch[1], 'base64').toString('utf-8');
                } catch (e) {
                    chefAccusation = 'Erreur de décodage';
                }
            }

            const plaignantId = plaignantMatch ? plaignantMatch[1] : null;
            const accuseId = accuseMatch ? accuseMatch[1] : null;
            const avocatPlaignantId = avocatPlaignantMatch ? avocatPlaignantMatch[1] : null;
            const avocatDefenseId = avocatDefenseMatch && avocatDefenseMatch[1] !== 'null' ? avocatDefenseMatch[1] : null;
            const jugeId = jugeMatch && jugeMatch[1] !== 'null' ? jugeMatch[1] : null;

            // Récupérer les rôles
            const roleAccuse = guild.roles.cache.find(r => r.name === '⚖️ Accusé');
            const roleAvocat = guild.roles.cache.find(r => r.name === '👔 Avocat');
            const roleJuge = guild.roles.cache.find(r => r.name === '👨‍⚖️ Juge');

            let rolesRetires = 0;

            // Retirer le rôle accusé
            if (accuseId && roleAccuse) {
                try {
                    const accuseMember = await guild.members.fetch(accuseId);
                    if (accuseMember.roles.cache.has(roleAccuse.id)) {
                        await accuseMember.roles.remove(roleAccuse);
                        rolesRetires++;
                    }
                } catch (e) {
                    console.error('Erreur retrait rôle accusé:', e);
                }
            }

            // Retirer le rôle avocat du plaignant
            if (avocatPlaignantId && roleAvocat) {
                try {
                    const avocatPlaignantMember = await guild.members.fetch(avocatPlaignantId);
                    if (avocatPlaignantMember.roles.cache.has(roleAvocat.id)) {
                        await avocatPlaignantMember.roles.remove(roleAvocat);
                        rolesRetires++;
                    }
                } catch (e) {
                    console.error('Erreur retrait rôle avocat plaignant:', e);
                }
            }

            // Retirer le rôle avocat de la défense
            if (avocatDefenseId && roleAvocat) {
                try {
                    const avocatDefenseMember = await guild.members.fetch(avocatDefenseId);
                    if (avocatDefenseMember.roles.cache.has(roleAvocat.id)) {
                        await avocatDefenseMember.roles.remove(roleAvocat);
                        rolesRetires++;
                    }
                } catch (e) {
                    console.error('Erreur retrait rôle avocat défense:', e);
                }
            }

            // Retirer le rôle juge
            if (jugeId && roleJuge) {
                try {
                    const jugeMember = await guild.members.fetch(jugeId);
                    if (jugeMember.roles.cache.has(roleJuge.id)) {
                        await jugeMember.roles.remove(roleJuge);
                        rolesRetires++;
                    }
                } catch (e) {
                    console.error('Erreur retrait rôle juge:', e);
                }
            }

            // Message de clôture
            const embed = {
                color: 0xE53935,
                title: '⚖️ CLÔTURE DU PROCÈS',
                description: `**Le procès a été fermé.**\n\n📋 **Chef d'accusation :** ${chefAccusation}\n\n✅ **${rolesRetires}** rôle(s) retiré(s)\n\nCe channel sera supprimé dans 10 secondes.`,
                timestamp: new Date(),
                footer: { text: 'Fermeture du tribunal' },
            };

            await interaction.editReply({ embeds: [embed] });

            // Supprimer le channel après 10 secondes
            setTimeout(async () => {
                try {
                    await targetChannel.delete('Procès terminé');
                } catch (e) {
                    console.error('Erreur suppression channel:', e);
                }
            }, 10000);

        } catch (error) {
            console.error('Erreur lors de la fermeture du tribunal:', error);
            await interaction.editReply({
                content: `❌ Une erreur est survenue : ${error.message}`,
            });
        }
    },
};
