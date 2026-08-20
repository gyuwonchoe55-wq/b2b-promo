import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PromotionListPage from './pages/PromotionListPage';
import PromotionDetailPage from './pages/PromotionDetailPage';
import PromotionFormPage from './pages/PromotionFormPage';
import ApplicationStatusPage from './pages/ApplicationStatusPage';

function RequireAuth({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/promotions"
          element={
            <RequireAuth>
              <PromotionListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/promotions/new"
          element={
            <RequireAuth>
              <PromotionFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/promotions/:id/edit"
          element={
            <RequireAuth>
              <PromotionFormPage />
            </RequireAuth>
          }
        />
        <Route
          path="/promotions/:id/applications"
          element={
            <RequireAuth>
              <ApplicationStatusPage />
            </RequireAuth>
          }
        />
        <Route
          path="/promotions/:id"
          element={
            <RequireAuth>
              <PromotionDetailPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/promotions" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
