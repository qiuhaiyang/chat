const { contextBridge, ipcRenderer, nativeImage } = require('electron');
const path = require('path');

async function main(){
  const assertPath = await ipcRenderer.invoke('getAssertPath');
  const icon = path.resolve(assertPath, 'icon.png');
  const bkImage = path.resolve(assertPath, 'backgroundImage', 'loginBKImage.gif').replaceAll('\\', '/');
  const registerBkImage = path.resolve(assertPath, 'backgroundImage', 'registerBKImg.jpeg').replaceAll('\\', '/');
  const minSizeIcon = path.resolve(assertPath, 'func_icon', 'delete01.png');
  const closeIcon = path.resolve(assertPath, 'func_icon', 'cancel01.png');
  const dafaultAvatar = path.resolve(assertPath, 'avatar.jpg');
  const userIcon = path.resolve(assertPath, 'icons', 'user.png');
  const pwdIcon = path.resolve(assertPath, 'icons', 'pwd.png');
  const unknownfile = path.resolve(assertPath, 'icons', 'unknownfile.png');
  const folder = path.resolve(assertPath, 'icons', 'folder.png');
  const homeHeaderBK = path.resolve(assertPath, 'backgroundImage', 'homeHeaderBk.jpeg').replaceAll('\\', '/');
  const chatBackgroundImage = path.resolve(assertPath, 'backgroundImage', 'chatBackgroundImage.jpg').replaceAll('\\', '/');
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      on(channel, func) {
        ipcRenderer.on(channel, func);
      },
      once(channel, func) {
        ipcRenderer.once(channel, func);
      },
      send(channel, ...args) {
          ipcRenderer.send(channel, ...args);
      },
      async invoke(channel, ...args) {
          return await ipcRenderer.invoke(channel, ...args);
      },
      removeListener(channel, listener) {
        ipcRenderer.removeListener(channel, listener);
      },
      removeAllListeners(channel) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
    localImage: {
      icon,
      bkImage,
      minSizeIcon,
      closeIcon,
      dafaultAvatar,
      userIcon,
      pwdIcon,
      registerBkImage,
      homeHeaderBK,
      chatBackgroundImage,
      unknownfile,
      folder
    }
  });
}

main();
