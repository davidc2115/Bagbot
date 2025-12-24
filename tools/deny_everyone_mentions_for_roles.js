const { createRequire } = require("module");

// Load dependencies from the deployed repo environment
const req = createRequire("/home/bagbot/Bag-bot/package.json");
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = req("discord.js");

try {
  req("dotenv").config({ path: "/var/data/.env" });
} catch (_) {}

const token = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID || process.env.FORCE_GUILD_ID;

if (!token || !gid) {
  console.error("Missing DISCORD_TOKEN or GUILD_ID");
  process.exit(1);
}

const TARGET_ROLE_IDS = [
  // 👥 │ membres
  "1360897918504271883",
  // ✅ │ certifie
  "1360897918504271889",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isSupportedChannelType(type) {
  return (
    type === ChannelType.GuildText ||
    type === ChannelType.GuildAnnouncement ||
    type === ChannelType.GuildForum ||
    type === ChannelType.GuildVoice ||
    type === ChannelType.GuildStageVoice ||
    type === ChannelType.GuildCategory
  );
}

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(gid);

      // Fetch caches
      await guild.roles.fetch();
      await guild.channels.fetch();

      const roles = TARGET_ROLE_IDS
        .map((id) => guild.roles.cache.get(id))
        .filter(Boolean);

      if (roles.length === 0) {
        console.log("No target roles found. Check TARGET_ROLE_IDS.");
        return;
      }

      console.log("Target roles:");
      for (const r of roles) {
        console.log("-", r.name, r.id);
      }

      // 1) Ensure role does NOT have global MentionEveryone
      for (const r of roles) {
        if (r.permissions.has(PermissionFlagsBits.MentionEveryone)) {
          const nextPerms = r.permissions.remove(PermissionFlagsBits.MentionEveryone);
          console.log("[Role] Removing global MentionEveryone from:", r.name);
          await r.setPermissions(nextPerms, "Disable @everyone mentions for members/certified roles");
          await sleep(350);
        }
      }

      // 2) Apply explicit channel overwrite deny (MentionEveryone=false) everywhere
      const channels = Array.from(guild.channels.cache.values()).filter(
        (ch) => ch && isSupportedChannelType(ch.type)
      );

      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const ch of channels) {
        for (const r of roles) {
          try {
            // Set explicit deny: false (deny) / null (inherit) / true (allow)
            await ch.permissionOverwrites.edit(
              r.id,
              { MentionEveryone: false },
              { reason: "Disable @everyone mentions for members/certified roles" }
            );
            updated++;
            await sleep(250);
          } catch (e) {
            failed++;
            console.log("[Fail]", ch.id, ch.name || "", "role", r.name, "->", e.message);
          }
        }
        skipped++;
      }

      console.log("---");
      console.log("Channels processed:", channels.length);
      console.log("Overwrites updated:", updated);
      console.log("Overwrites failed:", failed);
      console.log("Done.");
    } catch (e) {
      console.error("Error:", e && e.stack ? e.stack : e);
      process.exitCode = 1;
    } finally {
      try {
        client.destroy();
      } catch (_) {}
      process.exit(0);
    }
  });

  client.login(token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

