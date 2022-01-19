import './index.css'
import { memo } from 'react';
export default memo(function Bar(props: any) {
    const { icon, minSizeIcon, closeIcon } = window.electron.localImage;
    const { minToBar, nick } = props;
    const minimizeToTray = (e: any) => {
        e.preventDefault();
        window.electron.ipcRenderer.send('minimizeToTray');
    }

    const winClose = (e: any) => {
        e.preventDefault();
        window.electron.ipcRenderer.send('winClose');
    }
    
    const minimizeToBar = (e: any) => {
        e.preventDefault();
        window.electron.ipcRenderer.send('minimizeToBar');
    }
    return (
        <div className='bar'>
            <div className='appInfo'>
                <img src={icon}/>
                <span>WeChat</span>
            </div>
            {nick ? <span className='nick'>{nick}</span> : null}
            <div className='btns'>
                <div className='minsize btn' onClick={minToBar ? minimizeToBar : minimizeToTray}>
                    <img src={minSizeIcon} />
                </div>
                <div className='close btn' onClick={winClose}>
                    <img src={closeIcon} />
                </div>
            </div>
        </div>
    )
})