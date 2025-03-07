const { BrowserWindow } = require('electron');
const path = require('path');
const config = require('./config');

let lyricWindow = null;

const createWin = () => {
  lyricWindow = new BrowserWindow({
    width: 800,
    height: 300,
    frame: false,
    show: false,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: `${__dirname}/preload.js`,
      webSecurity: false,
    },
  });
};

const loadLyricWindow = (ipcMain) => {
  ipcMain.on('open-lyric', () => {
    if (lyricWindow) {
      if (lyricWindow.isMinimized()) lyricWindow.restore();
      lyricWindow.focus();
      lyricWindow.show();
      return;
    }
    createWin();
    if (process.env.NODE_ENV === 'development') {
      lyricWindow.webContents.openDevTools({ mode: 'detach' });
      lyricWindow.loadURL(`http://localhost:${config.development.lyricPort}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, config.production.distPath);
      lyricWindow.loadURL(`file://${distPath}/index.html#/lyric`);
    }

    lyricWindow.setMinimumSize(600, 200);

    // 隐藏任务栏
    lyricWindow.setSkipTaskbar(true);

    lyricWindow.show();
  });

  ipcMain.on('send-lyric', (e, data) => {
    if (lyricWindow) {
      lyricWindow.webContents.send('receive-lyric', data);
    }
  });

  ipcMain.on('top-lyric', (e, data) => {
    lyricWindow.setAlwaysOnTop(data);
  });

  ipcMain.on('close-lyric', () => {
    lyricWindow.close();
    lyricWindow = null;
  });

  ipcMain.on('mouseenter-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(true);
  });

  ipcMain.on('mouseleave-lyric', () => {
    lyricWindow.setIgnoreMouseEvents(false);
  });
};

module.exports = {
  loadLyricWindow,
};
