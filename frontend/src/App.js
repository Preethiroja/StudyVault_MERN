import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null); // important: update state to re-render
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Dashboard */}
        <Route
          path="/"
          element={token ? <Dashboard token={token} logout={logout} /> : <Navigate to="/login" />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login setToken={setToken} />}
        />

        {/* Register */}
        <Route
          path="/register"
          element={<Register />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
