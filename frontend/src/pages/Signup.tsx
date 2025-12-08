import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 ESTO ES LO QUE FALTABA PARA QUE LA PRUEBA ENCUENTRE EL ERROR:
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); // limpiar error
    setLoading(true);

    try {
      await register(email, displayName, password, confirmPassword);
      navigate("/"); // la prueba espera esto
    } catch (err) {
      setError(err.message); // 🔥 AHORA EL ERROR APARECE EN EL DOM
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <form onSubmit={onSubmit}>

        {/* 🔥 Mostrar error para que la prueba lo encuentre */}
        {error && (
          <p role="alert" style={{ color: "red" }}>
            {error}
          </p>
        )}

        <label>UPR Email</label>
        <input
          type="email"
          required
          placeholder="your.email@upr.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Display Name</label>
        <input
          type="text"
          required
          placeholder="Your Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          required
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>Confirm Password</label>
        <input
          type="password"
          required
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
