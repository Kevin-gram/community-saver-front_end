import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { LanguageProvider } from "./context/LanguageContext";
import LoginForm from "./components/Auth/LoginForm";
import Header from "./components/Layout/Header";
import MemberDashboard from "./components/Member/MemberDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import BranchLeadDashboard from "./components/BranchLead/BranchLeadDashboard";
import AuthCallback from "./components/Auth/AuthCallback";
import ResetPassword from "./components/Auth/ResetPassword";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

const AppContent: React.FC = () => {
  const { state } = useApp();
  const { currentUser } = state;

  return (
    <Router>
      <Header />
      <Routes>
        <Route
          path="/login"
          element={
            !currentUser ? (
              <LoginForm />
            ) : (
              <Navigate to={`/${currentUser.role}`} replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            currentUser && currentUser.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/branch_lead"
          element={
            currentUser && currentUser.role === "branch_lead" ? (
              <BranchLeadDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/member"
          element={
            currentUser && currentUser.role === "member" ? (
              <MemberDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="*"
          element={
            <Navigate
              to={currentUser ? `/${currentUser.role}` : "/login"}
              replace
            />
          }
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AppProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AppProvider>
  );
}

export default App;
