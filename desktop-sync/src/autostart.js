// desktop-sync/src/autostart.js
const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { loadConfig } = require('./config');

const DESKTOP_SYNC_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(DESKTOP_SYNC_DIR, '.sync.pid');
const LOG_FILE = path.join(DESKTOP_SYNC_DIR, 'sync.log');
const BAT_FILE = path.join(DESKTOP_SYNC_DIR, 'run-sync.bat');
const VBS_FILE = path.join(DESKTOP_SYNC_DIR, 'start-silent.vbs');

const STARTUP_DIR = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Roaming'),
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
);
const STARTUP_VBS_FILE = path.join(STARTUP_DIR, 'NexoraSync.vbs');

function generateBatScript() {
  const content = `@echo off\r\ncd /d "%~dp0"\r\nnode src/index.js >> "%~dp0sync.log" 2>&1\r\n`;
  fs.writeFileSync(BAT_FILE, content, 'utf8');
}

function generateVbsScript(targetBat) {
  const content = `Set WshShell = CreateObject("WScript.Shell")\r\nWshShell.Run Chr(34) & "${targetBat.replace(/"/g, '""')}" & Chr(34), 0, False\r\nSet WshShell = Nothing\r\n`;
  return content;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function getRunningPid() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pidStr = fs.readFileSync(PID_FILE, 'utf8').trim();
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && isPidAlive(pid)) {
        return pid;
      }
    } catch (e) {}
  }
  return null;
}

function launchDetachedDaemon() {
  generateBatScript();
  const vbsContent = generateVbsScript(BAT_FILE);
  fs.writeFileSync(VBS_FILE, vbsContent, 'utf8');

  const child = spawn('wscript.exe', [VBS_FILE], {
    cwd: DESKTOP_SYNC_DIR,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

function enableAutostart() {
  console.log('====================================================');
  console.log('  ⚡ Setting up Nexora Background Auto-Sync');
  console.log('====================================================\n');

  const config = loadConfig();
  if (!config.token) {
    console.log('⚠️  No authentication token found.');
    console.log('👉 Please run setup first: npm run setup\n');
    process.exit(1);
  }

  // 1. Generate local bat & vbs
  generateBatScript();
  const vbsContent = generateVbsScript(BAT_FILE);
  fs.writeFileSync(VBS_FILE, vbsContent, 'utf8');

  // 2. Ensure startup directory exists and write NexoraSync.vbs
  fs.ensureDirSync(STARTUP_DIR);
  fs.writeFileSync(STARTUP_VBS_FILE, vbsContent, 'utf8');

  console.log(`✅ Auto-start registered in Windows Startup folder:`);
  console.log(`   ${STARTUP_VBS_FILE}\n`);

  // 3. Start daemon now if not running
  const runningPid = getRunningPid();
  if (runningPid) {
    console.log(`ℹ️  Nexora Sync is already running in background (PID: ${runningPid}).`);
  } else {
    console.log('🚀 Starting Nexora Sync daemon silently in the background...');
    launchDetachedDaemon();

    // Wait a brief moment to confirm PID
    setTimeout(() => {
      const pid = getRunningPid();
      if (pid) {
        console.log(`\n🎉 Success! Sync is running in the background (PID: ${pid}).`);
      } else {
        console.log('\n🎉 Auto-start enabled! Sync daemon has been launched.');
      }
      console.log(`\n💡 How this works:`);
      console.log(`   • Whenever your laptop boots/logs in, Nexora Sync starts automatically.`);
      console.log(`   • No terminal or command prompt window will stay open.`);
      console.log(`   • Check logs anytime:   npm run autostart:logs`);
      console.log(`   • Check status:         npm run autostart:status`);
      console.log(`   • Disable anytime:      npm run autostart:disable\n`);
    }, 2000);
  }
}

function disableAutostart() {
  console.log('====================================================');
  console.log('  ⚡ Disabling Nexora Background Auto-Sync');
  console.log('====================================================\n');

  if (fs.existsSync(STARTUP_VBS_FILE)) {
    fs.removeSync(STARTUP_VBS_FILE);
    console.log('🗑️  Removed auto-start file from Windows Startup folder.');
  } else {
    console.log('ℹ️  No auto-start file found in Windows Startup folder.');
  }

  stopDaemon();
  console.log('✅ Auto-start has been disabled.\n');
}

function startDaemon() {
  const runningPid = getRunningPid();
  if (runningPid) {
    console.log(`ℹ️  Nexora Sync is already running in background (PID: ${runningPid}).`);
    return;
  }
  
  console.log('🚀 Starting Nexora Sync in background...');
  launchDetachedDaemon();

  setTimeout(() => {
    const pid = getRunningPid();
    if (pid) {
      console.log(`✅ Nexora Sync started in background (PID: ${pid}).`);
    } else {
      console.log('✅ Launched background sync process.');
    }
  }, 2000);
}

function stopDaemon() {
  const runningPid = getRunningPid();
  if (runningPid) {
    try {
      execSync(`taskkill /pid ${runningPid} /T /F`, { stdio: 'ignore' });
      console.log(`🛑 Stopped background sync process (PID: ${runningPid}).`);
    } catch (e) {
      console.warn(`⚠️ Could not stop PID ${runningPid}: ${e.message}`);
    }
    try {
      if (fs.existsSync(PID_FILE)) fs.removeSync(PID_FILE);
    } catch (e) {}
  } else {
    console.log('ℹ️  No running background sync process found.');
  }
}

function printStatus() {
  console.log('====================================================');
  console.log('  ⚡ Nexora Windows 11 Sync Status');
  console.log('====================================================\n');

  const autostartActive = fs.existsSync(STARTUP_VBS_FILE);
  const runningPid = getRunningPid();
  const config = loadConfig();

  console.log(`⚙️  Auto-start on Windows Boot : ${autostartActive ? '🟢 ENABLED' : '⚪ DISABLED'}`);
  console.log(`🔄 Background Daemon Status   : ${runningPid ? `🟢 RUNNING (PID: ${runningPid})` : '⚪ STOPPED'}`);
  console.log(`📂 Sync Directory             : ${config.syncFolderPath}`);
  console.log(`📡 Nexora Server              : ${config.serverUrl}`);
  console.log(`📄 Log File                   : ${LOG_FILE}\n`);

  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split(/\r?\n/);
    const recent = lines.slice(-8);
    console.log('--- Recent Activity (sync.log) ---');
    recent.forEach((line) => console.log(`  ${line}`));
    console.log('----------------------------------\n');
  }
}

function showLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('ℹ️  No log file found yet. (Has the sync daemon run?)');
    return;
  }
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = content.trim().split(/\r?\n/);
  const recent = lines.slice(-30);
  console.log('====================================================');
  console.log('  📄 Nexora Sync Logs (Last 30 lines)');
  console.log('====================================================\n');
  recent.forEach((l) => console.log(l));
  console.log('\n(Log file: ' + LOG_FILE + ')\n');
}

const command = process.argv[2] || 'status';

switch (command) {
  case 'enable':
    enableAutostart();
    break;
  case 'disable':
    disableAutostart();
    break;
  case 'start':
    startDaemon();
    break;
  case 'stop':
    stopDaemon();
    break;
  case 'status':
    printStatus();
    break;
  case 'logs':
    showLogs();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Usage: node src/autostart.js [enable|disable|start|stop|status|logs]');
}
