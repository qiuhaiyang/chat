import './index.css';
import { memo } from 'react';

export default memo(function Warning(props: any) {
    const { msg } = props;
    return (
        <div className='warningWrap'>
            <span>{ msg }</span>
            <div className='warningCover'></div>
        </div>
    )
});