const { SlashCommandBuilder } = require("discord.js");
const { getEconomyConfig, getEconomyUser } = require("../storage/jsonStore");
const { buildEcoEmbed } = require("../utils/commonHelpers");

module.exports = {
  name: "solde",

  data: new SlashCommandBuilder()
    .setName("solde")
    .setDescription("Afficher le solde d'un membre")
    .addUserOption(option =>
      option
        .setName("membre")
        .setDescription("Le membre dont vous voulez voir le solde (vous par défaut)")
        .setRequired(false)
    )
    .setDMPermission(true),

  description: "Afficher le solde d'un membre",
  
  async execute(interaction) {
    await interaction.deferReply();
    
    const eco = await getEconomyConfig(interaction.guild.id);
    const target = interaction.options.getUser("membre", false) || interaction.user;
    const u = await getEconomyUser(interaction.guild.id, target.id);
    const isSelf = target.id === interaction.user.id;
    
    // Log debug
    console.log(`[ECONOMY DEBUG] Balance check: User ${target.id} in guild ${interaction.guild.id}: amount=${u.amount}, money=${u.money}`);
    
    const title = isSelf ? "Votre solde" : `Solde de ${target.username}`;
    
    const embed = buildEcoEmbed({
      title,
      description: `\n**Montant**: ${u.amount || 0} ${eco.currency?.name || "BAG$"}\n**Karma charme**: ${u.charm || 0} • **Karma perversion**: ${u.perversion || 0}\n`
    });
    
    return interaction.editReply({ embeds: [embed] });
  }
};
