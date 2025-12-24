const { createRequire } = require("module");

const req = createRequire("/home/bagbot/Bag-bot/package.json");
const { Client, GatewayIntentBits } = req("discord.js");

try {
  req("dotenv").config({ path: "/var/data/.env" });
} catch (_) {}

const token = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID || process.env.FORCE_GUILD_ID;

if (!token || !gid) {
  console.error("Missing DISCORD_TOKEN or GUILD_ID");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isSeparatorRoleName(name) {
  const n = String(name || "");
  return n.startsWith("▂▂▂▂▂▂▂▂▂");
}

function isStaffSeparatorRoleName(name) {
  const n = String(name || "");
  return isSeparatorRoleName(n) && n.toLowerCase().includes("staff");
}

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(gid);
      await guild.roles.fetch();

      const separatorRoles = Array.from(guild.roles.cache.values())
        .filter((r) => r && !r.managed)
        .filter((r) => isSeparatorRoleName(r.name))
        .filter((r) => !isStaffSeparatorRoleName(r.name))
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      const staffSeparatorRoles = Array.from(guild.roles.cache.values())
        .filter((r) => r && isStaffSeparatorRoleName(r.name))
        .sort((a, b) => b.position - a.position);

      console.log("Separator roles to grant:", separatorRoles.length);
      for (const r of separatorRoles) console.log("-", r.name, r.id);
      console.log("---");
      console.log("Excluded STAFF separator roles:", staffSeparatorRoles.length);
      for (const r of staffSeparatorRoles) console.log("-", r.name, r.id);
      console.log("---");

      if (separatorRoles.length === 0) {
        console.log("No separator roles found to grant. Nothing to do.");
        return;
      }

      console.log("Fetching all guild members…");
      const members = await guild.members.fetch();
      console.log("Members fetched:", members.size);

      const targetRoleIds = separatorRoles.map((r) => r.id);

      let processed = 0;
      let changedMembers = 0;
      let failed = 0;

      for (const m of members.values()) {
        processed++;
        try {
          // Compute missing separator roles
          const missing = [];
          for (const rid of targetRoleIds) {
            if (!m.roles.cache.has(rid)) missing.push(rid);
          }

          if (missing.length) {
            await m.roles.add(missing, "Grant separator roles to all members (excluding STAFF separator)");
            changedMembers++;
            // small delay to be gentle
            await sleep(300);
          }
        } catch (e) {
          failed++;
          console.log("[Fail] member", m.id, m.user ? m.user.tag : "", "->", e && e.message ? e.message : String(e));
          // backoff a bit on failure
          await sleep(800);
        }

        if (processed % 50 === 0) {
          console.log("Progress:", processed, "/", members.size, "changedMembers=", changedMembers, "failed=", failed);
        }
      }

      console.log("---");
      console.log("Done. processed=", processed, "changedMembers=", changedMembers, "failed=", failed);
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

