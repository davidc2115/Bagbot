const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Récupérer le token Discord depuis .env
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || '';

/**
 * Télécharge un GIF depuis Discord CDN avec authentification
 * Utilise le token du bot pour contourner les restrictions
 */
async function downloadDiscordGif(url) {
  return new Promise((resolve, reject) => {
    // Vérifier si c'est un lien Discord CDN
    if (!url.includes('cdn.discordapp.com') && !url.includes('media.discordapp.net')) {
      resolve(url); // Pas Discord, on garde l'URL
      return;
    }

    // Nettoyer l'URL (enlever les paramètres ?ex=...)
    const cleanUrl = url.split('?')[0];
    
    // Générer un nom de fichier unique basé sur l'URL
    const urlHash = crypto.createHash('md5').update(cleanUrl).digest('hex').substring(0, 12);
    const extension = path.extname(cleanUrl) || '.gif';
    const filename = `discord_${urlHash}${extension}`;
    const localPath = path.join(__dirname, 'public/gifs', filename);
    
    // Vérifier si le fichier existe déjà
    if (fs.existsSync(localPath)) {
      const localUrl = `http://88.174.155.230:3002/gifs/${filename}`;
      console.log(`✅ GIF déjà en cache: ${filename}`);
      resolve(localUrl);
      return;
    }

    console.log(`📥 Téléchargement Discord CDN: ${cleanUrl.substring(0, 80)}...`);
    
    // Préparer la requête avec le token Discord
    const urlObj = new URL(cleanUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Referer': 'https://discord.com/',
        'Origin': 'https://discord.com'
      }
    };

    // Ajouter le token Discord si disponible
    if (DISCORD_TOKEN) {
      options.headers['Authorization'] = `Bot ${DISCORD_TOKEN}`;
    }

    const protocol = cleanUrl.startsWith('https') ? https : http;
    
    const request = protocol.get(options, (response) => {
      // Gérer les redirections
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`↪️  Redirection vers: ${response.headers.location}`);
        downloadDiscordGif(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        console.log(`❌ Erreur ${response.statusCode} pour Discord CDN`);
        console.log(`   URL: ${cleanUrl.substring(0, 100)}`);
        resolve(url); // Garder l'URL originale en cas d'erreur
        return;
      }

      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        const localUrl = `http://88.174.155.230:3002/gifs/${filename}`;
        console.log(`✅ GIF téléchargé avec succès: ${filename} (${Math.round(fs.statSync(localPath).size / 1024)}KB)`);
        resolve(localUrl);
      });

      fileStream.on('error', (err) => {
        console.log(`❌ Erreur écriture fichier: ${err.message}`);
        try {
          fs.unlinkSync(localPath);
        } catch (_) {}
        resolve(url);
      });
    });

    request.on('error', (err) => {
      console.log(`❌ Erreur réseau: ${err.message}`);
      resolve(url);
    });

    // Timeout après 15 secondes
    request.setTimeout(15000, () => {
      request.destroy();
      console.log(`⏱️  Timeout pour ${cleanUrl.substring(0, 80)}`);
      resolve(url);
    });
  });
}

/**
 * Traite toutes les URLs GIF dans la configuration
 * Télécharge automatiquement les GIFs Discord CDN
 */
async function processGifUrls(gifs) {
  if (!gifs || typeof gifs !== 'object') return gifs;

  const processed = {};
  let totalDownloaded = 0;
  let totalFailed = 0;

  for (const action in gifs) {
    processed[action] = { success: [], fail: [] };

    // Traiter les GIFs de succès
    if (gifs[action].success && Array.isArray(gifs[action].success)) {
      for (const url of gifs[action].success) {
        const newUrl = await downloadDiscordGif(url);
        processed[action].success.push(newUrl);
        
        if (newUrl !== url && newUrl.includes('3002/gifs/')) {
          totalDownloaded++;
        } else if (url.includes('cdn.discordapp.com') || url.includes('media.discordapp.net')) {
          totalFailed++;
        }
      }
    }

    // Traiter les GIFs d'échec
    if (gifs[action].fail && Array.isArray(gifs[action].fail)) {
      for (const url of gifs[action].fail) {
        const newUrl = await downloadDiscordGif(url);
        processed[action].fail.push(newUrl);
        
        if (newUrl !== url && newUrl.includes('3002/gifs/')) {
          totalDownloaded++;
        } else if (url.includes('cdn.discordapp.com') || url.includes('media.discordapp.net')) {
          totalFailed++;
        }
      }
    }
  }

  if (totalDownloaded > 0) {
    console.log(`✅ ${totalDownloaded} GIF(s) Discord CDN téléchargé(s) et transformé(s) en liens locaux`);
  }
  if (totalFailed > 0) {
    console.log(`⚠️  ${totalFailed} GIF(s) Discord CDN n'ont pas pu être téléchargés (liens expirés ou invalides)`);
  }

  return processed;
}

// S'assurer que le dossier public/gifs existe
const gifsDir = path.join(__dirname, 'public/gifs');
if (!fs.existsSync(gifsDir)) {
  fs.mkdirSync(gifsDir, { recursive: true });
  console.log('📁 Dossier public/gifs créé');
}

module.exports = { downloadDiscordGif, processGifUrls };
