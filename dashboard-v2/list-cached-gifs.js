const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../data/config.json');
const CACHE_DIR = path.join(__dirname, 'gif-cache');
const GUILD = '1360897918504271882';

console.log('\n📊 RAPPORT GIFs - Cache vs Config\n');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const gifs = config.guilds?.[GUILD]?.economy?.actions?.gifs || {};

const cacheFiles = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.gif') || f.endsWith('.png') || f.endsWith('.jpg'));

console.log('✅ GIFs en cache local:', cacheFiles.length);
console.log('');

for (const action in gifs) {
  const actionGifs = gifs[action];
  const successCount = actionGifs.success?.length || 0;
  const failCount = actionGifs.fail?.length || 0;
  
  if (successCount > 0 || failCount > 0) {
    console.log(`\n🎬 ${action.toUpperCase()}`);
    console.log(`   Success: ${successCount} GIF(s)`);
    console.log(`   Fail: ${failCount} GIF(s)`);
    
    // Afficher les URLs
    if (actionGifs.success) {
      actionGifs.success.forEach((url, i) => {
        const isDiscord = url.includes('cdn.discordapp') || url.includes('media.discordapp');
        const isTenor = url.includes('tenor.com');
        const symbol = isDiscord ? '❌ Discord CDN' : (isTenor ? '✅ Tenor' : '✅ Autre');
        console.log(`     [${i+1}] ${symbol}: ${url.substring(0, 70)}...`);
      });
    }
  }
}

console.log('\n\n💡 Pour afficher les GIFs en cache sur le dashboard:');
console.log('   Les 26 GIFs en cache sont accessibles via:');
console.log('   http://88.174.155.230:3002/gif-cache/[filename].gif');
