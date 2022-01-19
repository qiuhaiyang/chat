import { PureComponent } from 'react';
import './index.css';
import { Input, Bar, Warning } from '../../components/index';

export default class Login extends PureComponent {
    state = {
        account: '',
        pwd: '',
        whichEmpty: '',
        loading: false,
        warningMsg: ''
    }

    accountInputChange = (e: any) => {
        const { whichEmpty } = this.state;
        if(whichEmpty) {
            this.setState({
                whichEmpty: '',
                account: e.target.value
            });
        } else {
            this.setState({
                account: e.target.value
            });
        }
    }
    pwdInputChange = (e: any) => {
        const { whichEmpty } = this.state;
        if(whichEmpty) {
            this.setState({
                whichEmpty: '',
                pwd: e.target.value
            });
        } else {
            this.setState({
                pwd: e.target.value
            });
        }
    }

    login = () => {
        const { account, pwd} = this.state;
        const isEmpty = (account && pwd) ? '' : (account ? 'pwd' : 'account');
        this.setState({
            whichEmpty: isEmpty
        });
        if(!isEmpty) {
            this.setState({
                loading: true,
                warningMsg: ''
            });
            window.electron.ipcRenderer.send('login', account, pwd);
        }
    }

    cancelLogin = () => {
        this.setState({
            loading: false,
            pwd: ''
        });
        window.electron.ipcRenderer.send('cancelLogin');
    }
    componentDidMount() {
        // 登录失败， 返回失败结果
        // 登录成功之后直接在ipc进行窗口切换
        window.electron.ipcRenderer.on('login-failure', (event: any, msg: string) => {
            // 在此设置登录失败原因
            this.setState({
                loading: false,
                pwd: '',
                warningMsg: msg
            });
        });

        window.electron.ipcRenderer.on('tcp-network-error', (event: any, msg: string) => {
            this.setState({
                loading: false,
                pwd: '',
                warningMsg: msg
            });
        });
    }
    componentWillUnmount() {
        window.electron.ipcRenderer.removeAllListeners('login-failure');
        window.electron.ipcRenderer.removeAllListeners('tcp-network-error');
    }

    registerAccount = () => {
        window.electron.ipcRenderer.send('go-to-register-page');
    }

    render() {
        const { dafaultAvatar, userIcon, pwdIcon, bkImage } = window.electron.localImage;
        const { account, pwd, whichEmpty, loading, warningMsg } = this.state;
        return (
            <div className='wrap' style={ {backgroundImage: `url(${bkImage})`}}>
                <header className='header-backImg-show'>
                    <Bar />
                </header>
                <div className='info'>
                    <div className='avatar'>
                        <img src={dafaultAvatar} />
                    </div>
                    {
                        !loading ? (
                            <div className='userInputInfo'>
                                <div className='infoInputs'>
                                    <Input 
                                        value={account}
                                        type='text'
                                        mold='common'
                                        icon={userIcon}
                                        callback={this.accountInputChange}
                                        required={true}
                                        placeholder='账号'
                                        showLabel={whichEmpty==='account'}
                                        label={'请你输入账号后在登陆'}
                                    />
                                    <Input 
                                        value={pwd}
                                        type='password'
                                        mold='common'
                                        icon={pwdIcon}
                                        callback={this.pwdInputChange}
                                        required={true}
                                        placeholder='密码'
                                        showLabel={whichEmpty==='pwd'}
                                        label={'请你输入密码后在登陆'}
                                    />
                                </div>
                                <div className='btns'>
                                    <div className='login' onClick={this.login}>登录</div>
                                    <div className='detail'>
                                        <span className='jump' onClick={this.registerAccount}>注册账号</span>
                                        <span className='jump'>忘记密码</span>
                                    </div>
                                </div>
                            </div>
                        ) : 
                        <div className='cancelWrap'>
                            <div className='logining'>
                                <span>登录中...</span>
                            </div>
                            <div className='cancel' onClick={this.cancelLogin}>
                                <span>取消</span>
                            </div>
                        </div>
                    }
                </div>
                { warningMsg ? <Warning msg={warningMsg} /> : null}
            </div>
        )
    }
}
