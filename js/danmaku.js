const { ipcRenderer } = require('electron');
const axios = require('axios');
const { KeepLiveWS } = require('bilibili-live-ws');

const configProxy = new Proxy(
    {},
    {
        set: (target, prop, value) => {
            switch (prop) {
                case 'RoomId':
                    target[prop] !== value && DanmakuWin.initDanmaku(value);
                    break;
                case 'FontColor':
                    document.querySelector('body').style.setProperty('--font-color', value);
                    break;
                case 'BackgroupOpacity':
                    document.querySelector('body').style.backgroundColor = `rgba(1, 1, 1, ${value})`;
                    break;
                default:
                    break;
            }

            target[prop] = value;
            return true;
        },
    }
);

const DanmakuWin = {
    AutoScrolling: true, // 自动滚动开关
    init: () => {
        ipcRenderer.on('update-app-config', (event, arg) => {
            Object.assign(configProxy, arg);
        });
        ipcRenderer.send('get-app-config', { win: 'danmaku' });

        DanmakuWin.initEvent();
    },
    initDanmaku: (id) => {
        // 获取真实 room_id
        axios({
            method: 'get',
            url: 'https://api.live.bilibili.com/room/v1/Room/room_init',
            params: {
                id,
            },
        })
            .then((response) => {
                if (response.data.code === 0 && response.data.data) {
                    DanmakuWin.initDanmakServer(response.data.data.room_id);
                    DanmakuWin.getRoomInfo(response.data.data.room_id);
                }
            })
            .catch((error) => {
                console.log(error);
            });
    },
    initDanmakServer: (id) => {
        liveDanmaku = new KeepLiveWS(id);

        liveDanmaku.on('open', () => {
            DanmakuWin.showDanmaku('系统', `连接房间 ${id}`);
        });

        liveDanmaku.on('DANMU_MSG', (data) => {
            if (configProxy.FilterRule) {
                if (!new RegExp(configProxy.FilterRule).test(data.info[1])) {
                    return;
                }
            }
            DanmakuWin.showDanmaku(data.info[2][1], data.info[1]);
        });

        liveDanmaku.on('heartbeat', (online) => {
            DanmakuWin.updateOnline(online);
        });

        liveDanmaku.heartbeat();
    },
    initEvent: () => {
        // 双击计数区域最小化窗口
        document.querySelector('header>span').addEventListener('dblclick', () => {
            ipcRenderer.send('hidden-danmaku-windows');
        });

        // 滚动弹幕区域事件
        document.querySelector('main>ul').addEventListener('scroll', (e) => {
            // 当用户滚动区域时关闭自动滚动
            if (e.target.scrollHeight !== e.target.scrollTop + e.target.clientHeight) {
                DanmakuWin.AutoScrolling = false;
            } else if (e.target.scrollHeight === e.target.scrollTop + e.target.clientHeight) {
                DanmakuWin.AutoScrolling = true;
            }
        })
    },
    getRoomInfo: (id) => {
        // 获取房间信息
        axios({
            method: 'get',
            url: 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom',
            params: {
                room_id: id,
            },
        })
            .then((response) => {
                if (response.data.code === 0 && response.data.data) {
                    DanmakuWin.updateUserName(response.data.data.anchor_info.base_info.uname);
                }
            })
            .catch((error) => {
                console.log(error);
            });
    },
    showDanmaku: (user, msg) => {
        const DanmakuList = document.querySelector('main>ul');
        DanmakuList.innerHTML = DanmakuList.innerHTML + `\n<li><p>${user}: </p><span>${msg}</span></li>`;
        DanmakuWin.AutoScrolling && (DanmakuList.scrollTop = DanmakuList.scrollHeight); // 判断自动滚动 flag
    },
    updateUserName: (value) => {
        document.querySelector('header>p').innerHTML = value;
    },
    updateOnline: (value) => {
        document.querySelector('header>span').innerHTML = value;
    },
};

DanmakuWin.init();
