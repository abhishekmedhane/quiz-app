import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { useState } from 'react';

type Category = {
  categoryName: string;
};

type Props = {
  categoryList: Category[];
};

const SelectCategory = ({categoryList}: Props = { categoryList: [] }) => {
  const [testCategory, setTestCategory] = useState('');

  const handleChange = (event: SelectChangeEvent) => {
    setTestCategory(event.target.value);
  };

  return (
    <div>
      <InputLabel id='demo-simple-select-helper-label'>Select Category</InputLabel>
      <Select
        value={testCategory}
        label='testCategory'
        onChange={handleChange}
        name='testList'
      >
       {categoryList.map((category, index) => (
  <MenuItem key={index} value={category.categoryName}>{category.categoryName}</MenuItem>
))}
      </Select>
    </div>
  );
};

export default SelectCategory;
