import { PureComponent } from 'react';
import { Bar, Input, Loader, Warning } from '../../components/index';
import './index.css';


export default class Register extends PureComponent {
    state = {
        nick: '',
        pwd: '',
        loading: false,
        whichEmpty: '',
        warningMsg: '',
        account: ''
    }

    nickChange = (e: any) => {
        if(this.state.whichEmpty) {
            this.setState({
                nick: e.target.value,
                whichEmpty: ''
            });
        } else {
            this.setState({
                nick: e.target.value
            });
        }
    }

    pwdChange = (e: any) => {
        if(this.state.whichEmpty) {
            this.setState({
                pwd: e.target.value,
                whichEmpty: ''
            });
        } else {
            this.setState({
                pwd: e.target.value
            });
        }
    }


    submit = () => {
        const { nick, pwd } = this.state;
        const whichLabelShow = (nick && (pwd.length >= 8)) ? 
        '' : (nick ? 'pwd' : 'nick');
        this.setState({
            whichEmpty: whichLabelShow
        });
        if(!whichLabelShow) {
            this.setState({
                loading: true
            });
            window.electron.ipcRenderer.send('register', nick, pwd);
        }
        // setTimeout(() => {
        //     this.setState({loading: false});
        // }, 3000);
    }

    returnLogin = () => {
        window.electron.ipcRenderer.send('go-to-login-page');
    }

    componentDidMount() {
        window.electron.ipcRenderer.on('server-register-return', (event: any, result: any) => {
            if(result === 'error') {
                this.setState({
                    loading: false,
                    pwd: '',
                    warningMsg: '注册失败，请重新注册!'
                });
            } else {
                this.setState({
                    loading: false,
                    nick: '',
                    pwd: '',
                    account: result
                });
            }
        });
        window.electron.ipcRenderer.on('tcp-network-error', (event: any, msg: string) => {
            const { loading } = this.state;
            const warn = loading ? msg : '';
            this.setState({
                loading: false,
                warningMsg: warn
            });
        });
    }

    componentWillUnmount() {
        window.electron.ipcRenderer.removeAllListeners('server-register-return');
        window.electron.ipcRenderer.removeAllListeners('tcp-network-error');
    }
    
    
    render() {
        const { registerBkImage } =window.electron.localImage;
        const { loading, whichEmpty, nick, pwd, warningMsg, account } = this.state;
        return (
            <div 
                className='registerWrap'
                style={ {backgroundImage: `url(${registerBkImage})`}}
            >
                <Bar />
                <div className='displayWrap'>
                    {
                        account ? <div className='accountRegisterWrap'>
                            <p className='accountRegisterWrapP'>你的账号为: <span>{account}</span></p>
                            <div className='toLogin' onClick={this.returnLogin}>返回登录</div>
                        </div> : (!loading ? (
                            <div className='infoWrap'>
                                <div className='Inputs'>
                                    <Input 
                                        mold='input'
                                        placeholder='昵称'
                                        required={true}
                                        showLabel={whichEmpty === 'nick'}
                                        label='昵称不能为空'
                                        callback={this.nickChange}
                                        value={nick}
                                    />
                                    <Input 
                                        mold='input'
                                        placeholder='密码'
                                        type='password'
                                        required={true}
                                        showLabel={whichEmpty === 'pwd'}
                                        label='密码不能低于8位数'
                                        callback={this.pwdChange}
                                        value={pwd}
                                    />
                                </div>
                                <div className='commitBtn' onClick={this.submit}>
                                    <span>立即注册</span>
                                </div>
                                <span className='fixSpan' onClick={this.returnLogin}>返回登录</span>
                            </div>
                        ) : <Loader />)
                    }
                </div>
                {warningMsg ? <Warning msg={warningMsg} /> : null}
            </div>
        )
    }
}