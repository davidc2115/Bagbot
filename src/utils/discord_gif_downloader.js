const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

async function downloadDiscordGifForBot(url) {
  return new Promise((resolve) => {
    if (!url.includes('cdn.discordapp.com') && !url.includes('media.discordapp.net')) {
      resolve(url);
      return;
    }

    const cleanUrl = url.split('?')[0];
    const urlHash = crypto.createHash('md5').update(cleanUrl).digest('hex').substring(0, 12);
    const extension = path.extname(cleanUrl) || '.gif';
    const filename = 'discord_' + urlHash + extension;
    const localPath = path.join(__dirname, '../../dashboard-v2/public/gifs', filename);
    
    if (fs.existsSync(localPath)) {
      resolve('http://88.174.155.230:33002/gifs/' + filename);
      return;
    }

    console.log('[Bot] 📥 Téléchargement Discord CDN: ' + cleanUrl.substring(0, 60) + '...');
    
    const urlObj = new URL(cleanUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://discord.com/'
      }
    };

    https.get(options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadDiscordGifForBot(response.headers.location).then(resolve);
        return;
      }
      if (response.statusCode !== 200) {
        console.log('[Bot] ❌ Erreur ' + response.statusCode);
        resolve(url);
        return;
      }

      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        const localUrl = 'http://88.174.155.230:33002/gifs/' + filename;
        console.log('[Bot] ✅ GIF téléchargé: ' + filename);
        resolve(localUrl);
      });
      fileStream.on('error', () => {
        try { fs.unlinkSync(localPath); } catch (_) {}
        resolve(url);
      });
    }).on('error', () => resolve(url)).setTimeout(15000, function() { this.destroy(); resolve(url); });
  });
}

module.exports = { downloadDiscordGifForBot };
