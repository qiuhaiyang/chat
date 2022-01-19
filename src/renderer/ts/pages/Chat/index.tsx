import { PureComponent, createRef } from "react";
import { Bar, ContentLoader, InfoBox } from '../../components/index';
import './index.css'

export default class Chat extends PureComponent {
    chatFrame = createRef() as React.RefObject<HTMLDivElement>;
    state = {
        chatContent: [],
        contentLoading: false,
        textareaData: '',
        isSendMsg: false,
        offset:0,
        // 是否还有旧聊天记录
        haveMore: true
    }

    keyDown = (e: any) => {
        if(e.keyCode === 13) {
            // enter键
            e.preventDefault();
            this.sendMsg();
        }
    }

    textareaChange = (e: any) => {
        this.setState({textareaData: e.target.value});
    }

    sendMsg = () => {
        const { textareaData, chatContent } = this.state;
        // 可以获取nick
        const { account, selfnick } = (this.props as any).match.params;
        if(textareaData) {
            const msg = {
                type: 'message',
                nick: selfnick,
                time: Date.now(),
                content: textareaData
            };
            this.setState({
                chatContent: [...chatContent, msg],
                textareaData: '',
                isSendMsg: true
            });
            // 发送account与数据结构
            window.electron.ipcRenderer.invoke('messageSend', account, msg).then((res) => {
                // 发送成功还是失败
                if(res !== true) {
                    // 表明发送或者存储失败
                }
            });
        }
    }

    componentDidUpdate() {
        const { isSendMsg } = this.state;
        if(isSendMsg) {
            if(this.chatFrame.current) {
                this.chatFrame.current.scrollTop = this.chatFrame.current.scrollHeight;
                this.setState({
                    isSendMsg: false
                });
            }
        }
    }

    componentDidMount() {
        const { account } = (this.props as any).match.params;
        if(this.chatFrame.current) {
            this.chatFrame.current.scrollTop = this.chatFrame.current.scrollHeight;
        }
        window.electron.ipcRenderer.on(account, (event: any, data: any) => {
            const { chatContent } = this.state;
            let obj = JSON.parse(data);
            this.setState({
                chatContent: [...chatContent, obj],
                isSendMsg: true
            });
        })
    }
    
    componentWillUnmount() {
        const { account } = (this.props as any).match.params;
        window.electron.ipcRenderer.removeAllListeners(account);
    }
    // 文件
    openDialog = () => {
        const { account, selfnick } = (this.props as any).match.params;
        window.electron.ipcRenderer.invoke('openFileDialogAndSend', account, selfnick).then((res) => {
            if(res !== false) {
                const { chatContent } = this.state;
                this.setState({
                    chatContent: [...chatContent, ...res],
                    isSendMsg: true
                });
            }
        });
    }
    viewMoreData = () => {
        const { haveMore, offset, chatContent } = this.state;
        if(!haveMore) {
            return;
        }
        this.setState({contentLoading: true});
        const { account } = (this.props as any).match.params;
        window.electron.ipcRenderer.invoke('getChatInfo', account, offset).then((res) => {
            if(this.chatFrame.current) {
                this.chatFrame.current.scrollTop = 25;
            }
            if(res.length) {
                res.reverse();
                this.setState({
                    chatContent: [...res, ...chatContent],
                    contentLoading: false,
                    offset: offset + 1
                });
            } else {
                this.setState({
                    haveMore: false,
                    contentLoading: false,
                });
                if(this.chatFrame.current) {
                    this.chatFrame.current.scrollTop = 0;
                }
            }
            
        });
    }

    render() {
        const { nick } = (this.props as any).match.params;
        const { chatBackgroundImage, folder } = window.electron.localImage;
        const { chatContent, contentLoading, textareaData, haveMore } = this.state;
        return (
            <div className="chatWrap">
                <div className="chatHeader" style={{backgroundImage: `url(${chatBackgroundImage})`}}></div>
                <Bar nick={nick} minToBar={true} />
                <div className="chatFrame" ref={this.chatFrame}>
                    <div className="loadingWrap">
                        {
                            contentLoading ? <ContentLoader /> : <span
                                className={"moreContent"+ (haveMore ? '':' noContent')}
                                onClick={this.viewMoreData}
                            >{haveMore ? '查看更多消息' : '没有更多消息了'}</span>
                        }
                    </div>
                    <div className="chatContent">
                        {
                            chatContent.map((item: any) => {
                                if(!item) {
                                    return null;
                                }
                                return <InfoBox {...item} key={item.time} />
                            })
                        }
                    </div>
                </div>
                <div className="operatorFrame">
                    <div className="operatorBtn">
                        <div className="sendFile" onClick={this.openDialog}>
                            <img src={folder} />
                        </div>
                    </div>
                    <div className="msgInput" onKeyDown={this.keyDown}>
                        <textarea onChange={this.textareaChange} value={textareaData} />
                    </div>
                    <div className="sendMsgBtn">
                        <span onClick={this.sendMsg}>发送消息</span>
                    </div>
                </div>
            </div>
        )
    }
}