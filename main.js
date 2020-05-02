const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');

const store = new Store();

let window = {};
let appConfig = {};
const defaultConfig = {
    RoomId: 14917277,
    FilterRule: '【',
    FontColor: '#FFFF00',
    BackgroupOpacity: '0.2',
    LockDanmakuWin: false,
};
Object.defineProperty(appConfig, 'LockDanmakuWin', {
    set: (value) => {
        window.danmaku && window.danmaku.setIgnoreMouseEvents(value);
    },
});

const WindowsManager = {
    initMainWindow: () => {
        window.main && window.main.destroy();

        // 初始化主窗口
        window.main = new BrowserWindow({
            width: 270,
            height: 285,
            frame: false, // 无边框
            resizable: false, // 不可以调整大小
            webPreferences: {
                nodeIntegration: true,
            },
        });
        window.main.loadFile('index.html');
    },
    initDanmakuWindow: () => {
        window.danmaku && window.danmaku.destroy();

        // 初始化弹幕窗口
        window.danmaku = new BrowserWindow({
            width: 400,
            height: 600,
            minWidth: 250,
            frame: false, // 无边框
            alwaysOnTop: true, // 置顶
            transparent: true, // 窗口透明
            webPreferences: {
                nodeIntegration: true,
            },
        });
        window.danmaku.loadFile('danmaku.html');
        window.danmaku.setIgnoreMouseEvents(appConfig.LockDanmakuWin);

        window.danmaku.on('closed', () => {
            window.danmaku = undefined;
        });
    },
    initIpcAction: () => {
        ipcMain.on('close-main-window', (event, arg) => {
            window.main && window.main.close();
            window.danmaku && window.danmaku.close();
        });
        ipcMain.on('minimize-main-window', (event, arg) => {
            window.main && window.main.minimize();
        });
        ipcMain.on('show-danmaku-window', (event, arg) => {
            !window.danmaku && WindowsManager.initDanmakuWindow();
        });
        ipcMain.on('destroy-danmaku-window', (event, arg) => {
            window.danmaku && window.danmaku.destroy();
            window.danmaku = undefined;
        });
        ipcMain.on('get-app-config', (event, arg = {}) => {
            const { win = 'main' } = arg;
            window[win] && window[win].webContents.send('update-app-config', appConfig);
        });
        ipcMain.on('update-app-config', (event, arg = {}) => {
            appConfig[arg.Key] = arg.Value;
            store.set('config', appConfig);
            window.danmaku && window.danmaku.webContents.send('update-app-config', appConfig);
        });
    },
    initConfig: () => {
        storedConfig = store.get('config', defaultConfig);
        Object.assign(appConfig, storedConfig);
    },
};

app.name = 'DanmakuFilter';

app.whenReady().then(WindowsManager.initMainWindow);
app.whenReady().then(WindowsManager.initConfig);
app.whenReady().then(WindowsManager.initIpcAction);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        WindowsManager.initMainWindow();
    }
});
