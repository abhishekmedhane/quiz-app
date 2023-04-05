import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useHistory } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import { useState } from 'react';

const Login = () => {
  const history = useHistory();
  const [errMsg, setErrorMsg] = useState('');
  const handleSubmit = (event: any) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // console.log({
    //   email: data.get('email'),
    //   password: data.get('password'),
    // });

    var jsonData = {
      email: data.get('email'),
      password: data.get('password'),
    }

    fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/signin', {
      method: 'POST',
      body: JSON.stringify(jsonData),
      headers: { 'Content-Type': 'application/json' }
    }).then((res) => res.json())
    .then((data) => {
      if (data.hasOwnProperty('error')){
        console.log(data)
        setErrorMsg(data.message)
        setTimeout(() => {
          setErrorMsg('')
        }, 10000);
      }else {

        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('token', data.token)
        delete data.user["password"]
        var user = data.user.email
        localStorage.setItem('user', user)
        if (user === 'admin@admin.com'){
          history.push('/admin')
        } else{

          history.push('/user');
        }
      }
    }).catch((err: any) => console.log(err));
  };

  // let data: {categoryName: string}[] = [{categoryName: "asd"},{categoryName: "asd"},{categoryName: "asd"}];
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
          Sign in
        </Typography>
        <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='email'
            label='Email Address'
            name='email'
            autoComplete='email'
            autoFocus
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password'
            type='password'
            id='password'
            autoComplete='current-password'
          />
          <Button type='submit' fullWidth variant='contained' sx={{ mt: 3, mb: 2 }}>
            Sign In
          </Button>
          <Grid container>
            <Grid item>
              <Link href='/registration' variant='body2'>
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      {errMsg && 
      <div>
      <Alert variant="outlined" severity="error" style={{marginTop: '10px'}}>
        {errMsg}
      </Alert>
      </div>}
    </Container>
  );
};

export default Login;
