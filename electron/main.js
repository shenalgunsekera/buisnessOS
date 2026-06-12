const { app, BrowserWindow, Tray, Menu, Notification, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development';
const PORT = Number(process.env.PORT || 4000);
const APP_URL = `http://localhost:${PORT}`;
const DEV_URL = 'http://localhost:3100';
const PROJECT_ROOT = path.join(__dirname, '..');
const TRAY_ICON = path.join(__dirname, 'tray.png');
const WINDOW_ICON = path.join(__dirname, 'icon.png');

let mainWindow = null;
let serverProcess = null;
let logStream = null;
let tray = null;
let isQuitting = false;

// Ensure only one running instance — second launch from Startup folder should focus the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

function getLogPath() {
  try {
    return path.join(app.getPath('userData'), 'businessos.log');
  } catch {
    return path.join(PROJECT_ROOT, 'businessos.log');
  }
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  process.stdout.write(line);
  if (logStream) logStream.write(line);
}

function initLog() {
  try {
    const p = getLogPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    logStream = fs.createWriteStream(p, { flags: 'a' });
    log('--- BusinessOS start ---');
    log('NODE_ENV', process.env.NODE_ENV);
    log('PROJECT_ROOT', PROJECT_ROOT);
    log('logPath', p);
  } catch (e) {
    process.stdout.write('failed to open log: ' + e.message + '\n');
  }
}

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get(`${APP_URL}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await pingServer()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function startProductionServer() {
  const serverEntry = path.join(PROJECT_ROOT, 'dist-server', 'index.js');
  if (!fs.existsSync(serverEntry)) {
    log('FATAL: dist-server/index.js not found at', serverEntry);
    return false;
  }
  log('starting server:', serverEntry);

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      BUSINESSOS_OUT_DIR: path.join(PROJECT_ROOT, 'out'),
      PORT: String(PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (d) => log('[server stdout]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => log('[server stderr]', d.toString().trim()));
  serverProcess.on('error', (e) => log('[server error]', e.message));
  serverProcess.on('exit', (code, signal) => {
    log('[server exit] code', code, 'signal', signal);
    serverProcess = null;
  });
  return true;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'BusinessOS',
    icon: WINDOW_ICON,
    backgroundColor: '#f8fafc',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  // Hide instead of close — keeps the scheduler running in the background.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      maybeShowBackgroundNotice();
    }
  });

  mainWindow.loadURL(url);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

function showWindow() {
  if (!mainWindow) {
    createWindow(isDev ? DEV_URL : APP_URL);
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function setupTray() {
  const image = nativeImage.createFromPath(TRAY_ICON);
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('BusinessOS');
  const menu = Menu.buildFromTemplate([
    { label: 'Open BusinessOS', click: () => showWindow() },
    { type: 'separator' },
    {
      label: 'Run reminder check now',
      click: () => {
        // Triggers the same scheduler endpoint the dashboard "Run now" button uses.
        const req = http.request(
          { hostname: 'localhost', port: PORT, path: '/api/reminders/run-now', method: 'POST' },
          (res) => res.resume(),
        );
        req.on('error', (e) => log('[tray run-now] error', e.message));
        req.end();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => showWindow());
  tray.on('double-click', () => showWindow());
}

function maybeShowBackgroundNotice() {
  // Only show once per process — let the user know we keep running in the background.
  if (maybeShowBackgroundNotice.shown) return;
  maybeShowBackgroundNotice.shown = true;
  try {
    new Notification({
      title: 'BusinessOS is running in the background',
      body: 'Reminders keep working. Click the tray icon to bring the window back.',
      icon: WINDOW_ICON,
    }).show();
  } catch {}
}

// If a second instance launches (e.g., user double-clicks shortcut while app is hidden), surface the window.
app.on('second-instance', () => showWindow());

app.whenReady().then(async () => {
  initLog();
  app.setAppUserModelId('com.businessos.app');
  setupTray();

  // Persist auto-launch as a fallback to the Startup folder shortcut.
  if (!isDev) {
    try {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    } catch (e) {
      log('setLoginItemSettings failed', e.message);
    }
  }

  if (isDev) {
    log('dev mode, loading', DEV_URL);
    createWindow(DEV_URL);
  } else {
    if (!startProductionServer()) {
      app.quit();
      return;
    }
    log('waiting for server on', APP_URL);
    const ok = await waitForServer();
    if (!ok) {
      log('FATAL: server did not become ready in time');
      app.quit();
      return;
    }
    log('server ready');
    // If launched at login with --hidden, stay in tray. Otherwise show the window.
    const startHidden = process.argv.includes('--hidden') || process.env.BUSINESSOS_HIDDEN === '1';
    if (!startHidden) createWindow(APP_URL);
    else log('started hidden (tray-only)');
  }
});

app.on('window-all-closed', (e) => {
  // Don't quit — we live in the tray. Quit only via tray menu.
  e.preventDefault?.();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('quit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch {}
    serverProcess = null;
  }
  if (logStream) {
    try { logStream.end(); } catch {}
    logStream = null;
  }
});
