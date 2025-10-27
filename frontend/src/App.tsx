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
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
    }}>
      <Link to="/" style={{ 
        fontWeight: "700", 
        fontSize: "20px", 
        textDecoration: "none", 
        color: "#1a202c" 
      }}>
        CentroRUM
      </Link>
      <Link to="/listings" style={{ 
        textDecoration: "none", 
        color: "#2d3748",
        fontWeight: "500"
      }}>
        Listings
      </Link>
      {user ? (
        <>
          <span style={{ marginLeft: "auto", color: "#4a5568", fontWeight: "500" }}>
            Welcome, {user.display_name}!
          </span>
          <button 
            onClick={logout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#c53030";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#e53e3e";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ 
            marginLeft: "auto", 
            textDecoration: "none", 
            color: "#3182ce",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            Login
          </Link>
          <Link to="/signup" style={{ 
            textDecoration: "none", 
            color: "#3182ce",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            Sign Up
          </Link>
        </>
      )}
    </header>
  );
}

function AppContent() {
  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
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
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
