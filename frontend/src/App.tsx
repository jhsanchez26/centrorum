import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Messaging from "./pages/Messaging";

import logo from "./assets/img/CentroRUMnoBG.png";

/* --------------------------- HEADER COMPONENT --------------------------- */

function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#1E6F3D", // verde UPRM
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* IZQUIERDA: Logo + CentroRUM + Listings */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            color: "#ffffff",
          }}
        >
          {/* Logo dentro de círculo blanco */}
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              border: "1.5px solid rgba(0,0,0,0.05)",
              boxShadow: "0 3px 7px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logo}
              alt="CentroRUM Logo"
              style={{
                height: 40,
                width: 40,
                objectFit: "contain",
              }}
            />
          </div>

          <span
            style={{
              fontWeight: 650,
              fontSize: "23px",
              letterSpacing: "0.3px",
            }}
          >
            CentroRUM
          </span>
        </Link>

        <Link
          to="/listings"
          style={{
            textDecoration: "none",
            color: "#E8F5EB",
            fontWeight: 600,
            fontSize: "15px",
            padding: "6px 14px",
            borderRadius: 999,
          }}
        >
          Listings
        </Link>
      </div>

      {/* DERECHA: Auth / usuario */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {user ? (
          <>
            <span
              style={{
                color: "#E8F5EB",
                fontSize: "14px",
              }}
            >
              Hi, <strong>{user.display_name}</strong>
            </span>

            <Link
              to="/messaging"
              style={{
                textDecoration: "none",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Messages
            </Link>

            <Link
              to="/profile/me"
              style={{
                textDecoration: "none",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              My Profile
            </Link>

            <button
              onClick={logout}
              style={{
                padding: "8px 18px",
                backgroundColor: "#ffffff",
                color: "#1E6F3D",
                fontWeight: 700,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
                fontSize: "14px",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
                padding: "6px 16px",
                borderRadius: 999,
              }}
            >
              Login
            </Link>

            <Link
              to="/signup"
              style={{
                textDecoration: "none",
                color: "#1E6F3D",
                backgroundColor: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                padding: "8px 18px",
                borderRadius: 999,
                boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------------------------- APP ROUTES ---------------------------- */

function AppContent() {
  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/listings"
            element={
              <ProtectedRoute>
                <Listings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messaging"
            element={
              <ProtectedRoute>
                <Messaging />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

/* ---------------------------- MAIN EXPORT ---------------------------- */

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
