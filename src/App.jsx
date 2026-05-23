import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Signup from './component/Signup.jsx';
import Signin from './component/Signin.jsx';
import AllOrders from './component/AllOrders.jsx';
import MainLayout from './component/Layout/MainLayout.jsx';
import CoinsPage from './component/CoinsPage.jsx';
import WalletsPage from './component/WalletsPage.jsx';

const App = () => (
  <Router>
    <Routes>
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/coins" replace />} />
        <Route path="coins" element={<CoinsPage />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="orders" element={<AllOrders />} />
        {/* Placeholder for other routes */}
        <Route path="*" element={<div className="text-2xl font-bold">Not Found</div>} />
      </Route>
    </Routes>
  </Router>
);

export default App;
