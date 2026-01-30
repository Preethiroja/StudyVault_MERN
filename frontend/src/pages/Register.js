import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", { name, email, password });
      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      setError("User already exists or registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="form-section">
          <form onSubmit={handleRegister}>
            <h1>Register</h1>
            <p className="subtitle">Join us today! Create your account below.</p>

            {error && <div className="auth-error">{error}</div>}

            <div className="input-group">
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">Register</button>

            <p className="auth-link" style={{ marginTop: '20px', textAlign: 'center' }}>
              Already have an account? <Link to="/login" style={{ color: '#0fb9b1', fontWeight: 'bold', textDecoration: 'none' }}>Login</Link>
            </p>
          </form>
        </div>
        <div className="image-section"></div>
      </div>
    </div>
  );
}