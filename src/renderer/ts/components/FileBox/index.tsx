import { useState } from 'react';
import './index.css';

export default function FileBox(props: any) {
    const [fileIsExist, setFileIsExist] = useState(true);
    const { folder, filename } = props.content;
    const { unknownfile } = window.electron.localImage;
    const openFile = () => {
        if(fileIsExist) {
            window.electron.ipcRenderer.invoke('chat-open-file', folder, filename).then((res) => {
                if(!res) {
                    setFileIsExist(false);
                }
            });
        }
    }

    const openFolder = () => {
        if(fileIsExist) {
            window.electron.ipcRenderer.invoke('chat-open-folder', folder, filename).then((res) => {
                if(!res) {
                    setFileIsExist(false);
                }
            });
        }
    }


    return (
        <div className='fileBoxWrap'>
            <div className='fileInfoShow'>
                <img src={unknownfile} className='fileIcon'/>
                <div className='fileInfo'>
                    <span>{filename}</span>
                    <span className='tips'>{fileIsExist ? '成功接收文件' : '文件已被删除'}</span>
                </div>
            </div>
            <div className='fileOperator'>
                <span className={fileIsExist ? 'openFile' : 'delete'} onClick={openFile}>打开</span>
                <span className={fileIsExist ? 'openFolder' : 'delete'} onClick={openFolder}>打开文件夹</span>
            </div>
        </div>
    )
}