import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// mismos assets que en Signup
import CentroNoBG from "../assets/img/CentroRUMnoBG.png";
import PawIcon from "../assets/img/RUM.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)", // deja espacio para el navbar
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 24px",
        backgroundColor: "var(--light-bg)", // gris presentación
      }}
    >
      {/* Contenedor principal tipo slide */}
      <div
        style={{
          maxWidth: 980,
          width: "100%",
          backgroundColor: "#fcfcf9",
          borderRadius: 28,
          boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.03)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: 40,
          padding: "40px 44px",
        }}
      >
        {/* Columna izquierda – texto tipo presentación */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22,
          }}
        >
          {/* Encabezado + logo + título (match con Signup) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 15,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--accent-green)",
                fontWeight: 700,
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              Welcome to
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <img
                src={CentroNoBG}
                alt="CentroRUM logo"
                style={{
                  width: 60,
                  height: 60,
                  objectFit: "contain",
                }}
              />

              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  fontWeight: 900,
                  fontFamily: "Poppins, system-ui, sans-serif",
                  color: "var(--text-dark)",
                  lineHeight: 1.2,
                }}
              >
                CentroRUM
              </h1>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#4b5563",
              maxWidth: 430,
            }}
          >
            Sign in with your UPR credentials to access university listings,
            tutoring opportunities, events, and campus resources; all in one
            central place.
          </p>

          {/* Badge CIIC + patitas (igual estilo que Signup) */}
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 999,
              backgroundColor: "rgba(47, 125, 50, 0.08)",
              color: "var(--primary-green)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "Poppins, system-ui, sans-serif",
            }}
          >
            <img src={PawIcon} alt="paw icon" style={{ width: 18, height: 18 }} />
            <span>CIIC4151</span>
            <span style={{ opacity: 0.7 }}> UPR · MAYAGUEZ </span>
            <img src={PawIcon} alt="paw icon" style={{ width: 18, height: 18 }} />
          </div>
        </div>

        {/* Columna derecha – card de login */}
        <form
          onSubmit={onSubmit}
          style={{
            padding: 24,
            display: "grid",
            gap: 18,
            backgroundColor: "var(--card-bg)",
            borderRadius: 22,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent-green)",
                fontWeight: 600,
              }}
            >
              Welcome back
            </p>
            <h2
              style={{
                margin: "6px 0 0 0",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "Poppins, system-ui, sans-serif",
                color: "var(--text-dark)",
              }}
            >
              Sign in to your account
            </h2>
          </div>

          {error && (
            <div
              style={{
                padding: 10,
                backgroundColor: "#ffe6e6",
                border: "1px solid #f5b5b5",
                borderRadius: 12,
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                color: "#374151",
                fontSize: 14,
              }}
            >
              UPR Email
            </label>
            <input
              type="email"
              placeholder="your.email@upr.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: 11,
                border: "1.5px solid #d1d5db",
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#111827",
                transition: "all 0.18s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary-green)";
                e.target.style.boxShadow =
                  "0 0 0 3px rgba(47,125,50,0.16)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                color: "#374151",
                fontSize: 14,
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: 11,
                border: "1.5px solid #d1d5db",
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#111827",
                transition: "all 0.18s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary-green)";
                e.target.style.boxShadow =
                  "0 0 0 3px rgba(47,125,50,0.16)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "11px 14px",
              backgroundColor: loading
                ? "#9ca3af"
                : "var(--primary-green-bright)",
              color: "white",
              border: "none",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading
                ? "0 1px 2px rgba(0,0,0,0.08)"
                : "0 8px 18px rgba(47,125,50,0.28)",
              transition: "all 0.18s ease",
              fontFamily: "Poppins, system-ui, sans-serif",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "#256c2d";
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "var(--primary-green-bright)";
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(0)";
              }
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: 4,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#6b7280" }}>
              Don&apos;t have an account?{" "}
            </span>
            <Link
              to="/signup"
              style={{
                color: "var(--primary-green)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
