import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import { api } from "../api"; 
import GraphVisualization from "../components/GraphVisualization";
import Whiteboard from "../components/Whiteboard";
import ChatBox from "../components/ChatBox";
import FileUploader from "../components/FileUploader";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// Ensure this file exists in the same folder
import "./Dashboard.css";

export default function Dashboard({ token, logout }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);

  /* ================= LOAD USER PROFILE ================= */
  const loadUserProfile = useCallback(async () => {
    if (!token) return;
    try {
      // Points to http://localhost:5000/api/auth/me
      const res = await api.get("/auth/me", {
        headers: { Authorization: token },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  }, [token]);

  /* ================= LOAD NOTES ================= */
  const loadNotes = useCallback(async () => {
  try {
    const res = await api.get("/notes", { headers: { Authorization: token } });
    setNotes(res.data);

    // Dynamic Nodes: Size them based on content length!
    const nodes = res.data.map((n) => ({
      id: n._id,
      name: n.title,
      // Grouping logic: If title has 'Biology', group 1; else group 2
      group: n.title.toLowerCase().includes('bio') ? 1 : 2,
      size: Math.max(5, n.content.length / 20) // Bigger notes = bigger circles
    }));

    // Dynamic Links: This is where you'd implement AI-based linking later
    const links = nodes.map((_, i) => 
      i > 0 ? { source: nodes[i-1].id, target: nodes[i].id } : null
    ).filter(Boolean);

    setGraphData({ nodes, links });
  } catch (err) {
    console.error("Failed to load notes", err);
  }
}, [token]);

  /* ================= LOAD TASKS ================= */
  const loadTasks = useCallback(async () => {
    try {
      const res = await api.get("/tasks", {
        headers: { Authorization: token },
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  /* ================= LOAD LEADERBOARD ================= */
  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await api.get("/leaderboard", {
        headers: { Authorization: token },
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  /* ================= ACTIONS: ADD NOTE & TASK ================= */
  const addNote = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post(
      "/notes",
      { title: e.target.title.value, content: e.target.content.value },
      { headers: { Authorization: token } }
    );
    e.target.reset();
    
    // Initial load
    loadNotes();
    alert("Note saved! AI summary is being generated...");

    // 💡 Wait 3 seconds and refresh again to catch the AI summary
    setTimeout(() => {
      loadNotes();
    }, 3000);

  } catch (err) {
    alert("Failed to save note");
  }
};

  const addTask = async () => {
    if (!taskInput || !taskDate) return;
    try {
      await api.post(
        "/tasks",
        { title: taskInput, description: "", dueDate: taskDate },
        { headers: { Authorization: token } }
      );
      setTaskInput("");
      setTaskDate("");
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadUserProfile();
    loadNotes();
    loadTasks();
    loadLeaderboard();

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, [loadUserProfile, loadNotes, loadTasks, loadLeaderboard]);

  /* ================= NOTIFICATIONS ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((task) => {
        const taskTime = new Date(task.dueDate);
        if (!task.completed && Math.abs(taskTime - now) < 60000) {
          new Notification(`⏰ Task Reminder: ${task.title}`, {
            body: "Your task is due now!",
          });
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  return (
    <div className="container">
      <Navbar onLogout={logout} />

      {/* 👤 USER PROFILE SECTION */}
      {user && (
        <div className="card profile-card">
          <div className="profile-left">
            <div className="avatar">{user.name.charAt(0)}</div>
            <div>
              <h2>Welcome, {user.name} 👋</h2>
              <p className="email">{user.email}</p>
            </div>
          </div>
          <div className="profile-right">
            <div className="profile-box">
              <span>🏆 Points</span>
              <strong>{user.points || 0}</strong>
            </div>
            <div className="profile-box">
  <span>📅 Joined</span>
  <strong>
    {user.createdAt 
      ? new Date(user.createdAt).toDateString() 
      : "Loading..."}
  </strong>
</div>
          </div>
        </div>
      )}

      {/* 📑 TAB NAVIGATION */}
      <div className="tabs">
        {[
          { id: "notes", label: "NOTES", icon: "📝" },
          { id: "graph", label: "GRAPH", icon: "🕸️" },
          { id: "whiteboard", label: "WHITEBOARD", icon: "🎨" },
          { id: "chat", label: "CHAT", icon: "💬" },
          { id: "calendar", label: "CALENDAR", icon: "📅" },
          { id: "leaderboard", label: "LEADERBOARD", icon: "🏆" },
          { id: "files", label: "FILES", icon: "📁" },
        ].map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {/* 🚀 TAB CONTENT AREA */}
      <div className="tab-content">
        {activeTab === "notes" && (
          <div className="animate-in">
            <div className="card">
              <form onSubmit={addNote}>
                <h3>Create New Note</h3>
                <input name="title" placeholder="Note Title" required />
                <textarea name="content" rows="4" placeholder="Paste content here..." required />
                <button type="submit">Save & Analyze</button>
              </form>
            </div>
            
<div className="notes-grid">
  {notes.map((n) => (
    <div className="card note-card" key={n._id}>
      <div className="note-header">
        <h3>{n.title}</h3>
        {n.summary === "Processing..." && (
           <span className="loader-mini" onClick={loadNotes}>🔄 Updating...</span>
        )}
      </div>
      
      <div className="summary-section">
        <p><b>✨ AI Summary:</b></p>
        <p className={n.summary === "Processing..." ? "pulse-text" : ""}>
          {n.summary || "Generating summary..."}
        </p>
      </div>

      {/* Only render quiz if it's not Pending and actually exists */}
      {n.quiz && n.quiz !== "Pending..." && (
        <div className="quiz-container">
          <p><b>🧠 Concept Quiz:</b></p>
          <pre className="quiz-box">{n.quiz}</pre>
        </div>
      )}
    </div>
  ))}
</div>
          </div>
        )}

        {activeTab === "graph" && (
          <div className="card" style={{ height: "500px" }}>
            <GraphVisualization nodes={graphData.nodes} links={graphData.links} />
          </div>
        )}

        {activeTab === "whiteboard" && (
  <div className="animate-in">
    <div className="card">
       <h3>Collaborative Whiteboard 🎨</h3>
       <p style={{color: '#636e72', fontSize: '14px'}}>Draw your ideas. Changes sync in real-time.</p>
       
       {/* THIS IS THE FIX */}
       <div className="whiteboard-container">
         <Whiteboard />
       </div>
    </div>
  </div>
)}
        {activeTab === "chat" && (
  <ChatBox
    user={user?.name || "Anonymous"}
    context={
      activeTab === "notes"
        ? "Notes Discussion"
        : activeTab === "graph"
        ? "Graph Concepts"
        : activeTab === "whiteboard"
        ? "Whiteboard Session"
        : "General Study"
    }
  />
)}

        {activeTab === "files" && <FileUploader token={token} />}

        {activeTab === "calendar" && (
          <div className="calendar-grid">
            <div className="card">
              <h3>Task Manager</h3>
              <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="New Task" />
              <input type="datetime-local" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
              <button onClick={addTask}>Add Task</button>
              <ul>
                {tasks.map((t) => (
                  <li key={t._id}>
                    <span>{t.title}</span>
                    <small>{new Date(t.dueDate).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card"><Calendar /></div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="card">
            <h3>Leaderboard 🏆</h3>
            <ul className="leaderboard-list">
              {users.map((u, i) => (
                <li key={u._id}>
                  <span>{i + 1}. {u.name}</span>
                  <strong>{u.points} pts</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}