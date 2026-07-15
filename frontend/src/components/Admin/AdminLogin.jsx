import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem("isAdmin", "true");
        navigate("/admin");
      } else {
        alert("Wrong Password");
      }
    } catch (err) {
      alert("Server Error");
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
       
        <h1>Admin Portal</h1>
        <br />
        <p>VNR CAMPUS NAVIGATOR</p>

        <input
          type="password"
          placeholder="Enter Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="admin-login-input"
        />

        <button
          onClick={handleLogin}
          className="admin-login-button"
        >
          Login
        </button>
      </div>
    </div>
  );
}