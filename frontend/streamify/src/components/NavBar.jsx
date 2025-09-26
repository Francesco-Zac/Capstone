import { Link, useNavigate } from "react-router-dom";

function getUsernameFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(json);
    return obj.sub || obj.username || null;
  } catch {
    return null;
  }
}

export default function NavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = getUsernameFromToken();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container d-flex">
        <Link className="navbar-brand" to="/">
          <img src="./src/assets/logo.png" className="logoStreamify" />
          streamify
        </Link>

        <div className="ms-auto d-flex gap-2 align-items-center">
          <Link className="btn btn-light" to="/">
            Home
          </Link>
          <Link className="btn btn-light" to="/upload">
            Carica
          </Link>

          {!token && (
            <>
              <Link className="btn btn-outline-light" to="/login">
                Login
              </Link>
              <Link className="btn btn-success" to="/register">
                Register
              </Link>
            </>
          )}

          {token && (
            <div className="d-flex align-items-center gap-2">
              <div className="nav-profile d-flex align-items-center gap-2">
                <a href={`/users/${username}`} className="text-white text-decoration-none d-flex align-items-center gap-2">
                  <div className="avatar-sm">{username ? username[0].toUpperCase() : "U"}</div>
                  <div className="profile-name">{username}</div>{" "}
                </a>
              </div>
              <button className="btn btn-outline-light" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
