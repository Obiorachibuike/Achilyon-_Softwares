// AllOrders.js
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import axios from 'axios';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.post('https://test-api.achilyon.in/v1/orders/all-orders', {
          status: 'PENDING',
          is_cash: true,
        });
        setOrders(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom align="center">
        All Orders
      </Typography>
      <Paper elevation={3} style={{ padding: '20px' }}>
        <Grid container spacing={2}>
          {orders.map((order) => (
            <Grid item xs={12} sm={6} md={4} key={order.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Status: {order.status}</Typography>
                  <Typography variant="body2">Order Version: {order.order_version}</Typography>
                  <Typography variant="body2">Cash Payment: {order.is_cash ? 'Yes' : 'No'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default AllOrders;
