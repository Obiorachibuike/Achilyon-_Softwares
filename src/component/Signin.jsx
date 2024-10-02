// Signin.js
import React, { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert, // Import Alert for error messages
  Link,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import axios from 'axios';

const Signin = () => {
  const [errorMessage, setErrorMessage] = useState(''); // State for error messages

  const handleSubmit = async (values) => {
    setErrorMessage(''); // Reset error message before new submission
    try {
      const response = await axios.post('https://test-api.achilyon.in/v1/rest-auth/login', values);
      console.log(response.data);
      // Redirect or display success message after successful login
    } catch (error) {
      if (error.response) {
        // Handle server response errors (like incorrect credentials)
        setErrorMessage(error.response.data.detail || 'An error occurred during signin.');
      } else {
        // Handle network or other errors
        setErrorMessage('Network error. Please try again later.');
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} style={{ padding: '20px' }}>
        <Typography variant="h4" gutterBottom align="center">
          Signin
        </Typography>
        {errorMessage && ( // Show error message if exists
          <Alert severity="error" style={{ marginBottom: '16px' }}>
            {errorMessage}
          </Alert>
        )}
        <Formik
          initialValues={{ username: '', password: '' }}
          onSubmit={handleSubmit}
        >
          {() => (
            <Form>
              <Field name="username">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Username"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                  />
                )}
              </Field>
              <Field name="password">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                  />
                )}
              </Field>
              <Button type="submit" variant="contained" color="primary" fullWidth style={{ marginTop: '16px' }}>
                Signin
              </Button>
            </Form>
          )}
        </Formik>
        {/* Link to Signup component */}
        <Typography variant="body2" align="center" style={{ marginTop: '16px' }}>
          Don't have an account?{' '}
          <Link href="/signup" color="primary">
            Sign up
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Signin;
