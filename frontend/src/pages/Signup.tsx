import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
    setError("");
    setLoading(true);

    try {
      await register(email, displayName, password, passwordConfirm);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      width: "100%",
      padding: "20px",
      backgroundColor: "#f7fafc"
    }}>
      <form onSubmit={onSubmit} style={{
        padding: 32,
        display: "grid",
        gap: 20,
        maxWidth: 400,
        width: "100%",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
      }}>
        <h2 style={{ 
          textAlign: "center", 
          margin: "0 0 8px 0",
          color: "#1a202c",
          fontSize: "28px",
          fontWeight: "700"
        }}>
          Sign Up
        </h2>
        
        {error && (
          <div style={{
            padding: 12,
            backgroundColor: "#fed7d7",
            border: "1px solid #feb2b2",
            borderRadius: 8,
            color: "#c53030",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            fontWeight: "600",
            color: "#2d3748",
            fontSize: "14px"
          }}>
            Email (must be @upr.edu)
          </label>
          <input
            type="email"
            placeholder="your.email@upr.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: "#ffffff",
              color: "#2d3748",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              height: "48px",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3182ce";
              e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            fontWeight: "600",
            color: "#2d3748",
            fontSize: "14px"
          }}>
            Display Name
          </label>
          <input
            type="text"
            placeholder="Your Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: "#ffffff",
              color: "#2d3748",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              height: "48px",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3182ce";
              e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            fontWeight: "600",
            color: "#2d3748",
            fontSize: "14px"
          }}>
            Password
          </label>
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: "#ffffff",
              color: "#2d3748",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              height: "48px",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3182ce";
              e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: "block", 
            marginBottom: 8, 
            fontWeight: "600",
            color: "#2d3748",
            fontSize: "14px"
          }}>
            Confirm Password
          </label>
          <input
            type="password"
            placeholder="Confirm Password"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: "#ffffff",
              color: "#2d3748",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              height: "48px",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3182ce";
              e.target.style.boxShadow = "0 0 0 3px rgba(49, 130, 206, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            backgroundColor: loading ? "#a0aec0" : "#3182ce",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "0 1px 2px rgba(0,0,0,0.1)" : "0 2px 4px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
            height: "48px"
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#2c5282";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#3182ce";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ color: "#718096", fontSize: "14px" }}>Already have an account? </span>
          <Link to="/login" style={{ 
            color: "#3182ce", 
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
