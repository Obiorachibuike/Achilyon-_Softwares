// Signup.js
import React, { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Container,
  MenuItem,
  Paper,
  Link,
  Alert,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import axios from 'axios';

const Signup = () => {
  const [errorMessage, setErrorMessage] = useState(''); // State for error messages

  // Validation function
  const validate = (values) => {
    const errors = {};
    if (!values.username) {
      errors.username = 'Username is required';
    }
    if (!values.password) {
      errors.password = 'Password is required';
    }
    if (!values.email) {
      errors.email = 'Email is required';
    }
    if (!values.name) {
      errors.name = 'Name is required';
    }
    if (!values.phone_number) {
      errors.phone_number = 'Phone number is required';
    }
    return errors;
  };

  const handleSubmit = async (values) => {
    const role = values.role === 'Customer' ? 'CUSTOMER' : 'RESTAURANT';
    setErrorMessage(''); // Reset error message before new submission
    try {
      const response = await axios.post('https://test-api.achilyon.in/v1/rest-auth/register', {
        ...values,
        role,
      });
      console.log("sent");
      console.log(response.data);
      // Redirect or display success message after successful signup
    } catch (error) {
      if (error.response) {
        // Handle server response errors (like validation errors)
        setErrorMessage(error.response.data.detail || 'An error occurred during signup.');
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
          Signup
        </Typography>
        {errorMessage && ( // Show error message if exists
          <Alert severity="error" style={{ marginBottom: '16px' }}>
            {errorMessage}
          </Alert>
        )}
        <Formik
          initialValues={{ username: '', password: '', email: '', name: '', phone_number: '', role: 'Customer' }}
          validate={validate} // Use the validation function
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => ( // Destructure errors and touched
            <Form>
              <Field name="username">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Username"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    error={touched.username && Boolean(errors.username)} // Show error if touched and error exists
                    helperText={touched.username && errors.username} // Display error message
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
                    error={touched.password && Boolean(errors.password)} // Show error if touched and error exists
                    helperText={touched.password && errors.password} // Display error message
                  />
                )}
              </Field>
              <Field name="email">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    error={touched.email && Boolean(errors.email)} // Show error if touched and error exists
                    helperText={touched.email && errors.email} // Display error message
                  />
                )}
              </Field>
              <Field name="name">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    error={touched.name && Boolean(errors.name)} // Show error if touched and error exists
                    helperText={touched.name && errors.name} // Display error message
                  />
                )}
              </Field>
              <Field name="phone_number">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    error={touched.phone_number && Boolean(errors.phone_number)} // Show error if touched and error exists
                    helperText={touched.phone_number && errors.phone_number} // Display error message
                  />
                )}
              </Field>
              <Field name="role">
                {({ field }) => (
                  <TextField
                    {...field}
                    label="Role"
                    select
                    variant="outlined"
                    fullWidth
                    margin="normal"
                  >
                    <MenuItem value="Customer">Customer</MenuItem>
                    <MenuItem value="Restaurant">Restaurant</MenuItem>
                  </TextField>
                )}
              </Field>
              <Button type="submit" variant="contained" color="primary" fullWidth style={{ marginTop: '16px' }}>
                Signup
              </Button>
            </Form>
          )}
        </Formik>
        {/* Link to Signin component */}
        <Typography variant="body2" align="center" style={{ marginTop: '16px' }}>
          Already have an account?{' '}
          <Link href="/signin" color="primary">
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Signup;
