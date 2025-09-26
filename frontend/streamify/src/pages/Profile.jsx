import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";

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

export default function Profile() {
  const { username: usernameParam } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [subsInfo, setSubsInfo] = useState({ count: 0, subscribed: false });
  const [subLoading, setSubLoading] = useState(false);
  const [hoverUnsub, setHoverUnsub] = useState(false);
  const currentUser = readUsername();
  const viewing = usernameParam || currentUser;

  useEffect(() => {
    setLoadingUser(true);
    API.get(`/users/${viewing}`)
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, [viewing]);

  useEffect(() => {
    setLoadingVideos(true);
    API.get("/videos", { params: { page: 0, size: 50 } })
      .then((r) => {
        const items = r.data?.content ?? r.data ?? [];
        const filtered = items.filter((v) => (v.ownerUsername || "").toLowerCase() === (viewing || "").toLowerCase());
        setVideos(filtered);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoadingVideos(false));
  }, [viewing]);

  useEffect(() => {
    if (!viewing) return;
    API.get(`/channels/${viewing}/subscribe`)
      .then((r) => setSubsInfo(r.data || { count: 0, subscribed: false }))
      .catch(() => setSubsInfo({ count: 0, subscribed: false }));
  }, [viewing]);

  const handleSubscribe = async () => {
    if (!currentUser) {
      if (window.confirm("Devi essere loggato per iscriverti. Vuoi andare al login?")) {
        navigate("/login");
      }
      return;
    }
    if (subLoading) return;
    setSubLoading(true);
    const prev = { ...subsInfo };
    setSubsInfo({ count: subsInfo.count + 1, subscribed: true });
    try {
      const res = await API.post(`/channels/${viewing}/subscribe`);
      setSubsInfo(res.data || { count: 0, subscribed: true });
    } catch (e) {
      setSubsInfo(prev);
      alert(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Errore durante l'iscrizione");
    } finally {
      setSubLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!currentUser) {
      alert("Devi essere loggato");
      return;
    }
    if (subLoading) return;
    setSubLoading(true);
    const prev = { ...subsInfo };
    setSubsInfo({ count: Math.max(0, subsInfo.count - 1), subscribed: false });
    try {
      const res = await API.delete(`/channels/${viewing}/subscribe`);
      setSubsInfo(res.data || { count: 0, subscribed: false });
    } catch (e) {
      setSubsInfo(prev);
      alert(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Errore durante l'operazione");
    } finally {
      setSubLoading(false);
    }
  };

  if (!viewing) return <div className="container mt-4">Utente non specificato</div>;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8">
          <div className="card p-3 mb-4">
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#6366f1,#7dd3fc)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 28,
                }}
              >
                {(viewing || "A")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{viewing}</div>
                  <div className="text-muted" style={{ fontSize: 14 }}>
                    {subsInfo.count} iscritti
                  </div>
                </div>
                <div style={{ marginTop: 8, color: "#6c757d" }}>{loadingUser ? "Caricamento..." : user?.email ? user.email : ""}</div>
              </div>
              <div>
                {viewing === currentUser ? (
                  <button className="btn btn-outline-secondary" onClick={() => navigate("/profile")}>
                    Il mio profilo
                  </button>
                ) : subsInfo.subscribed ? (
                  <button
                    className="btn"
                    style={{ backgroundColor: hoverUnsub ? "#c82333" : "#6c757d", color: "#fff", transition: "all 200ms ease" }}
                    onMouseEnter={() => setHoverUnsub(true)}
                    onMouseLeave={() => setHoverUnsub(false)}
                    onClick={handleUnsubscribe}
                    disabled={subLoading}
                  >
                    {subLoading ? "..." : hoverUnsub ? "Disiscriviti" : "Iscritto"}
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={{ backgroundColor: "#dc3545", color: "#fff", transition: "all 200ms ease" }}
                    onClick={handleSubscribe}
                    disabled={subLoading}
                  >
                    {subLoading ? "..." : "Iscriviti"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card p-3">
            <h5>Video di {viewing}</h5>
            {loadingVideos && <div>Caricamento...</div>}
            <div className="row">
              {videos.map((v) => (
                <div className="col-sm-6 mb-3" key={v.id}>
                  <div className="card">
                    <video controls preload="metadata" src={`http://localhost:8080/api/videos/${v.id}/stream`} style={{ width: "100%" }} />
                    <div className="card-body">
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
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
                        <div style={{ flex: 1 }}>
                          <Link to={`/videos/${v.id}`} style={{ fontWeight: 700, display: "block", color: "#000", textDecoration: "none" }}>
                            {v.title}
                          </Link>
                          <div className="text-muted" style={{ fontSize: 13 }}>
                            {v.views || 0} views
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {videos.length === 0 && !loadingVideos && <div className="col-12">Nessun video</div>}
            </div>
          </div>
        </div>

        <aside className="col-md-4">
          <div className="card p-3 mb-3">
            <div style={{ fontWeight: 700 }}>{viewing}</div>
            <div className="text-muted" style={{ fontSize: 14, marginTop: 6 }}>
              {user?.email || ""}
            </div>
          </div>
          <div className="card p-3">
            <h6>Altro</h6>
            <ul className="list-unstyled">
              <li>
                <Link to="/">Home</Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
