import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import './App.css';
import Login from './login/login';
import NotFound from './NotFound';
import Registration from './registration/registration';
import AdminComponent from './admin/AdminComponent';
import User from './user/User';
import Quiz from './user/Quiz';
import { useState } from 'react';
import NavBar from './navbar/Navbar';

function App() {
  return (
    <Router>
      <div className='App'>
        
        <div className='content'>
          <Switch>
            <Route exact path='/'>
              <Login />
            </Route>
            <Route path='/registration'>
              <Registration />
            </Route>
            <ProtectedRoute path='/admin'>
              <NavBar />
              <AdminComponent />
            </ProtectedRoute>
            <ProtectedRoute path='/user'>
            <NavBar />
              <User />
            </ProtectedRoute>
            <ProtectedRoute path='/quiz/:testId'>
            <NavBar />
              <Quiz />
            </ProtectedRoute>
            <Route path='*'>
              <NotFound />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}

function ProtectedRoute({ children, ...rest }: any) {
  // eslint-disable-next-line
  const [isAuthenticated, _setIsAuthenticated] = useState(
    localStorage.getItem('loggedIn') === 'true'
  );

  return (
    <Route
      {...rest}
      render={({ location }) =>
        isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/',
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}

export default App;
