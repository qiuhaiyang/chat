import { PureComponent } from "react";
import { Bar, User } from "../../components/index";
import './index.css'

export default class Home extends PureComponent {
    state = {
        friends: [],
        myinfo: {},
    }
    componentDidMount() {
        window.electron.ipcRenderer.invoke('get-login-data').then((res) => {
            // console.log(res);
            const myinfo = (res as Array<any>).shift();
            this.setState({
                friends: res,
                myinfo
            });
        });

        window.electron.ipcRenderer.on('resaveMsg', (event: any, account: string) => {
            const { friends } = this.state;
            for(let i = 0;i < friends.length; i++) {
                if((friends[i] as any).account == account) {
                    (friends[i] as any).unReadCount += 1;
                    break;
                }
            }
            this.setState({
                friends: [...friends]
            });
        })
    }

    componentWillUnmount() {
        window.electron.ipcRenderer.removeAllListeners('resaveMsg');
    }

    setUnReadCount = (account: string, clean = false) => {
        const { friends } = this.state;
        const newFriends = friends.map((friend: any) => {
            if(friend.account === account) {
                if(clean) {
                    friend.unReadCount = 0;
                } else {
                    friend.unReadCount ++;
                }
            }
            return friend;
        });

        this.setState({
            friends: newFriends
        });
    }

    render() {
        const { friends, myinfo } = this.state;
        const { nick, avatar, backgroundImage = 'http://localhost:3000/public/avatar/backgroundImage.jpeg' } = myinfo as any;
        const { homeHeaderBK } = window.electron.localImage;
        const setBackgroundImage = backgroundImage || homeHeaderBK;
        return (
            <div className="homeWrap">
                <div className="header" style={ 
                    {backgroundImage: `url(${setBackgroundImage})`
                    }}
                >
                    <div className="accountInfo">
                        <img className="accountAvatar" src={avatar} />
                        <div className="accountNick">
                            <span className="nick">{nick}</span>
                        </div>
                    </div>
                </div>
                {/* {?????????????????????header????????????????????????header???????????????bar?????????bar????????????} */}
                <Bar />
                <div className="friendList"><span>????????????</span></div>
                <div className="userList">
                    {
                        friends.map((user: any) => {
                            return <User {...user} key={user.account} selfnick={nick} setUnReadCount={this.setUnReadCount} />
                        })
                    }
                </div>
            </div>
        )
    }
}