import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useHistory } from 'react-router-dom';

export default function NavBar() {
    var history = useHistory();
    const handleLogOut = () => {
        localStorage.clear()
        history.push('/')
    }
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography style={{color: "white"}} variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Quiz App
          </Typography>
          <Button style={{color: "white"}} onClick={handleLogOut}>Log Out</Button>
        </Toolbar>
      </AppBar>
    </div>
  );
}