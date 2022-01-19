import { BrowserWindow } from 'electron';
import path from 'path';
// 创建聊天窗口
export default function create(url: string, options: any = {}) {
    const win = new BrowserWindow(Object.assign({
        show: false,
        width: 800,
        height: 500,
        resizable: false,
        frame: false,
        transparent: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          webSecurity: false
        },
      }, options));
      win.loadURL(url);
      win.once('ready-to-show', () => {
        win.show()
      });
      return win;
}