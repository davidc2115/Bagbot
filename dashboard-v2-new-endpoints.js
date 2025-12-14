// ========== STAFF CHAT ENDPOINTS ==========
// Ajouter ces routes au fichier server-v2.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Fichier pour stocker les messages du chat staff
const STAFF_CHAT_FILE = path.join(__dirname, '../data/staff-chat.json');

// Initialiser le fichier s'il n'existe pas
if (!fs.existsSync(STAFF_CHAT_FILE)) {
  fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] }));
}

// GET /api/staff-chat - Récupérer les messages
app.get('/api/staff-chat', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading staff chat:', error);
    res.json({ messages: [] });
  }
});

// POST /api/staff-chat - Envoyer un message
app.post('/api/staff-chat', (req, res) => {
  try {
    const { username, message, timestamp } = req.body;
    
    const data = JSON.parse(fs.readFileSync(STAFF_CHAT_FILE, 'utf8'));
    data.messages.push({
      username,
      message,
      timestamp: timestamp || Date.now()
    });
    
    // Garder seulement les 100 derniers messages
    if (data.messages.length > 100) {
      data.messages = data.messages.slice(-100);
    }
    
    fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending staff message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/staff-chat - Effacer l'historique
app.delete('/api/staff-chat', (req, res) => {
  try {
    fs.writeFileSync(STAFF_CHAT_FILE, JSON.stringify({ messages: [] }));
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing staff chat:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// ========== SERVER MONITORING ENDPOINTS ==========

// GET /api/server/stats - Statistiques serveur
app.get('/api/server/stats', (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Uptime système
    const uptime = os.uptime();
    
    // CPU Info
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    // Disk info (approximatif)
    exec('df -h / | tail -1', (error, stdout) => {
      let diskInfo = { used: 0, total: 0, percent: 0 };
      if (!error && stdout) {
        const parts = stdout.trim().split(/\s+/);
        diskInfo = {
          total: parts[1],
          used: parts[2],
          percent: parseInt(parts[4])
        };
      }
      
      // Cache size (PM2 logs + tmp files)
      exec('du -sb ~/.pm2/logs 2>/dev/null', (err, cacheStdout) => {
        let cacheSize = 0;
        if (!err && cacheStdout) {
          cacheSize = parseInt(cacheStdout.split('\t')[0]) || 0;
        }
        
        // Status dashboard
        exec('pm2 jlist', (err, pm2Stdout) => {
          let dashboardStatus = 'unknown';
          let botStatus = 'unknown';
          let botUptime = 0;
          
          if (!err && pm2Stdout) {
            try {
              const pm2List = JSON.parse(pm2Stdout);
              const dashboard = pm2List.find(p => p.name === 'dashboard' || p.name === 'dashboard-v2');
              const bot = pm2List.find(p => p.name === 'bagbot');
              
              dashboardStatus = dashboard && dashboard.pm2_env.status === 'online' ? 'online' : 'offline';
              botStatus = bot && bot.pm2_env.status === 'online' ? 'online' : 'offline';
              botUptime = bot ? Math.floor((Date.now() - bot.pm2_env.pm_uptime) / 1000) : 0;
            } catch (e) {
              console.error('Error parsing PM2 list:', e);
            }
          }
          
          res.json({
            status: 'online',
            uptime: Math.floor(uptime),
            memory: {
              used: usedMem,
              total: totalMem,
              percent: Math.round((usedMem / totalMem) * 100)
            },
            cpu: {
              usage: Math.round(cpuUsage),
              cores: cpus.length
            },
            disk: diskInfo,
            cache: {
              size: cacheSize
            },
            dashboard: {
              status: dashboardStatus,
              port: 3002
            },
            bot: {
              status: botStatus,
              uptime: botUptime
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Error getting server stats:', error);
    res.status(500).json({ error: 'Failed to get server stats' });
  }
});

// POST /api/server/restart/dashboard - Redémarrer le dashboard
app.post('/api/server/restart/dashboard', (req, res) => {
  try {
    console.log('🔄 Redémarrage dashboard demandé...');
    
    exec('pm2 restart dashboard-v2 || pm2 restart dashboard', (error, stdout, stderr) => {
      if (error) {
        console.error('Error restarting dashboard:', error);
        res.status(500).json({ error: 'Failed to restart dashboard' });
      } else {
        console.log('✅ Dashboard redémarré');
        res.json({ success: true, message: 'Dashboard restarted' });
      }
    });
  } catch (error) {
    console.error('Error restarting dashboard:', error);
    res.status(500).json({ error: 'Failed to restart dashboard' });
  }
});

// POST /api/server/restart/bot - Redémarrer le bot
app.post('/api/server/restart/bot', (req, res) => {
  try {
    console.log('🔄 Redémarrage bot demandé...');
    
    exec('pm2 restart bagbot', (error, stdout, stderr) => {
      if (error) {
        console.error('Error restarting bot:', error);
        res.status(500).json({ error: 'Failed to restart bot' });
      } else {
        console.log('✅ Bot redémarré');
        res.json({ success: true, message: 'Bot restarted' });
      }
    });
  } catch (error) {
    console.error('Error restarting bot:', error);
    res.status(500).json({ error: 'Failed to restart bot' });
  }
});

// POST /api/server/clear-cache - Vider le cache
app.post('/api/server/clear-cache', (req, res) => {
  try {
    console.log('🗑️ Nettoyage cache demandé...');
    
    // Vider les logs PM2
    exec('pm2 flush', (error1) => {
      // Nettoyer les fichiers temporaires
      exec('rm -rf /tmp/tmp-* 2>/dev/null', (error2) => {
        // Obtenir l'espace libéré
        exec('du -sh ~/.pm2/logs 2>/dev/null', (error3, stdout) => {
          const freed = error3 ? '0' : stdout.split('\t')[0];
          
          console.log('✅ Cache vidé:', freed);
          res.json({ 
            success: true, 
            message: 'Cache cleared',
            freed: freed
          });
        });
      });
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// POST /api/server/reboot - Redémarrer le serveur
app.post('/api/server/reboot', (req, res) => {
  try {
    console.log('⚠️ REDÉMARRAGE SERVEUR DEMANDÉ...');
    
    // Répondre immédiatement
    res.json({ success: true, message: 'Server rebooting...' });
    
    // Redémarrer après 2 secondes
    setTimeout(() => {
      exec('sudo reboot', (error) => {
        if (error) {
          console.error('Error rebooting server:', error);
        }
      });
    }, 2000);
  } catch (error) {
    console.error('Error rebooting server:', error);
    res.status(500).json({ error: 'Failed to reboot server' });
  }
});

// ========== FIN DES NOUVEAUX ENDPOINTS ==========

console.log('✅ Staff Chat & Server Monitoring endpoints loaded');
