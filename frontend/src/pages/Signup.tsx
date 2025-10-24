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
      minHeight: "60vh",
      padding: "20px"
    }}>
      <form onSubmit={onSubmit} style={{
        padding: 24,
        display: "grid",
        gap: 16,
        maxWidth: 400,
        width: "100%",
        border: "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "#f9f9f9"
      }}>
        <h2 style={{ textAlign: "center", margin: "0 0 16px 0" }}>Sign Up</h2>
        
        {error && (
          <div style={{
            padding: 12,
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: 4,
            color: "#c33"
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
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
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 16
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
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
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 16
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
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
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 16
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
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
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 16
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ color: "#666" }}>Already have an account? </span>
          <Link to="/login" style={{ color: "#007bff", textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
