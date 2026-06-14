// Electron main process for the full-local desktop build.
//
// It starts the Next.js standalone server (.next/standalone/server.js) on a
// local port using Electron's bundled Node, waits until it responds, then opens
// a window pointing at it. The app runs entirely on the user's machine (no
// Vercel); Supabase remains the cloud backend per the chosen architecture.
//
// Secrets: NEXT_PUBLIC_* values are baked at build time (next build). Server-only
// secrets (service role key, encryption key, etc.) are loaded at runtime from a
// .env file placed next to the executable or in the app's userData directory, so
// they are not bundled into the distributed binary.

const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const PORT = process.env.APP_PORT || "31745";
const HOST = "127.0.0.1";
let serverProcess = null;

function loadRuntimeEnv() {
  // Look for a .env beside the executable first, then in userData.
  const candidates = [
    path.join(path.dirname(app.getPath("exe")), ".env"),
    path.join(app.getPath("userData"), ".env"),
  ];
  const env = {};
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    } catch {
      // Ignore unreadable env files; the app will surface missing-config errors.
    }
  }
  return env;
}

function serverEntry() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");
}

function startServer() {
  const entry = serverEntry();
  serverProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ...loadRuntimeEnv(),
      ELECTRON_RUN_AS_NODE: "1",
      PORT,
      HOSTNAME: HOST,
    },
    stdio: "inherit",
  });
  serverProcess.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Next server exited with code ${code}`);
    }
  });
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (left <= 0) {
          reject(new Error("로컬 서버 시작 시간 초과"));
          return;
        }
        setTimeout(() => tryOnce(left - 1), 500);
      });
    };
    tryOnce(attempts);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // Open external links in the system browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.loadURL(`http://${HOST}:${PORT}`);
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer(`http://${HOST}:${PORT}`);
  } catch (e) {
    console.error(e);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") app.quit();
});
app.on("quit", stopServer);
