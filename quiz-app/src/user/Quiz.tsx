import {
  Box,
  Button,
  Container,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';
import '../index.css';
import { useHistory, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Quiz = () => {
  var history = useHistory();
  const { testId }: any = useParams();
  const [data, setData] = useState<QuizQuestion[]>([]);
  const handleEnd = (e: any) => {
    e.preventDefault();
    var count = 0
    const formData = new FormData(e.currentTarget);
    //   const answers: string[] = [];
    // console.log(formData);
    for (const [name, value] of formData.entries()) {
      // console.log(name, value);
      if (name === value){
        count+=1
      }
    }
    console.log("you got "+ count +" out of "+data.length)
    localStorage.setItem('score', count +"/"+ data.length)
    localStorage.setItem('testName', testId)
    history.push('/user')
  };

  type QuizQuestion = {
    Answer: string;
    'Option 1': string;
    'Option 2': string;
    'Option 3': string;
    'Option 4': string;
    Question: string;
    'Sr.no': string;
  };


  useEffect(() => {
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
        const category = data.find((c: any) => c.categoryName === testId);
        
        if (category) {
          setData(category.data)  
        } else {
          throw Error(`Category ${testId} not found.`)
        }
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
      return () => abortCont.abort();
    
  }, [testId])
  
  return (
    <div>
      <Container component='main' maxWidth='sm'>
        <div className='h2-preview'>
          <h2>Quiz</h2>
        </div>
        <Box component='form' onSubmit={handleEnd} noValidate sx={{ mt: 1 }}>
          <div className='category-list'>
            {data.map((quiz, index) => (
              <div className='quiz-preview' key={index}>
                <FormLabel>
                  <h2>
                    {quiz['Sr.no']}. {quiz.Question}
                  </h2>
                </FormLabel>
                <RadioGroup name={quiz.Answer}>
                  <FormControlLabel
                    value={quiz['Option 1']}
                    control={<Radio />}
                    label={quiz['Option 1']}
                  />
                  <FormControlLabel
                    value={quiz['Option 2']}
                    control={<Radio />}
                    label={quiz['Option 2']}
                  />
                  <FormControlLabel
                    value={quiz['Option 3']}
                    control={<Radio />}
                    label={quiz['Option 3']}
                  />
                  <FormControlLabel
                    value={quiz['Option 4']}
                    control={<Radio />}
                    label={quiz['Option 4']}
                  />
                </RadioGroup>
              </div>
            ))}
          </div>
          <Button type='submit' color='error' variant='contained' sx={{ mt: 3, mb: 2 }}>
            End
          </Button>
        </Box>
      </Container>
    </div>
  );
};

export default Quiz;
