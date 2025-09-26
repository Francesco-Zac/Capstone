import { useEffect, useState } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load(page = 0, size = 12) {
    setLoading(true);
    try {
      const res = await API.get("/videos", { params: { page, size } });
      setVideos(res.data.content || []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function search(e) {
    e.preventDefault();
    if (!q) {
      load();
      return;
    }
    setLoading(true);
    try {
      const res = await API.get("/videos/search", { params: { q, page: 0, size: 12 } });
      setVideos(res.data.content || []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  function getAvatar(username) {
    return (username || "A")[0].toUpperCase();
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-start align-items-center mb-3">
        <form className="d-flex searchForm" onSubmit={search}>
          <input className="form-control me-2 search" placeholder="Cerca" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline-primary">Cerca</button>
        </form>
      </div>
      {loading && <div>Caricamento...</div>}
      <div className="row cards-row">
        {videos.map((v) => (
          <div className="col-6 col-md-4 col-lg-3 mb-3 cardVideo" key={v.id}>
            <div className="card">
              <video controls preload="metadata" src={`http://localhost:8080/api/videos/${v.id}/stream`} />
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <Link to={`/users/${v.ownerUsername}`} className="me-2" style={{ textDecoration: "none" }}>
                    <div
                      className="rounded-circle d-flex justify-content-center align-items-center"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "#888",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      {getAvatar(v.ownerUsername)}
                    </div>
                  </Link>
                  <div className="flex-grow-1">
                    <h5 className="card-title text-truncate mb-0">{v.title}</h5>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      <Link to={`/users/${v.ownerUsername}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {v.ownerUsername || "Anonimo"}
                      </Link>
                    </div>
                  </div>
                </div>
                <p className="card-text text-truncate-2">{v.description}</p>
                <div className="d-flex justify-content-between">
                  <Link className="btn btn-primary" to={`/videos/${v.id}`}>
                    Apri
                  </Link>
                  <small className="text-muted align-self-center">{v.views || 0} views</small>
                </div>
              </div>
            </div>
          </div>
        ))}
        {videos.length === 0 && !loading && <div className="col-12">Nessun video</div>}
      </div>
    </div>
  );
}
