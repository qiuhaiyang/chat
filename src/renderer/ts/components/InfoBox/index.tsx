import FileBox from '../FileBox';
import MessageBox from '../MessageBox';
import './index.css';
import { memo } from 'react';

function formatDate(datetime: number) {
    var date = new Date(datetime); //datetime时间戳为13位毫秒级别,如为10位需乘1000
    var month = ("0" + (date.getMonth() + 1)).slice(-2),	// getMonth是从1-11,所以需要加1
        sdate = ("0" + date.getDate()).slice(-2),	// -2表示从倒数第二个元素开始截取
        hour = ("0" + date.getHours()).slice(-2),
        minute = ("0" + date.getMinutes()).slice(-2),
        second = ("0" + date.getSeconds()).slice(-2);
    var thatDate = date.getFullYear() + "-" + month + "-" + sdate + " " + hour + ":" + minute + ":" + second;
    // 返回
    return thatDate;
}

export default memo(function InfoBox(props: any) {
    const { type, content, nick, time } = props;
    
    return (
        <div className='infoBoxWrap'>
            <div className='infoheader'>
                <span className='nick'>{nick}</span>
                <span className='time'>{formatDate(time)}</span>
            </div>
            {
                type === 'file' ?
                    <FileBox content={content} /> :
                    <MessageBox content={content} />
            }
        </div>
    )
})