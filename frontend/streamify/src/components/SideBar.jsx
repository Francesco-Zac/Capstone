import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) => "text-white text-decoration-none d-block py-2 px-2" + (isActive ? " fw-bold" : "");

  return (
    <div className="layout">
      <button className="btn btn-dark d-md-none m-2 mt-5 apriBtn" aria-expanded={open} aria-label="Apri menu" onClick={() => setOpen((s) => !s)}>
        ☰
      </button>

      <div className={`sidebar bg-dark text-white p-3 ${open ? "open" : ""}`} role="navigation">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button className="btn btn-sm btn-outline-light d-md-none mt-5 chiudiBtn" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        <ul className="nav flex-column gap-2">
          <li>
            <NavLink to="/" className={linkClass} onClick={() => setOpen(false)}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/subscriptions" className={linkClass} onClick={() => setOpen(false)}>
              Subscriptions
            </NavLink>
          </li>
          <li>
            <NavLink to="/liked" className={linkClass} onClick={() => setOpen(false)}>
              Liked Videos
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}
