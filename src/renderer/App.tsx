import { Switch, Route, HashRouter } from 'react-router-dom';
import './App.css';
import { Register, Login, Home, Chat } from './ts/pages/index';


export default function App() {
  return (
    <HashRouter>
        <Switch>
            <Route path="/" component={Home} exact/>
            <Route path="/register" component={Register} />
            <Route path="/login" component={Login} />
            <Route path="/chat/:account/:nick/:selfnick" component={Chat} />
        </Switch>
    </HashRouter>
  );
}
