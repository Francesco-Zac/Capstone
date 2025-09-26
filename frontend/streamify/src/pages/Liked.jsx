import React, { useEffect, useState } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";

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

export default function Liked() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = readUsername();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const candidateEndpoints = ["/likes", `/users/${currentUser}/likes`, `/me/likes`, `/videos/liked`];
        let likedIds = null;
        for (const ep of candidateEndpoints) {
          try {
            const res = await API.get(ep);
            const data = res.data;
            if (!data) continue;
            if (Array.isArray(data)) {
              if (data.length > 0 && typeof data[0] === "number") {
                likedIds = data;
                break;
              }
              if (data.length > 0 && data[0].id) {
                setVideos(data);
                likedIds = null;
                break;
              }
            }
            if (data.videoIds) {
              likedIds = data.videoIds;
              break;
            }
            if (data.videos) {
              setVideos(data.videos);
              likedIds = null;
              break;
            }
          } catch (e) {}
        }
        if (mounted && likedIds && likedIds.length > 0) {
          const res = await API.get("/videos", { params: { page: 0, size: 200 } });
          const items = res.data?.content ?? res.data ?? [];
          const filtered = items.filter((v) => likedIds.includes(v.id));
          setVideos(filtered);
        } else if (mounted && !likedIds && videos.length === 0) {
          const res = await API.get("/videos", { params: { page: 0, size: 50 } });
          setVideos(res.data?.content ?? res.data ?? []);
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
  }, [currentUser]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Liked Videos</h2>
      </div>
      {loading && <div>Caricamento...</div>}
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
