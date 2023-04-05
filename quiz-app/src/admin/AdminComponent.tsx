import { ChangeEvent, useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import '../index.css';
import ListCategory from '../category/ListCategory';
import { useHistory } from 'react-router-dom';
import Alert from '@mui/material/Alert';

const AdminComponent = () => {
  const [filename, setFilename] = useState('');
  const [file, setFile] = useState<File>();
  const [successUpload, setSuccessUpload] = useState(false);
  var history = useHistory();

  const handleSubmit = (e: any) => {  
    e.preventDefault();
    const uiFormData = new FormData(e.currentTarget);
    const categoryName = uiFormData.get('categoryName')
    // console.log({
    //   categoryName: data.get('categoryName'),
    //   password: data.get('password'),
    // });
    if (!file) {
      return;
    }
    var token = localStorage.getItem('token')
    const myHeaders = new Headers();
    myHeaders.append('separator', 'comma');
    myHeaders.append('content-length', `${file.size}`);
    myHeaders.append('Authorization', 'Bearer '+token)

    const formData = new FormData();
    formData.append('csv', file);

    fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/convert', {
      method: 'POST',
      body: formData,
      headers: myHeaders,
    })
      .then((res) => res.json())
      .then((data) => {
        var jsonData = {
          "categoryName": categoryName,
          "data": data
        }
        console.log(jsonData)
        fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/store-category', {
          method: 'POST',
          body: JSON.stringify(jsonData),
          headers: {'Authorization': 'Bearer '+token}
        }).then((res) => {
          if (res.status === 201) {
            console.log("Data stored")
            fetch('http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/get-categories', { headers: {'Authorization': 'Bearer '+token} })
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
          }
        }).catch((err) => console.log(err))
      })
      .catch((err) => console.log(err));
      setSuccessUpload(true)
      setTimeout(() => {
        setSuccessUpload(false)
      }, 5000);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    const { name } = file;
    setFilename(name);
    if (e.target.files) {
      setFile(file);
    }
  };

  const [data, setData] = useState([{ categoryName: 'None' }])

  function handlePropChange(newValue: {
    categoryName: string;
  }[]) {
    setData(newValue);
  }

  useEffect(() => {
    // setTimeout(() => {
    //     // You can add fetch in this to see loding... message on page
    // },1000)
    var user = localStorage.getItem('user')
    if (user !== 'admin@admin.com'){
      history.push('/user')
    } 

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

    // abort the fetch
    return () => abortCont.abort();
  }, []);

  return (
    <div>
      <Container component='main' maxWidth='sm'>
        <div className='h2-preview'>
          <h2>Admin</h2>
        </div>
        <Box component='form' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='categoryName'
            label='Category Name'
            name='categoryName'
            autoComplete='categoryName'
            autoFocus
          />
          <Button variant='contained' component='label' startIcon={<UploadFileIcon />}>
            Upload File
            <input type='file' accept='.csv' onChange={handleFileUpload} hidden />
          </Button>
          <br />
          <Box>{filename}</Box>
          <Button type='submit' variant='contained' sx={{ mt: 3, mb: 2 }}>
            Submit
          </Button>
          {successUpload && 
      <div>
      <Alert variant="outlined" severity="success" style={{marginTop: '10px'}}>
        Questions uploaded successfully!
      </Alert>
      </div>}
        </Box>

        <hr />
        <div className='h2-preview'>
          <h2>Category List</h2>
        </div>
        <ListCategory categoryList={data} onPropChange={handlePropChange} />
      </Container>
    </div>
  );
};

export default AdminComponent;
