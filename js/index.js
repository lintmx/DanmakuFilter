const { ipcRenderer } = require('electron');

let appConfig = {};
const configProxy = new Proxy(appConfig, {
    get: (target, prop) => {
        const dom = document.querySelector('#' + prop) || {};
        switch (dom.type) {
            case 'text':
            case 'select-one':
                return document.querySelector('#' + prop).value;
            case 'checkbox':
                return document.querySelector('#' + prop).checked;
        }
    },
    set: (target, prop, value) => {
        target[prop] = value;
        const dom = document.querySelector('#' + prop) || {};

        switch (dom.type) {
            case 'text':
            case 'select-one':
                document.querySelector('#' + prop).value = value;
                break;
            case 'checkbox':
                document.querySelector('#' + prop).checked = value;
                break;
        }
        return true;
    },
});

const mainWindow = {
    init: () => {
        ipcRenderer.on('update-app-config', (event, arg) => {
            Object.assign(configProxy, arg);
        });
        ipcRenderer.send('get-app-config', { win: 'main' });
    },
    close: () => {
        ipcRenderer.send('close-main-window');
    },
    minimize: () => {
        ipcRenderer.send('minimize-main-window');
    },
    danmaku: () => {
        ipcRenderer.send('show-danmaku-window');
    },
};
mainWindow.init();

// Event
document.querySelector('button[aria-label="Close"]').addEventListener('click', () => {
    mainWindow.close();
});
document.querySelector('button[aria-label="Minimize"]').addEventListener('click', () => {
    mainWindow.minimize();
});
document.querySelector('body').addEventListener('change', (e) => {
    ipcRenderer.send('update-app-config', {
        Key: e.target.id,
        Value: configProxy[e.target.id],
    });
});
document.querySelector('#DanmakuWin').addEventListener('click', () => {
    ipcRenderer.send('show-danmaku-window');
});
