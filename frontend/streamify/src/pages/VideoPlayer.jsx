import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";

async function generateThumbnailFromVideo(url, seekTo = 1.0, width = 320) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = url;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try {
        video.pause();
        video.removeAttribute("src");
        video.load?.();
      } catch (e) {}
      video.remove();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Errore caricamento video per thumbnail"));
    };
    const onLoadedMetadata = () => {
      const t = Math.min(seekTo, Math.max(0, video.duration - 0.1));
      try {
        video.currentTime = t;
      } catch (e) {
        video.currentTime = 0;
      }
    };
    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const vw = video.videoWidth || width;
        const vh = video.videoHeight || Math.floor((9 / 16) * vw);
        const ratio = vh / vw || 9 / 16;
        const w = width;
        const h = Math.max(1, Math.floor(w * ratio));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout generazione thumbnail"));
    }, 8000);
    video.addEventListener(
      "loadedmetadata",
      () => {
        clearTimeout(timeout);
        onLoadedMetadata();
      },
      { once: true }
    );
    video.addEventListener(
      "seeked",
      () => {
        onSeeked();
      },
      { once: true }
    );
    video.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        onError();
      },
      { once: true }
    );
    try {
      video.load();
    } catch (e) {}
  });
}

function readCurrentUser() {
  try {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return {
      username: payload.sub || payload.username || null,
      roles: payload.roles || [],
    };
  } catch {
    return null;
  }
}

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [likesInfo, setLikesInfo] = useState({ likes: 0, liked: false });
  const [comments, setComments] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [channelSubs, setChannelSubs] = useState({ count: 0, subscribed: false });
  const [subLoading, setSubLoading] = useState(false);
  const [hoverUnsub, setHoverUnsub] = useState(false);
  const currentUser = readCurrentUser();

  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    API.get(`/videos/${id}`)
      .then((r) => setVideo(r.data))
      .catch(() => setVideo(null));
    API.get(`/videos/${id}/likes`)
      .then((r) => setLikesInfo(r.data))
      .catch(() => {});
    API.get(`/videos/${id}/comments?page=0&size=50`)
      .then((r) => {
        const items = r.data?.content ?? r.data ?? [];
        setComments(items);
      })
      .catch(() => setComments([]));
    API.get(`/videos?page=0&size=6`)
      .then((r) => {
        const items = r.data?.content ?? r.data ?? [];
        const filtered = items.filter((v) => String(v.id) !== String(id)).slice(0, 5);
        setRelated(filtered);
      })
      .catch(() => setRelated([]));
  }, [id]);

  useEffect(() => {
    let mounted = true;
    async function prepareThumbs() {
      if (!related || related.length === 0) return;
      for (const r of related) {
        if (!mounted) return;
        if (r.thumbnailUrl) {
          setThumbs((s) => ({ ...s, [r.id]: r.thumbnailUrl }));
          continue;
        }
        const key = `thumb-${r.id}`;
        const cached = sessionStorage.getItem(key);
        if (cached) {
          setThumbs((s) => ({ ...s, [r.id]: cached }));
          continue;
        }
        const streamUrl = `http://localhost:8080/api/videos/${r.id}/stream`;
        try {
          const dataUrl = await generateThumbnailFromVideo(streamUrl, 1.0, 320);
          if (!mounted) return;
          setThumbs((s) => ({ ...s, [r.id]: dataUrl }));
          try {
            sessionStorage.setItem(key, dataUrl);
          } catch (e) {}
        } catch (e) {
          if (mounted) setThumbs((s) => ({ ...s, [r.id]: null }));
        }
      }
    }
    prepareThumbs();
    return () => {
      mounted = false;
    };
  }, [related]);

  useEffect(() => {
    if (!video || !video.ownerUsername) return;
    API.get(`/channels/${video.ownerUsername}/subscribe`)
      .then((r) => setChannelSubs(r.data || { count: 0, subscribed: false }))
      .catch(() => setChannelSubs({ count: 0, subscribed: false }));
  }, [video]);

  const toggleLike = async () => {
    if (!currentUser) {
      alert("Devi essere loggato");
      return;
    }
    try {
      if (likesInfo.liked) {
        const r = await API.delete(`/videos/${id}/likes`);
        setLikesInfo(r.data);
      } else {
        const r = await API.post(`/videos/${id}/likes`);
        setLikesInfo(r.data);
      }
    } catch {
      alert("Errore");
    }
  };

  const deleteVideo = async () => {
    if (!currentUser || (video.ownerUsername !== currentUser.username && !currentUser.roles.includes("ADMIN"))) {
      alert("Permesso negato");
      return;
    }
    if (!window.confirm("Eliminare il video?")) return;
    try {
      await API.delete(`/videos/${id}`);
      navigate("/");
    } catch (e) {
      alert("Errore durante l'eliminazione");
    }
  };

  const editVideo = async () => {
    if (!currentUser || (video.ownerUsername !== currentUser.username && !currentUser.roles.includes("ADMIN"))) {
      alert("Permesso negato");
      return;
    }
    const t = prompt("Nuovo titolo:", video.title);
    if (t === null) return;
    const d = prompt("Nuova descrizione:", video.description || "");
    if (d === null) return;
    try {
      const r = await API.put(`/videos/${id}`, { title: t, description: d });
      setVideo(r.data);
    } catch (e) {
      alert("Errore durante la modifica");
    }
  };

  const toggleSubscribe = async () => {
    if (!currentUser) {
      if (window.confirm("Devi essere loggato per iscriverti. Vuoi andare al login?")) {
        navigate("/login");
      }
      return;
    }
    if (!video || !video.ownerUsername) return;
    if (subLoading) return;
    setSubLoading(true);
    try {
      if (channelSubs.subscribed) {
        const r = await API.delete(`/channels/${video.ownerUsername}/subscribe`);
        setChannelSubs(r.data);
      } else {
        const r = await API.post(`/channels/${video.ownerUsername}/subscribe`);
        setChannelSubs(r.data);
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Errore";
      alert(msg);
    } finally {
      setSubLoading(false);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (window.confirm("Devi essere loggato per commentare. Vuoi andare al login?")) {
        navigate("/login");
      }
      return;
    }
    const text = (newComment || "").trim();
    if (!text) return alert("Inserisci un commento");
    setPostingComment(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await API.post(`/videos/${id}/comments`, { text }, { headers });
      const created = res.data ?? null;
      if (created && created.id) {
        setComments((prev) => [created, ...prev]);
      } else {
        const r = await API.get(`/videos/${id}/comments?page=0&size=50`);
        setComments(r.data?.content ?? r.data ?? []);
      }
      setNewComment("");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Errore invio commento";
      alert(msg);
    } finally {
      setPostingComment(false);
    }
  };

  if (!video) return <div className="container mt-4">Caricamento...</div>;

  const subscribeButtonStyle = {
    transition: "all 220ms ease",
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: subLoading ? "not-allowed" : "pointer",
    fontWeight: 700,
  };

  const subscribedStyle = {
    ...subscribeButtonStyle,
    backgroundColor: hoverUnsub ? "#c82333" : "#6c757d",
    color: "#fff",
  };

  const unsubscribedStyle = {
    ...subscribeButtonStyle,
    backgroundColor: "#dc3545",
    color: "#fff",
  };

  return (
    <div className="container grid-main centrale">
      <div>
        <div className="player-card">
          <div className="video-player">
            <video controls src={`http://localhost:8080/api/videos/${id}/stream`} style={{ width: "100%", borderRadius: 8 }} />
          </div>

          <div className="player-meta">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h2 className="title">{video.title}</h2>
                {video.description && (
                  <p
                    className="description"
                    style={{
                      margin: "8px 0",
                      color: "#666",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    {video.description}
                  </p>
                )}
                <div className="meta-row">
                  <div>
                    {video.views ?? 0} views • {new Date(video.createdAt || "").toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link to={`/users/${video.ownerUsername}`} style={{ textDecoration: "none" }}>
                  <div style={{ textAlign: "center" }}>
                    <div className="uploader-avatar">{(video.ownerUsername || "A")[0].toUpperCase()}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {video.ownerUsername || "Anonimo"}
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="meta-row" style={{ marginTop: 8 }}>
              <div className="actions">
                <button className="btn btn-primary" onClick={toggleLike}>
                  {likesInfo.liked ? "Unlike" : "Like"} ({likesInfo.likes})
                </button>
                {(video.ownerUsername === currentUser?.username || currentUser?.roles.includes("ADMIN")) && (
                  <>
                    <button className="btn" onClick={editVideo}>
                      Modifica
                    </button>
                    <button className="btn btn-danger" onClick={deleteVideo}>
                      Elimina
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="channel" style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
              <div className="avatar">{(video.ownerUsername || "A")[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{video.ownerUsername || "Anonimo"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {channelSubs.count} iscritti
                  </div>
                </div>
                <div className="channel-sub muted">Canale</div>
              </div>

              <div>
                {video.ownerUsername === currentUser?.username ? (
                  <button className="btn btn-outline-secondary" onClick={() => navigate("/profile")}>
                    Il mio canale
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={channelSubs.subscribed ? subscribedStyle : unsubscribedStyle}
                    onMouseEnter={() => channelSubs.subscribed && setHoverUnsub(true)}
                    onMouseLeave={() => channelSubs.subscribed && setHoverUnsub(false)}
                    onClick={toggleSubscribe}
                    disabled={subLoading}
                  >
                    {subLoading ? "..." : channelSubs.subscribed ? (hoverUnsub ? "Disiscriviti" : "Iscritto") : "Iscriviti"}
                  </button>
                )}
              </div>
            </div>

            <div className="comments" style={{ marginTop: 14 }}>
              <h4>Commenti</h4>

              <form onSubmit={postComment} style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <textarea
                  className="form-control"
                  placeholder={currentUser ? "Scrivi un commento..." : "Devi essere loggato per commentare"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  disabled={!currentUser || postingComment}
                  style={{ resize: "vertical", flex: 1 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={!currentUser || postingComment}>
                    {postingComment ? "..." : "Invia"}
                  </button>
                  {!currentUser && (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/login")} style={{ whiteSpace: "nowrap" }}>
                      Login
                    </button>
                  )}
                </div>
              </form>

              {comments.length === 0 && <div className="muted">Nessun commento</div>}
              {comments.map((c) => (
                <div className="comment" key={c.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{c.authorUsername || "Anonimo"}</div>
                  <div style={{ marginLeft: 10 }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="side-card">
        <h5>Video correlati</h5>
        <div className="reco-grid">
          {related.map((r) => (
            <div
              key={r.id}
              className="reco card"
              onClick={() => navigate(`/videos/${r.id}`)}
              style={{ cursor: "pointer", display: "flex", gap: 12, padding: 10, alignItems: "center" }}
            >
              <div
                className="reco-thumb"
                style={{
                  width: 160,
                  height: 90,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#000",
                }}
              >
                <img
                  src={
                    thumbs[r.id] ||
                    r.thumbnailUrl ||
                    "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
                  }
                  alt={r.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>

              <div className="reco-info" style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link to={`/users/${r.ownerUsername}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
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
                      {(r.ownerUsername || "A")[0].toUpperCase()}
                    </div>
                  </Link>
                  <div style={{ flex: 1 }}>
                    <div className="reco-title title-xs text-truncate-2">{r.title}</div>
                    <div className="reco-meta muted" style={{ fontSize: 13 }}>
                      {r.ownerUsername || "Anonimo"} • {r.views ?? 0} views
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
