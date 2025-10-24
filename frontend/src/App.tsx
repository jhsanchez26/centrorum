import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function Header() {
  const { user, logout } = useAuth();

  return (
    <header style={{
      padding: 12, 
      display: "flex", 
      gap: 12, 
      alignItems: "center",
      backgroundColor: "#f8f9fa",
      borderBottom: "1px solid #dee2e6"
    }}>
      <Link to="/" style={{ fontWeight: "bold", fontSize: "18px", textDecoration: "none", color: "#333" }}>
        CentroRUM
      </Link>
      <Link to="/listings" style={{ textDecoration: "none", color: "#333" }}>
        Listings
      </Link>
      {user ? (
        <>
          <span style={{ marginLeft: "auto", color: "#666" }}>
            Welcome, {user.display_name}!
          </span>
          <button 
            onClick={logout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ marginLeft: "auto", textDecoration: "none", color: "#333" }}>
            Login
          </Link>
          <Link to="/signup" style={{ textDecoration: "none", color: "#333" }}>
            Sign Up
          </Link>
        </>
      )}
    </header>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/listings" element={
          <ProtectedRoute>
            <Listings/>
          </ProtectedRoute>
        }/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<Signup/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
