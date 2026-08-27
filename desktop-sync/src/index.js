// desktop-sync/src/index.js
const fs = require('fs-extra');
const path = require('path');
const { loadConfig } = require('./config');
const syncEngine = require('./syncEngine');

const PID_FILE = path.join(__dirname, '../.sync.pid');
fs.writeFileSync(PID_FILE, process.pid.toString());

const cleanup = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.removeSync(PID_FILE);
    }
  } catch (e) {}
};

process.on('exit', (code) => {
  console.log(`[Sync] Process exiting with code: ${code}`);
  cleanup();
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});
process.on('SIGINT', () => {
  console.log('\n[Sync] Stopping sync engine...');
  syncEngine.stopWatcher();
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n[Sync] Terminating sync engine...');
  syncEngine.stopWatcher();
  cleanup();
  process.exit(0);
});

console.log('====================================================');
console.log(`  ⚡ Nexora Windows 11 Single-Folder Sync Daemon [PID: ${process.pid}]`);
console.log(`  🕒 Started at: ${new Date().toLocaleString()}`);
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
