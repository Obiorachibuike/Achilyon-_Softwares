// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Signup from './component/Signup.jsx';
import Signin from './component/Signin.jsx';
import AllOrders from './component/AllOrders.jsx';
import Container from '@mui/material/Container';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Custom primary color
    },
    secondary: {
      main: '#ff4081', // Custom secondary color
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h4: {
      fontWeight: 'bold',
    },
    body2: {
      color: '#555',
    },
  },
});

const App = () => (
  <ThemeProvider theme={theme}>
    <Router>
      <Container maxWidth="lg">
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/orders" element={<AllOrders />} />
        </Routes>
      </Container>
    </Router>
  </ThemeProvider>
);

export default App;
