// desktop-sync/src/setup.js
const readline = require('readline');
const path = require('path');
const fs = require('fs-extra');
const { loadConfig, saveConfig } = require('./config');
const apiClient = require('./apiClient');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runSetup() {
  console.log('====================================================');
  console.log('  ⚡ Nexora Windows 11 Single-Folder Sync Setup');
  console.log('====================================================\n');

  const currentConfig = loadConfig();

  const serverUrl =
    (await askQuestion(`Server URL [default: ${currentConfig.serverUrl}]: `)).trim() || currentConfig.serverUrl;

  const username = (await askQuestion('Nexora Username / Email: ')).trim();
  const password = (await askQuestion('Nexora Password: ')).trim();

  let defaultFolder = currentConfig.syncFolderPath;
  const syncFolderPath =
    (await askQuestion(`Local Designated Folder Path to Sync [default: ${defaultFolder}]: `)).trim() || defaultFolder;

  console.log('\n[Setup] Authenticating with Nexora server...');

  try {
    currentConfig.serverUrl = serverUrl;
    currentConfig.syncFolderPath = path.resolve(syncFolderPath);
    saveConfig(currentConfig);

    const loginRes = await apiClient.login(username, password);
    currentConfig.token = loginRes.token;
    saveConfig(currentConfig);

    await fs.ensureDir(currentConfig.syncFolderPath);

    console.log('\n✅ Setup Successful!');
    console.log(`📂 Designated Sync Folder: ${currentConfig.syncFolderPath}`);
    console.log('🚀 You can now start the continuous sync client with: npm start\n');
  } catch (error) {
    console.error('\n❌ Setup Failed:', error.response?.data?.error || error.message);
  } finally {
    rl.close();
  }
}

runSetup();
