import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useState } from 'react';
import { IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useHistory } from 'react-router-dom';

const Registration = () => {
  const history = useHistory();
  const handleSubmit = (event: any) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    var jsonData = {
      email: data.get('email'),
      password: data.get('password'),
      firstName: data.get('fname'),
      lastName: data.get('lname'),
    } 

    fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/registration', {
      method: 'POST',
      body: JSON.stringify(jsonData),
      headers: { 'Content-Type': 'application/json' }
    }).then(() => {
      // history.go(-1); // to go to pervious page
      history.push('/');
    });
  };

  
  const [passwordType, setPasswordType] = useState("password");
  const [passwordInput, setPasswordInput] = useState("");
  const generatePassword = () => {
    fetch('http://meetingroombooking-env-1.eba-p3jrwpav.us-east-1.elasticbeanstalk.com/scp/create/crypt-password', {
      method: 'GET'
    }).then((res) => {
      if (res.ok) {
        res.json()
      }
      throw Error('could not fetch the data for that resource');
    }).then((data: any) => {
      setPasswordInput(data.data)
    }).catch((err) => {
      console.log(err.message)
    })
  };
    const handlePasswordChange =(evnt: any)=>{
        setPasswordInput(evnt.target.value);
    }
    const togglePassword =()=>{
      if(passwordType==="password")
      {
       setPasswordType("text")
       return;
      }
      setPasswordType("password")
    }

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          boxShadow: 3,
          borderRadius: 2,
          px: 4,
          py: 6,
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component='h1' variant='h5'>
          Registration
        </Typography>
        <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='fname'
            label='First Name'
            name='fname'
            autoComplete='fname'
            autoFocus
          />
          <TextField
            margin='normal'
            required
            fullWidth
            id='lname'
            label='Last Name'
            name='lname'
            autoComplete='lname'
          />
          <TextField
            margin='normal'
            required
            fullWidth
            id='email'
            label='Email Address'
            name='email'
            autoComplete='email'
          />
          <div className='password-eye'>
            <div>
            <TextField
            margin='normal'
            fullWidth
            required
            id='password'
            label='Password'
            name='password'
            autoComplete='password'
            type={passwordType}
            onChange={handlePasswordChange}
            value={passwordInput}
          />
            </div>
          <div style={{alignSelf: 'center'}}>
          <IconButton onClick={togglePassword}>
          { passwordType==="password"? <VisibilityIcon></VisibilityIcon> :<VisibilityOffIcon></VisibilityOffIcon> }
          </IconButton>
          </div>
          <div style={{alignSelf: 'center'}}>
            <Button onClick={generatePassword} fullWidth variant='outlined' sx={{ mt: 3, mb: 2, p: 1}}>
              Generate Password
            </Button>
          </div>
          </div>
          
          <Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2 }}>
            Register
          </Button>
          <Grid container>
            <Grid item>
              <Link href='/' variant='body2'>
                {'Sign In'}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default Registration;
