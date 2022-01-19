import { memo } from 'react';
import './index.css';

export default memo(function User(props: any) {
    const { account, nick, avatar, selfnick, unReadCount, setUnReadCount } = props;
    const openChatWindow = () => {
        window.electron.ipcRenderer.send('open-new-chat-window', account, nick, selfnick);
        if(unReadCount) {
            setUnReadCount(account, true);
        }
    }
    return (
        <div className='userItemWrap' onDoubleClick={openChatWindow}>
            <img src={avatar} className='avatar' />
            <div className='userItemContent'>
                <span className='account'>({account})</span>
                <span className='nick'>{nick}</span>
            </div>
            <div className={`redCountTip ${unReadCount ? 'haveUnRead' : ''}`}>
                <span>{unReadCount}</span>
            </div>
        </div>
    )
});