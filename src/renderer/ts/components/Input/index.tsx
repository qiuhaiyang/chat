import { useState } from 'react';
import './index.css'

export default function Input(props: any) {
    const [active, setActive] = useState(false);
    const {
        type,
        mold,
        callback,
        icon,
        value,
        required,
        placeholder,
        label,
        showLabel
    } = props;
    const isCommon = mold === 'common';
    const inputActive = () => {
        setActive(true);
    }
    const blurActive = () => {
        setActive(false);
    }
    return (
        <div className='inputWrap'>
            <p className={(isCommon ? 'underline' : 'notCommonWrap') + " " + (active ? 'underblue' : '')}>
                { icon ? <img src={icon} className='drag'/> : null}
                {
                    showLabel ? 
                    (required ? 
                    <div className='inputLabel'>
                        <i className='arror'></i>
                        <span className='text'>{ label ? label : '此字段必填'}</span>
                    </div> : null) : null
                }
                <input 
                    className={mold}
                    value={value}
                    type={ type ? type: 'text' } onChange={callback ? callback : null}
                    onFocus= {isCommon ? inputActive : undefined}
                    onBlur={isCommon ? blurActive : undefined}
                    placeholder={placeholder ? placeholder : ''}
                />
            </p>
        </div>
    )
}