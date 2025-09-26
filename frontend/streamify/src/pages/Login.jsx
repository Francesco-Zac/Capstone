import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", { username, password });
      const token = res.data.token || res.data.accessToken || res.data.jwt;
      if (!token) {
        setError("token non trovato nella risposta");
        return;
      }
      localStorage.setItem("token", token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "login fallito");
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <h3 className="mb-3">Accedi</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="form-control mb-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" className="form-control mb-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn btn-primary w-100">Accedi</button>
          </form>
        </div>
      </div>
    </div>
  );
}
