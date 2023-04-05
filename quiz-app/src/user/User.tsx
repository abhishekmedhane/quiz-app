import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import SelectCategory from '../category/SelectCategory';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const User = () => {
  var history = useHistory();
  const handleSubmit = (e: any) => {
    e.preventDefault();
    const uiFormData = new FormData(e.currentTarget);
    history.push('/quiz/'+uiFormData.get('testList'))
  };

  const [data, setData] = useState([{ categoryName: 'None' }])
  const [quote, setQuote] = useState(null)
  const [author, setAuthor] = useState(null)

  useEffect(() => {
    // setTimeout(() => {
    //     // You can add fetch in this to see loding... message on page
    // },1000)
    var token = localStorage.getItem('token')
    const abortCont = new AbortController();

    fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/get-categories', { signal: abortCont.signal, headers: {'Authorization': 'Bearer '+token} })
      .then((res) => {
        if (!res.ok) {
          // error coming back from server
          throw Error('could not fetch the data for that resource');
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.log('fetch aborted');
        } else {
          // auto cathces network / connection error
          // setIsPending(true);
          // setError(err.message);
          console.log(err.message)
        }
      });
    
      fetch('https://type.fit/api/quotes', { signal: abortCont.signal }).then((res) => {
        if (!res.ok) {
           // error coming back from server
           throw Error('could not fetch the data for that resource');
        }
        return res.json();
      }).then((data) => {
        const rndInt = randomIntFromInterval(0, data.length)
        setQuote(data[rndInt].text)
        setAuthor(data[rndInt].author)
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.log('fetch aborted');
        } else {
          // auto cathces network / connection error
          // setIsPending(true);
          // setError(err.message);
          console.log(err.message)
        }
      });

    // abort the fetch
    return () => abortCont.abort();
  }, []);

  function randomIntFromInterval(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  return (
    <div>
      <Container component='main' maxWidth='sm'>
        <div className='h2-preview'>
          <h2>User</h2>
        </div>
        <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <SelectCategory categoryList={data}/>

          <Card sx={{ minWidth: 275, margin: '10px' }}>
      <CardContent>
      <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
          Quote
        </Typography>
        <Typography variant="body2">
        {quote} - <b>{author}</b>
        </Typography>
      </CardContent>
    </Card>
    {localStorage.getItem('testName') && 
    <Typography variant="body2">
        Test Name - <b>{localStorage.getItem('testName')}</b> <br />
        Score - <b>{localStorage.getItem('score')}</b>
        </Typography>
}
          <Button type='submit' variant='contained' sx={{ mt: 3, mb: 2 }}>
            Start
          </Button>
        </Box>
      </Container>
    </div>
  );
};

export default User;
