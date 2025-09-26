import React, { useEffect, useState } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";

function readUsername() {
  try {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const p = t.split(".")[1];
    const json = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(json);
    return obj.sub || obj.username || null;
  } catch {
    return null;
  }
}

export default function Subscriptions() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({ found: false, channels: [] });
  const currentUser = readUsername();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const candidateEndpoints = [
          "/subscriptions",
          `/users/${currentUser}/subscriptions`,
          `/users/${currentUser}/subscribed`,
          `/me/subscriptions`,
          `/users/${currentUser}/channels`,
        ];
        let channels = null;
        for (const ep of candidateEndpoints) {
          try {
            const res = await API.get(ep);
            const data = res.data;
            if (!data) continue;
            if (Array.isArray(data)) {
              channels = data.map((item) => (typeof item === "string" ? item : item.username || item.ownerUsername || item.channel));
              break;
            }
            if (data.channels) {
              channels = data.channels.map((c) => (typeof c === "string" ? c : c.username || c.name));
              break;
            }
            if (data.subscriptions) {
              channels = data.subscriptions.map((s) => (typeof s === "string" ? s : s.username || s.targetUsername));
              break;
            }
          } catch (e) {}
        }
        if (mounted && channels && channels.length > 0) {
          setInfo({ found: true, channels });
          const res = await API.get("/videos", { params: { page: 0, size: 200 } });
          const items = res.data?.content ?? res.data ?? [];
          const filtered = items.filter((v) => channels.includes((v.ownerUsername || "").toString()));
          setVideos(filtered);
        } else {
          const res = await API.get("/videos", { params: { page: 0, size: 50 } });
          const items = res.data?.content ?? res.data ?? [];
          setVideos(items);
        }
      } catch (e) {
        setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, navigate]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Subscriptions</h2>
      </div>
      {loading && <div>Caricamento...</div>}
      {!loading && info.found && videos.length === 0 && <div>Non ci sono video dalle tue iscrizioni</div>}
      <div className="row">
        {videos.map((v) => (
          <div className="col-sm-6 col-md-4 mb-3" key={v.id}>
            <div className="card">
              <video controls preload="metadata" src={`http://localhost:8080/api/videos/${v.id}/stream`} />
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <Link to={`/users/${v.ownerUsername}`} className="me-2" style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background: "#888",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {(v.ownerUsername || "A")[0].toUpperCase()}
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
