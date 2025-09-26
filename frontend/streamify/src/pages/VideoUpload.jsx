import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function VideoUpload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // gestione selezione file
  function handleFileChange(e) {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setError("");
  }

  // reset del form
  function resetForm() {
    setFile(null);
    setTitle("");
    setDescription("");
    setError("");
    setProgress(0);
  }

  // submit form
  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Seleziona un file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Devi essere loggato per caricare un video");
      return;
    }

    console.log("DEBUG headers:", {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    });

    try {
      setLoading(true);
      setProgress(0);

      const resp = await API.post("/videos", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });

      console.log("upload response", resp.status, resp.data);
      resetForm();
      navigate("/");
    } catch (err) {
      console.error("upload error", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Upload fallito";
      setError(msg);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h3 className="mb-3">Carica nuovo video</h3>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <input type="file" accept="video/*" className="form-control mb-2" onChange={handleFileChange} />

            <input className="form-control mb-2" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />

            <input className="form-control mb-2" placeholder="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />

            {loading && (
              <div className="mb-2">
                <div className="progress">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex gap-2">
              <button className="btn btn-success" disabled={loading}>
                Carica
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                Azzera
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
