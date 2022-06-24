import React, { useState, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import Base from './ud-tree/components';
import { api } from '../js/common'


const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
  },
});


function SyntaxEditor(props) {
  const [document, setDocument] = useState(props.data)
  useEffect(() => { setDocument(props.data) }, [props.data])
  async function refresh() {
    const newData = await api.getDocument(document.id, "json")
    setDocument(newData)
  }
  return (
    <ThemeProvider theme={theme}>
      <Base data={document} refresh={refresh} />
      <CssBaseline />
    </ThemeProvider>
  );
}

export default SyntaxEditor;
