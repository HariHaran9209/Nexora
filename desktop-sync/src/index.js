// desktop-sync/src/index.js
const { loadConfig } = require('./config');
const syncEngine = require('./syncEngine');

console.log('====================================================');
console.log('  ⚡ Nexora Windows 11 Single-Folder Sync Daemon');
console.log('====================================================');

const config = loadConfig();

if (!config.token) {
  console.log('⚠️  No authentication token found.');
  console.log('👉 Please run setup first: npm run setup\n');
  process.exit(1);
}

console.log(`📡 Connected Server: ${config.serverUrl}`);
console.log(`📂 Designated Sync Folder: ${config.syncFolderPath}`);
console.log(`🔒 Single-folder isolation active. No other files on this machine are touched.\n`);

syncEngine.startWatcher();

process.on('SIGINT', () => {
  console.log('\n[Sync] Stopping sync engine...');
  syncEngine.stopWatcher();
  process.exit(0);
});
