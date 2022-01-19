interface Window {
    electron: {
        ipcRenderer: {
            on: (channel: string, func: any) => void,
            once: (channel: string, func: any) => void,
            send: (channel: string, ...args: any) => void,
            invoke: (channel: string, ...args: any) => Promise<any>,
            removeListener: (channel: string, func: any) => void,
            removeAllListeners: (channel: string) => void
        },
        localImage: {
            icon: string,
            bkImage: string,
            minSizeIcon: string,
            closeIcon: string,
            dafaultAvatar: string,
            userIcon: string,
            pwdIcon: string,
            registerBkImage: string,
            homeHeaderBK: string,
            chatBackgroundImage: string,
            unknownfile: string,
            folder: string
        }
    }
}
