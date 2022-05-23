import React, { useState, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import Base from './ud-tree/components';


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
  useEffect(() => document.title = "UD Tree");
  return (
    <ThemeProvider theme={theme}>
      <Base data={props.data} />
      <CssBaseline />
    </ThemeProvider>
  );
}

export default SyntaxEditor;
