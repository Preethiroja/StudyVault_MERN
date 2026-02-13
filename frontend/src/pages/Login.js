import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";
import { api } from "../api";

export default function Login({ setToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });            
      // Save data
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.user.name);
      
      if (setToken) setToken(res.data.token);
      navigate("/");
    } catch (err) {
      // ✅ Improved error message catching
      const message = err.response?.data?.msg || "Invalid credentials";
      setError(message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="form-section">
          <form onSubmit={handleLogin}>
            <h1>Login</h1>
            <p className="subtitle">Welcome back! Please enter your details.</p>

            {error && <div className="auth-error" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

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

            <button type="submit" className="login-btn">Login</button>

            <p className="auth-link" style={{ marginTop: '20px', textAlign: 'center' }}>
              Don’t have an account? <Link to="/register" style={{ color: '#0fb9b1', fontWeight: 'bold', textDecoration: 'none' }}>Register</Link>
            </p>
          </form>
        </div>
        <div className="image-section"></div>
      </div>
    </div>
  );
}