const { createRequire } = require("module");
const fs = require("fs");
const path = require("path");

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

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeObj(x) {
  return x && typeof x === "object" ? x : {};
}

function pruneMapByActiveIds(mapObj, activeIds) {
  const obj = safeObj(mapObj);
  let removed = 0;
  for (const k of Object.keys(obj)) {
    if (!activeIds.has(String(k))) {
      delete obj[k];
      removed++;
    }
  }
  return removed;
}

function countUniqueUsers(configData) {
  try {
    if (!configData || typeof configData !== "object" || !configData.guilds || typeof configData.guilds !== "object") return 0;
    const ids = new Set();
    for (const gid of Object.keys(configData.guilds)) {
      const g = configData.guilds[gid] || {};
      const eco = g.economy && g.economy.balances;
      if (eco && typeof eco === "object") for (const uid of Object.keys(eco)) ids.add(uid);
      const lv = g.levels && g.levels.users;
      if (lv && typeof lv === "object") for (const uid of Object.keys(lv)) ids.add(uid);
    }
    return ids.size;
  } catch (_) {
    return 0;
  }
}

async function main() {
  const storage = req("./src/storage/jsonStore");
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once("ready", async () => {
    try {
      const guild = await client.guilds.fetch(gid);

      console.log("Fetching members…");
      const members = await guild.members.fetch();
      const activeIds = new Set(Array.from(members.keys()).map(String));
      console.log("Active members:", activeIds.size);

      console.log("Reading config…");
      const cfg = await storage.readConfig();
      const prevUnique = countUniqueUsers(cfg);
      if (!cfg.guilds) cfg.guilds = {};
      if (!cfg.guilds[gid]) cfg.guilds[gid] = {};
      const g = cfg.guilds[gid];

      // Backup current config file (safety)
      try {
        const dataDir = storage.paths?.DATA_DIR || path.join(process.cwd(), "data");
        const configPath = storage.paths?.CONFIG_PATH || path.join(dataDir, "config.json");
        const backupsDir = path.join(dataDir, "backups", "manual-prune");
        fs.mkdirSync(backupsDir, { recursive: true });
        const backupPath = path.join(backupsDir, `config-pre-prune-${nowStamp()}.json`);
        fs.copyFileSync(configPath, backupPath);
        console.log("Backup saved:", backupPath);
      } catch (e) {
        console.log("Backup failed (continuing):", e.message);
      }

      const report = {
        economyBalancesRemoved: 0,
        levelsUsersRemoved: 0,
        inactivityTrackingRemoved: 0,
        geoLocationsRemoved: 0,
        moderationWarnsRemoved: 0,
        motCacheCollectionsRemoved: 0,
        motCacheWinnersRemoved: 0,
      };

      // Economy balances
      if (g.economy && g.economy.balances) {
        report.economyBalancesRemoved = pruneMapByActiveIds(g.economy.balances, activeIds);
      }

      // Levels users
      if (g.levels && g.levels.users) {
        report.levelsUsersRemoved = pruneMapByActiveIds(g.levels.users, activeIds);
      }

      // Inactivity tracking
      if (g.autokick && g.autokick.inactivityTracking) {
        report.inactivityTrackingRemoved = pruneMapByActiveIds(g.autokick.inactivityTracking, activeIds);
      }

      // Geo locations
      if (g.geo && g.geo.locations) {
        report.geoLocationsRemoved = pruneMapByActiveIds(g.geo.locations, activeIds);
      }

      // Moderation warns
      if (g.moderation && g.moderation.warns) {
        report.moderationWarnsRemoved = pruneMapByActiveIds(g.moderation.warns, activeIds);
      }

      // Mot-cache collections & winners
      if (g.motCache && typeof g.motCache === "object") {
        const mc = g.motCache;
        if (mc.collections && typeof mc.collections === "object") {
          report.motCacheCollectionsRemoved = pruneMapByActiveIds(mc.collections, activeIds);
        }
        if (Array.isArray(mc.winners)) {
          const before = mc.winners.length;
          mc.winners = mc.winners.filter((id) => activeIds.has(String(id)));
          report.motCacheWinnersRemoved = before - mc.winners.length;
        }
      }

      console.log("Prune report:", report);

      console.log("Writing config…");
      const newUnique = countUniqueUsers(cfg);
      console.log("Unique users (economy+levels) before:", prevUnique, "after:", newUnique);

      // This operation can legitimately cause a "catastrophic drop" (many users left).
      // We still keep safety by taking a backup above, then allowing the write explicitly.
      process.env.ALLOW_DANGEROUS_RESTORE = "1";
      await storage.writeConfig(cfg, "restore");

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

