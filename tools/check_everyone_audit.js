const { createRequire } = require("module");

const req = createRequire("/home/bagbot/Bag-bot/package.json");
const { Client, GatewayIntentBits, PermissionFlagsBits, AuditLogEvent } = req("discord.js");

try {
  req("dotenv").config({ path: "/var/data/.env" });
} catch (_) {}

const token = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID || process.env.FORCE_GUILD_ID;

if (!token || !gid) {
  console.error("Missing DISCORD_TOKEN or GUILD_ID");
  process.exit(1);
}

function bitHas(value, bit) {
  try {
    const v = typeof value === "bigint" ? value : BigInt(String(value || "0"));
    return (v & bit) === bit;
  } catch (_) {
    return false;
  }
}

function roleUpdateTogglesMentionEveryone(changes) {
  if (!Array.isArray(changes)) return false;
  const bit = BigInt(PermissionFlagsBits.MentionEveryone);
  for (const c of changes) {
    if (!c || c.key !== "permissions") continue;
    const oldHas = bitHas(c.old, bit);
    const newHas = bitHas(c.new, bit);
    if (oldHas !== newHas) return true;
  }
  return false;
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(gid);

      // ROLE_UPDATE: permission toggles
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 50 });
        const entries = Array.from(logs.entries.values()).filter((e) => roleUpdateTogglesMentionEveryone(e.changes));
        console.log("ROLE_UPDATE toggling MentionEveryone:", entries.length);
        for (const e of entries.slice(0, 25)) {
          const role = e.target;
          const ex = e.executor;
          console.log(
            "-",
            new Date(e.createdTimestamp).toISOString(),
            "by",
            ex && ex.tag ? ex.tag : "?",
            "role",
            role && role.name ? role.name : "?",
            role && role.id ? role.id : ""
          );
        }
      } catch (e) {
        console.log("ROLE_UPDATE audit failed:", e && e.message ? e.message : String(e));
      }

      // CHANNEL_OVERWRITE_UPDATE
      try {
        const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit: 50 });
        console.log("CHANNEL_OVERWRITE_UPDATE entries:", logs.entries.size);
        let shown = 0;
        for (const e of logs.entries.values()) {
          if (shown >= 25) break;
          const keys = Array.isArray(e.changes) ? e.changes.map((c) => (c && c.key ? c.key : "")).filter(Boolean) : [];
          if (keys.length) {
            console.log(
              "-",
              new Date(e.createdTimestamp).toISOString(),
              "by",
              e.executor && e.executor.tag ? e.executor.tag : "?",
              "channel",
              e.target && e.target.name ? e.target.name : e.target && e.target.id ? e.target.id : "?",
              "keys",
              keys.join(",")
            );
            shown++;
          }
        }
      } catch (e) {
        console.log("CHANNEL_OVERWRITE_UPDATE audit failed:", e && e.message ? e.message : String(e));
      }

      // WEBHOOKS
      try {
        const hooks = await guild.fetchWebhooks();
        console.log("Webhooks:", hooks.size);
        let i = 0;
        for (const h of hooks.values()) {
          if (i >= 40) break;
          console.log("-", h.name, h.id, "channel", h.channelId || "");
          i++;
        }
        if (hooks.size > 40) console.log("(and " + String(hooks.size - 40) + " more)");
      } catch (e) {
        console.log("fetchWebhooks failed:", e && e.message ? e.message : String(e));
      }
    } catch (e) {
      console.log("Error:", e && e.message ? e.message : String(e));
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

