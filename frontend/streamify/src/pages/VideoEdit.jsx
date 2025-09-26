import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

export default function VideoEdit() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get(`/videos/${id}`);
        const v = res.data;
        setTitle(v.title || "");
        setDescription(v.description || "");
      } catch (e) {
        setError("Impossibile caricare il video");
      }
    })();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await API.put(`/videos/${id}`, { title, description }, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      navigate(`/videos/${id}`);
    } catch (e) {
      setError(e?.response?.data?.error || "Errore durante la modifica");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h4 className="mb-3">Modifica video</h4>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="form-control mb-2" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="form-control mb-2" placeholder="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={loading}>
                Salva
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
