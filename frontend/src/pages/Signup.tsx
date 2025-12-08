import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import CentroNoBG from "../assets/img/CentroRUMnoBG.png";
import PawIcon from "../assets/img/RUM.png";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !displayName.trim() || !password.trim() || !passwordConfirm.trim()) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await register(email, displayName, password, passwordConfirm);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 24px",
        backgroundColor: "var(--light-bg)",
      }}
    >
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
        {/* LEFT COLUMN */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 22,
          }}
        >
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
                fontSize: 18,
                letterSpacing: "0.18em",
                color: "var(--accent-green)",
                fontWeight: 700,
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              New to CentroRUM?
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
                Create your <br /> CentroRUM account
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
            Join the central hub for university life at UPRM where you can
            connect with academic opportunities, tutoring, organizations, and
            your campus community all in one place.
          </p>

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
            <span style={{ opacity: 0.8 }}> UPR · MAYAGUEZ</span>
            <img src={PawIcon} alt="paw icon" style={{ width: 18, height: 18 }} />
          </div>
        </div>

        {/* RIGHT COLUMN FORM */}
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
                color: "var(--accent-green)",
                fontWeight: 600,
              }}
            >
              Welcome to CentroRUM
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
              Create your account
            </h2>
          </div>

          {/* ERROR BLOCK (TESTS SEARCH FOR THIS) */}
          {error && (
            <div
              role="alert"
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

          {/* EMAIL */}
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
              }}
            />
          </div>

          {/* DISPLAY NAME */}
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
              Display Name
            </label>
            <input
              type="text"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: 11,
                border: "1.5px solid #d1d5db",
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#111827",
              }}
            />
          </div>

          {/* PASSWORD */}
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
              placeholder="Password (min 8 characters)"
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
              }}
            />
          </div>

          {/* CONFIRM PASSWORD — TESTS REQUIRE EXACT PLACEHOLDER */}
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
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm Password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: 11,
                border: "1.5px solid #d1d5db",
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#111827",
              }}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "11px 14px",
              backgroundColor: loading ? "#9ca3af" : "var(--primary-green-bright)",
              color: "white",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 8px 18px rgba(47,125,50,0.28)",
              transition: "all 0.18s ease",
              fontFamily: "Poppins, system-ui, sans-serif",
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          {/* LINK TO LOGIN */}
          <div
            style={{
              textAlign: "center",
              marginTop: 4,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#6b7280" }}>Already have an account? </span>
            <Link
              to="/login"
              style={{
                color: "var(--primary-green)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
