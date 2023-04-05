import { IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import '../index.css';

type Category = {
  categoryName: string;
};

type Props = {
  categoryList: Category[];
  onPropChange: (newValue: Category[]) => void;
};

// TODO: Fetch API to be called
const ListCategory = ({categoryList, onPropChange}: Props ) => {
  // let props: Props = {
  //   categoryList: [{ categoryName: 'abc' }, { categoryName: 'dcs' }],
  // };
  var token = localStorage.getItem('token')
  const handleDelete = async (category: Category) => {
    try {
      const response = await fetch(
        `http://scpcsvtojson-env-1.eba-nxqvedsm.us-east-1.elasticbeanstalk.com/api/delete-category/${category.categoryName}`
        ,{
          method: 'DELETE',
          headers: {'Authorization': 'Bearer '+token}
        }
      );
      console.log(response);
      if (response.ok) {
        const updatedCategoryList = categoryList.filter(
          (c: Category) => c.categoryName !== category.categoryName
        );
        onPropChange(updatedCategoryList);
      }
      // TODO: update the category list after successful deletion
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className='category-list'>
      {categoryList && categoryList.map((category, index) => (
        <div className='category-preview' key={index}>
          <div>
            <h2>{category.categoryName}</h2>
          </div>
          <div className='right'>
            <IconButton aria-label='delete' size='large'>
              <DeleteIcon onClick={() => handleDelete(category)}/>
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListCategory;
