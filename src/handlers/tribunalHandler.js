const { PermissionFlagsBits } = require('discord.js');

/**
 * Gère la sélection de l'avocat de la défense par l'accusé
 */
async function handleTribunalAvocatDefenseSelection(interaction) {
    const channelId = interaction.customId.split(':')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
        return interaction.reply({ 
            content: '❌ Channel tribunal introuvable.', 
            ephemeral: true 
        });
    }

    // Parser le topic pour récupérer les IDs
    const topic = channel.topic;
    const accuseMatch = topic.match(/Accusé: (\d+)/);
    const avocatPlaignantMatch = topic.match(/AvocatPlaignant: (\d+)/);
    const avocatDefenseMatch = topic.match(/AvocatDefense: (\d+|null)/);

    if (!accuseMatch) {
        return interaction.reply({ 
            content: '❌ Impossible de récupérer les informations du procès.', 
            ephemeral: true 
        });
    }

    const accuseId = accuseMatch[1];
    const avocatPlaignantId = avocatPlaignantMatch ? avocatPlaignantMatch[1] : null;

    // Vérifier que c'est bien l'accusé qui sélectionne
    if (interaction.user.id !== accuseId) {
        return interaction.reply({ 
            content: '❌ Seul l\'accusé peut sélectionner l\'avocat de la défense.', 
            ephemeral: true 
        });
    }

    // Vérifier qu'il n'y a pas déjà un avocat de la défense
    if (avocatDefenseMatch && avocatDefenseMatch[1] !== 'null') {
        return interaction.reply({ 
            content: '❌ Un avocat de la défense a déjà été sélectionné.', 
            ephemeral: true 
        });
    }

    const selectedMemberId = interaction.values[0];

    // Vérifications
    if (selectedMemberId === accuseId) {
        return interaction.reply({ 
            content: '❌ Vous ne pouvez pas être votre propre avocat.', 
            ephemeral: true 
        });
    }

    if (selectedMemberId === avocatPlaignantId) {
        return interaction.reply({ 
            content: '❌ L\'avocat du plaignant ne peut pas être aussi l\'avocat de la défense.', 
            ephemeral: true 
        });
    }

    const selectedMember = await interaction.guild.members.fetch(selectedMemberId);

    if (selectedMember.user.bot) {
        return interaction.reply({ 
            content: '❌ Vous ne pouvez pas sélectionner un bot comme avocat.', 
            ephemeral: true 
        });
    }

    await interaction.deferUpdate();

    try {
        // Attribuer le rôle avocat
        const roleAvocat = interaction.guild.roles.cache.find(r => r.name === '👔 Avocat');
        if (roleAvocat) {
            await selectedMember.roles.add(roleAvocat);
        }

        // Mettre à jour le topic
        const plaignantMatch = topic.match(/Plaignant: (\d+)/);
        const jugeMatch = topic.match(/Juge: (\d+|null)/);
        const chefAccusationMatch = topic.match(/ChefAccusation: ([A-Za-z0-9+/=]+)/);
        
        const plaignantId = plaignantMatch ? plaignantMatch[1] : 'unknown';
        const jugeId = jugeMatch ? jugeMatch[1] : 'null';
        const chefAccusation = chefAccusationMatch ? chefAccusationMatch[1] : '';

        await channel.setTopic(`⚖️ Procès | Plaignant: ${plaignantId} | Accusé: ${accuseId} | AvocatPlaignant: ${avocatPlaignantId} | AvocatDefense: ${selectedMemberId} | Juge: ${jugeId} | ChefAccusation: ${chefAccusation}`);

        // Mettre à jour l'embed d'ouverture
        const messages = await channel.messages.fetch({ limit: 10 });
        const embedMessage = messages.find(m => 
            m.embeds.length > 0 && 
            m.embeds[0].title === '⚖️ OUVERTURE DU PROCÈS'
        );

        if (embedMessage) {
            const oldEmbed = embedMessage.embeds[0];
            const plaignant = await interaction.guild.members.fetch(plaignantId);
            const accuse = await interaction.guild.members.fetch(accuseId);
            const avocatPlaignant = await interaction.guild.members.fetch(avocatPlaignantId);
            
            // Décoder le chef d'accusation
            let chefAccusationText = 'Non spécifié';
            if (chefAccusation) {
                try {
                    chefAccusationText = Buffer.from(chefAccusation, 'base64').toString('utf-8');
                } catch (e) {
                    chefAccusationText = 'Erreur de décodage';
                }
            }

            const roleAccuse = interaction.guild.roles.cache.find(r => r.name === '⚖️ Accusé');
            const roleAvocatObj = interaction.guild.roles.cache.find(r => r.name === '👔 Avocat');

            const newDescription = `**Un nouveau procès a été ouvert !**\n\n📋 **Chef d'accusation :** ${chefAccusationText}\n\n👤 **Plaignant :** ${plaignant}\n👔 **Avocat du plaignant :** ${avocatPlaignant} ${roleAvocatObj}\n⚠️ **Accusé :** ${accuse} ${roleAccuse}\n👔 **Avocat de la défense :** ${selectedMember} ${roleAvocatObj}\n👨‍⚖️ **Juge :** ${jugeId !== 'null' ? `<@${jugeId}>` : 'Aucun (utilisez le bouton ci-dessous)'}`;

            const newEmbed = {
                ...oldEmbed.toJSON(),
                description: newDescription,
            };

            await embedMessage.edit({ embeds: [newEmbed], components: embedMessage.components });
        }

        // Supprimer le message de sélection
        await interaction.message.delete();

        // Message de confirmation
        await channel.send({
            content: `✅ ${selectedMember} a été désigné(e) comme avocat de la défense.`,
        });

    } catch (error) {
        console.error('Erreur lors de la sélection de l\'avocat de la défense:', error);
        await channel.send({
            content: `❌ Une erreur est survenue : ${error.message}`,
        });
    }
}

/**
 * Gère le bouton "Devenir Juge"
 */
async function handleDevenirJuge(interaction) {
    const channelId = interaction.customId.split(':')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
        return interaction.reply({ 
            content: '❌ Channel tribunal introuvable.', 
            ephemeral: true 
        });
    }

    // Parser le topic pour vérifier qu'il n'y a pas déjà un juge
    const topic = channel.topic;
    const jugeMatch = topic.match(/Juge: (\d+|null)/);

    if (jugeMatch && jugeMatch[1] !== 'null') {
        return interaction.reply({ 
            content: '❌ Un juge a déjà été désigné pour ce procès.', 
            ephemeral: true 
        });
    }

    await interaction.deferUpdate();

    try {
        // Créer/récupérer le rôle juge
        let roleJuge = interaction.guild.roles.cache.find(r => r.name === '👨‍⚖️ Juge');
        if (!roleJuge) {
            roleJuge = await interaction.guild.roles.create({
                name: '👨‍⚖️ Juge',
                color: 0xFFD700, // Or
                reason: 'Rôle pour les juges',
            });
        }

        // Attribuer le rôle
        const jugeMember = await interaction.guild.members.fetch(interaction.user.id);
        await jugeMember.roles.add(roleJuge);

        // Mettre à jour le topic
        const plaignantMatch = topic.match(/Plaignant: (\d+)/);
        const accuseMatch = topic.match(/Accusé: (\d+)/);
        const avocatPlaignantMatch = topic.match(/AvocatPlaignant: (\d+)/);
        const avocatDefenseMatch = topic.match(/AvocatDefense: (\d+|null)/);
        const chefAccusationMatch = topic.match(/ChefAccusation: ([A-Za-z0-9+/=]+)/);

        const plaignantId = plaignantMatch ? plaignantMatch[1] : 'unknown';
        const accuseId = accuseMatch ? accuseMatch[1] : 'unknown';
        const avocatPlaignantId = avocatPlaignantMatch ? avocatPlaignantMatch[1] : 'null';
        const avocatDefenseId = avocatDefenseMatch ? avocatDefenseMatch[1] : 'null';
        const chefAccusation = chefAccusationMatch ? chefAccusationMatch[1] : '';

        await channel.setTopic(`⚖️ Procès | Plaignant: ${plaignantId} | Accusé: ${accuseId} | AvocatPlaignant: ${avocatPlaignantId} | AvocatDefense: ${avocatDefenseId} | Juge: ${interaction.user.id} | ChefAccusation: ${chefAccusation}`);

        // Mettre à jour l'embed et retirer le bouton
        const messages = await channel.messages.fetch({ limit: 10 });
        const embedMessage = messages.find(m => 
            m.embeds.length > 0 && 
            m.embeds[0].title === '⚖️ OUVERTURE DU PROCÈS'
        );

        if (embedMessage) {
            const oldEmbed = embedMessage.embeds[0];
            const plaignant = await interaction.guild.members.fetch(plaignantId);
            const accuse = await interaction.guild.members.fetch(accuseId);
            const avocatPlaignant = await interaction.guild.members.fetch(avocatPlaignantId);
            
            let avocatDefenseText = '*En attente de sélection par l\'accusé*';
            if (avocatDefenseId !== 'null') {
                const avocatDefense = await interaction.guild.members.fetch(avocatDefenseId);
                const roleAvocatObj = interaction.guild.roles.cache.find(r => r.name === '👔 Avocat');
                avocatDefenseText = `${avocatDefense} ${roleAvocatObj}`;
            }

            // Décoder le chef d'accusation
            let chefAccusationText = 'Non spécifié';
            if (chefAccusation) {
                try {
                    chefAccusationText = Buffer.from(chefAccusation, 'base64').toString('utf-8');
                } catch (e) {
                    chefAccusationText = 'Erreur de décodage';
                }
            }

            const roleAccuse = interaction.guild.roles.cache.find(r => r.name === '⚖️ Accusé');
            const roleAvocatObj = interaction.guild.roles.cache.find(r => r.name === '👔 Avocat');

            const newDescription = `**Un nouveau procès a été ouvert !**\n\n📋 **Chef d'accusation :** ${chefAccusationText}\n\n👤 **Plaignant :** ${plaignant}\n👔 **Avocat du plaignant :** ${avocatPlaignant} ${roleAvocatObj}\n⚠️ **Accusé :** ${accuse} ${roleAccuse}\n👔 **Avocat de la défense :** ${avocatDefenseText}\n👨‍⚖️ **Juge :** ${interaction.user} ${roleJuge}`;

            const newEmbed = {
                ...oldEmbed.toJSON(),
                description: newDescription,
            };

            await embedMessage.edit({ embeds: [newEmbed], components: [] }); // Retire le bouton
        }

        // Message de confirmation
        await channel.send({
            content: `✅ ${interaction.user} a été désigné(e) comme juge pour ce procès.`,
        });

    } catch (error) {
        console.error('Erreur lors de la désignation du juge:', error);
        await channel.send({
            content: `❌ Une erreur est survenue : ${error.message}`,
        });
    }
}

module.exports = {
    handleTribunalAvocatDefenseSelection,
    handleDevenirJuge,
};
