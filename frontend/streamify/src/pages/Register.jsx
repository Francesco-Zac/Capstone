import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await API.post("/auth/register", { username, email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "registrazione fallita");
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h3 className="mb-3">Registrati</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="form-control mb-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="form-control mb-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" className="form-control mb-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn btn-success w-100">Crea account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
