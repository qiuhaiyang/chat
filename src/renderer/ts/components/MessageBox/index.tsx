import './index.css';

export default function MessageBox(props: any) {
    const { content } = props;
    return (
        <div className='messageWrap'>{content}</div>
    )
}