import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import NavBar from "./components/NavBar";
import VideoList from "./pages/VideoList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VideoUpload from "./pages/VideoUpload";
import VideoPlayer from "./pages/VideoPlayer";
import Sidebar from "./components/SideBar";
import Sidebar2 from "./components/SideBar2";
import Profile from "./pages/Profile";
import Subscriptions from "./pages/Subscriptions";
import Liked from "./pages/Liked";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar}></div>}

      <Sidebar2 isOpen={sidebarOpen} onClose={closeSidebar} />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar}></div>}

      <div className="main-content">
        <NavBar onToggleSidebar={toggleSidebar} />
        <Routes>
          <Route path="/" element={<VideoList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/upload" element={<VideoUpload />} />
          <Route path="/videos/:id" element={<VideoPlayer />} />
          <Route path="/users/:username" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/liked" element={<Liked />} />
        </Routes>
      </div>
    </div>
  );
}
