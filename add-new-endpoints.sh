#!/bin/bash

# Script pour ajouter les nouveaux endpoints au dashboard sur la Freebox

echo "🚀 Ajout des nouveaux endpoints au dashboard"
echo "============================================="
echo ""

SERVER_IP="88.174.155.230"
SERVER_PORT="45000"
SERVER_USER="bagbot"
SERVER_PASS="bagbot"

echo "📡 Connexion au serveur..."

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" << 'REMOTE_SCRIPT'

cd /home/bagbot/Bag-bot/dashboard-v2

echo "📝 Sauvegarde du fichier actuel..."
cp server-v2.js server-v2.js.backup-$(date +%Y%m%d_%H%M%S)

echo "✅ Sauvegarde créée"

# Créer le fichier des nouveaux endpoints
cat > /tmp/new-endpoints.js << 'EOF'

// ========== STAFF CHAT & SERVER MONITORING - NOUVEAUX ENDPOINTS ==========

const os = require('os');
const { exec } = require('child_process');

// Fichier pour stocker les messages du chat staff
const STAFF_CHAT_FILE = path.join(__dirname, '../data/staff-chat.json');

// Initialiser le fichier s'il n'existe pas
if (!fs.existsSync(STAFF_CHAT_FILE)) {
  fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] }));
}

// GET /api/staff-chat
app.get('/api/staff-chat', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.json({ messages: [] });
  }
});

// POST /api/staff-chat
app.post('/api/staff-chat', (req, res) => {
  try {
    const { username, message, timestamp } = req.body;
    const data = JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, 'utf8'));
    data.messages.push({ username, message, timestamp: timestamp || Date.now() });
    if (data.messages.length > 100) data.messages = data.messages.slice(-100);
    fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/staff-chat
app.delete('/api/staff-chat', (req, res) => {
  try {
    fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] }));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// GET /api/server/stats
app.get('/api/server/stats', (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;
    
    exec('df -h / | tail -1', (err1, diskStdout) => {
      let diskInfo = { used: 0, total: 0, percent: 0 };
      if (!err1 && diskStdout) {
        const parts = diskStdout.trim().split(/\s+/);
        diskInfo = { total: parts[1], used: parts[2], percent: parseInt(parts[4]) };
      }
      
      exec('du -sb ~/.pm2/logs 2>/dev/null', (err2, cacheStdout) => {
        const cacheSize = !err2 && cacheStdout ? parseInt(cacheStdout.split('\t')[0]) : 0;
        
        exec('pm2 jlist', (err3, pm2Stdout) => {
          let dashStatus = 'unknown', botStatus = 'unknown', botUptime = 0;
          if (!err3 && pm2Stdout) {
            try {
              const pm2List = JSON.parse(pm2Stdout);
              const dash = pm2List.find(p => p.name.includes('dashboard'));
              const bot = pm2List.find(p => p.name === 'bagbot');
              dashStatus = dash?.pm2_env?.status === 'online' ? 'online' : 'offline';
              botStatus = bot?.pm2_env?.status === 'online' ? 'online' : 'offline';
              botUptime = bot ? Math.floor((Date.now() - bot.pm2_env.pm_uptime) / 1000) : 0;
            } catch (e) {}
          }
          
          res.json({
            status: 'online',
            uptime: Math.floor(uptime),
            memory: { used: usedMem, total: totalMem, percent: Math.round((usedMem / totalMem) * 100) },
            cpu: { usage: Math.round(cpuUsage), cores: cpus.length },
            disk: diskInfo,
            cache: { size: cacheSize },
            dashboard: { status: dashStatus, port: 3002 },
            bot: { status: botStatus, uptime: botUptime }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// POST /api/server/restart/dashboard
app.post('/api/server/restart/dashboard', (req, res) => {
  exec('pm2 restart dashboard-v2 || pm2 restart dashboard', (error) => {
    if (error) res.status(500).json({ error: 'Failed to restart' });
    else res.json({ success: true, message: 'Dashboard restarted' });
  });
});

// POST /api/server/restart/bot
app.post('/api/server/restart/bot', (req, res) => {
  exec('pm2 restart bagbot', (error) => {
    if (error) res.status(500).json({ error: 'Failed to restart' });
    else res.json({ success: true, message: 'Bot restarted' });
  });
});

// POST /api/server/clear-cache
app.post('/api/server/clear-cache', (req, res) => {
  exec('pm2 flush && rm -rf /tmp/tmp-* 2>/dev/null', (error) => {
    exec('du -sh ~/.pm2/logs 2>/dev/null', (err, stdout) => {
      const freed = err ? '0' : stdout.split('\t')[0];
      res.json({ success: true, message: 'Cache cleared', freed });
    });
  });
});

// POST /api/server/reboot
app.post('/api/server/reboot', (req, res) => {
  res.json({ success: true, message: 'Server rebooting...' });
  setTimeout(() => exec('sudo reboot'), 2000);
});

console.log('✅ Staff Chat & Server Monitoring endpoints ready');

// ========== FIN NOUVEAUX ENDPOINTS ==========

EOF

echo "📝 Ajout des nouveaux endpoints..."

# Ajouter les endpoints avant la dernière ligne (app.listen)
sed -i '/^app.listen/i\
// ========== STAFF CHAT & SERVER MONITORING ==========\
const os = require("os");\
const STAFF_CHAT_FILE = path.join(__dirname, "../data/staff-chat.json");\
if (!fs.existsSync(STAFF_CHAT_FILE)) fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] }));\
app.get("/api/staff-chat", (req, res) => { try { res.json(JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, "utf8"))); } catch (e) { res.json({ messages: [] }); }});\
app.post("/api/staff-chat", (req, res) => { try { const data = JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, "utf8")); data.messages.push(req.body); if (data.messages.length > 100) data.messages = data.messages.slice(-100); fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify(data, null, 2)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }});\
app.delete("/api/staff-chat", (req, res) => { try { fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] })); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Failed" }); }});\
app.get("/api/server/stats", (req, res) => { const totalMem = os.totalmem(); const freeMem = os.freemem(); const usedMem = totalMem - freeMem; const uptime = os.uptime(); const cpus = os.cpus(); const cpuUsage = cpus.reduce((acc, cpu) => { const total = Object.values(cpu.times).reduce((a, b) => a + b, 0); return acc + ((total - cpu.times.idle) / total) * 100; }, 0) / cpus.length; exec("df -h / | tail -1", (err1, diskStdout) => { let diskInfo = { used: 0, total: 0, percent: 0 }; if (!err1 && diskStdout) { const parts = diskStdout.trim().split(/\\s+/); diskInfo = { total: parts[1], used: parts[2], percent: parseInt(parts[4]) }; } exec("du -sb ~/.pm2/logs 2>/dev/null", (err2, cacheStdout) => { const cacheSize = !err2 && cacheStdout ? parseInt(cacheStdout.split("\\t")[0]) : 0; exec("pm2 jlist", (err3, pm2Stdout) => { let dashStatus = "unknown", botStatus = "unknown", botUptime = 0; if (!err3 && pm2Stdout) { try { const pm2List = JSON.parse(pm2Stdout); const dash = pm2List.find(p => p.name.includes("dashboard")); const bot = pm2List.find(p => p.name === "bagbot"); dashStatus = dash?.pm2_env?.status === "online" ? "online" : "offline"; botStatus = bot?.pm2_env?.status === "online" ? "online" : "offline"; botUptime = bot ? Math.floor((Date.now() - bot.pm2_env.pm_uptime) / 1000) : 0; } catch (e) {} } res.json({ status: "online", uptime: Math.floor(uptime), memory: { used: usedMem, total: totalMem, percent: Math.round((usedMem / totalMem) * 100) }, cpu: { usage: Math.round(cpuUsage), cores: cpus.length }, disk: diskInfo, cache: { size: cacheSize }, dashboard: { status: dashStatus, port: 3002 }, bot: { status: botStatus, uptime: botUptime } }); }); }); }); });\
app.post("/api/server/restart/dashboard", (req, res) => { exec("pm2 restart dashboard-v2 || pm2 restart dashboard", (error) => { if (error) res.status(500).json({ error: "Failed" }); else res.json({ success: true }); }); });\
app.post("/api/server/restart/bot", (req, res) => { exec("pm2 restart bagbot", (error) => { if (error) res.status(500).json({ error: "Failed" }); else res.json({ success: true }); }); });\
app.post("/api/server/clear-cache", (req, res) => { exec("pm2 flush && rm -rf /tmp/tmp-* 2>/dev/null", () => { exec("du -sh ~/.pm2/logs 2>/dev/null", (err, stdout) => { res.json({ success: true, freed: err ? "0" : stdout.split("\\t")[0] }); }); }); });\
app.post("/api/server/reboot", (req, res) => { res.json({ success: true }); setTimeout(() => exec("sudo reboot"), 2000); });\
' server-v2.js

echo "✅ Endpoints ajoutés"

echo "🔄 Redémarrage du dashboard..."
pm2 restart dashboard-v2 || pm2 restart dashboard

sleep 3

echo ""
echo "✅ TERMINÉ!"
echo ""
echo "Nouveaux endpoints disponibles:"
echo "  • GET    /api/staff-chat"
echo "  • POST   /api/staff-chat"
echo "  • DELETE /api/staff-chat"
echo "  • GET    /api/server/stats"
echo "  • POST   /api/server/restart/dashboard"
echo "  • POST   /api/server/restart/bot"
echo "  • POST   /api/server/clear-cache"
echo "  • POST   /api/server/reboot"

REMOTE_SCRIPT

echo ""
echo "🎉 Endpoints ajoutés et dashboard redémarré!"
