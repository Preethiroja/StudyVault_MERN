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
import io from "socket.io-client";
const socket = io("https://studyvault-mern.onrender.com");

export default function Dashboard({ token, logout }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [whiteboardRoom, setWhiteboardRoom] = useState(null);
const [inviteName, setInviteName] = useState("");
const [tutorAnswers, setTutorAnswers] = useState({}); // Stores { noteId: "answer" }
const [loadingTutorId, setLoadingTutorId] = useState(null); // Tracks which note is loading
const [roomId, setRoomId] = useState("public-hall"); 
const [roomCodeInput, setRoomCodeInput] = useState("");

const askTutor = async (noteId, question) => {
  if (!question.trim()) return;
  setLoadingTutorId(noteId); // Start loading for THIS specific note
  try {
    const res = await api.post("/notes/ask-tutor", 
      { noteId, question }, 
      { headers: { Authorization: token } }
    );
    // Save answer using the noteId as the key
    setTutorAnswers(prev => ({ ...prev, [noteId]: res.data.answer }));
  } catch (err) {
    alert("Tutor error");
  } finally {
    setLoadingTutorId(null);
  }
};

  /* ================= LOAD USER PROFILE ================= */
  const loadUserProfile = useCallback(async () => {
    if (!token) return;
    try {
      // Points to http://localhost:5000/api/auth/me
      const res = await api.get("/auth/me", {
        headers: { Authorization: token },
      });
      setUser(res.data);
      socket.emit("join", { user: res.data.name });
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
    await api.post(
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
    const res = await api.post(
      "/tasks",
      { title: taskInput, description: "", dueDate: taskDate },
      { headers: { Authorization: token } }
    );
    
    // 🚩 FIX: Add the new task from the server response directly to your state
    setTasks((prevTasks) => [...prevTasks, res.data]); 
    
    setTaskInput("");
    setTaskDate("");
    alert("Task added successfully!");
  } catch (err) {
    console.error("Failed to add task:", err);
    alert("Error adding task. Check console.");
  }
};

const deleteTask = async (taskId) => {
  if (!window.confirm("Are you sure you want to delete this task?")) return;

  try {
    await api.delete(`/tasks/${taskId}`, {
      headers: { Authorization: token },
    });

    // 🚩 Update the UI state immediately by filtering out the deleted task
    setTasks(tasks.filter((t) => t._id !== taskId));
  } catch (err) {
    console.error("Failed to delete task:", err);
    alert("Could not delete task.");
  }
};
const sendChatInvite = (targetUsername) => {
  if (!targetUsername) return alert("Please enter a username.");
  const newRoomId = roomId; 
  setRoomId(newRoomId);
  socket.emit("join-room", { roomId: newRoomId, user: user.name });
  socket.emit("request-chat-invite", { 
    from: user.name, 
    toUser: targetUsername, 
    roomId: newRoomId 
  });
  
  alert(`Invite sent to ${targetUsername}!`);
  setInviteName("");
};

useEffect(() => {
  if (user) {
    socket.emit("join-room", { roomId: "public-hall", user: user.name });
  }
}, [user]);

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
  if (!user) return;

  socket.on("whiteboard-request-received", ({ from }) => {
    const ok = window.confirm(`${from} wants to draw with you. Accept?`);
    if (ok) {
      socket.emit("accept-whiteboard", { from, to: user.name });
    }
  });

  socket.on("whiteboard-approved", ({ roomId }) => {
    setWhiteboardRoom(roomId);
    setActiveTab("whiteboard");
    alert("Collaboration Started!");
  });

  // NEW: Listen for the end session signal from server
  socket.on("whiteboard-ended", () => {
    setWhiteboardRoom(null);
    alert("The whiteboard session has been ended.");
  });
  return () => {
    socket.off("whiteboard-request-received");
    socket.off("whiteboard-approved");
    socket.off("whiteboard-ended"); // Cleanup
  };
}, [user]);

/* ================= PRIVATE CHAT INVITE LOGIC ================= */
useEffect(() => {
  if (!user || !socket) return;

  const handleChatInvite = ({ from, roomId: targetRoomId }) => {
    const ok = window.confirm(`${from} invited you to a private study room (${targetRoomId}). Join now?`);
    if (ok) {
      setRoomId(targetRoomId);
      socket.emit("join-room", { roomId: targetRoomId, user: user.name });
      setActiveTab("chat");
    }
  };

  socket.on("chat-invite-received", handleChatInvite);

  return () => {
    socket.off("chat-invite-received", handleChatInvite);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);

// NEW: Update the End Session button handler
const handleEndSession = () => {
  if (window.confirm("End this session for everyone?")) {
    socket.emit("end-whiteboard", { roomId: whiteboardRoom });
  }
};
useEffect(() => {
  // 1. Parse the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get("room");

  // 2. If a valid room code is found and the user is logged in
  if (roomFromUrl && roomFromUrl.startsWith("STUDY_") && user) {
    setRoomId(roomFromUrl);
    socket.emit("join-room", { roomId: roomFromUrl, user: user.name });
    setActiveTab("chat");
    window.history.replaceState({}, document.title, window.location.pathname);
    
    console.log(`Auto-joined room: ${roomFromUrl}`);
  }
}, [user]); // Runs as soon as the 'user' profile is loaded

  useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date().getTime(); // Use timestamps for accuracy
    
    tasks.forEach((task) => {
      const taskTime = new Date(task.dueDate).getTime();
      
      // 🚩 FIX: Check if task is due in the NEXT minute or was due in the LAST minute
      // and ensure it hasn't been "notified" yet
      if (!task.completed && Math.abs(taskTime - now) < 60000) {
        new Notification(`⏰ Task Reminder: ${task.title}`, {
          body: "Your task is due now!",
          icon: "/logo192.png" // Adding an icon helps some browsers trigger it
        });
        
        // Optional: Mark as notified locally so it doesn't spam every interval
        task.completed = true; 
      }
    });
  }, 30000); // Check every 30 seconds instead of 60
  
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
<div className="tutor-container">
  <div className="tutor-input-box">
    <input 
      type="text" 
      placeholder="Ask tutor about this..." 
      id={`input-${n._id}`} 
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          askTutor(n._id, e.target.value);
          e.target.value = ""; // Clear input
        }
      }}
    />
    <button onClick={() => {
      const val = document.getElementById(`input-${n._id}`).value;
      askTutor(n._id, val);
    }}>🚀</button>
  </div>

  {/* Display Loading status for this specific note */}
  {loadingTutorId === n._id && <p className="pulse-text">Tutor is thinking... 🤔</p>}

  {/* Display the Answer if it exists for this note */}
  {tutorAnswers[n._id] && (
    <div className="tutor-response-box">
      <p><b>Tutor:</b> {tutorAnswers[n._id]}</p>
      <button className="clear-btn" onClick={() => setTutorAnswers(prev => ({...prev, [n._id]: null}))}>
        Clear Chat
      </button>
    </div>
  )}
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
  <div className="analytics-container">
    {/* Header Section */}
    <div className="graph-header-text">
      <h2 className="welcome-msg">Analytics Overview</h2>
      <p className="sub-text">Welcome to your learning analysis dashboard</p>
    </div>

    {/* KPI Row - Top 3 Boxes */}
    <div className="kpi-grid">
      <div className="kpi-card">
        <span className="kpi-label">TOTAL NOTES</span>
        <span className="kpi-value">{graphData.nodes.length}</span>
        <div className="kpi-trend">
        </div>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">CONNECTIONS</span>
        <span className="kpi-value">{graphData.links.length}</span>
        <div className="kpi-trend">
        </div>
      </div>
    </div>

    {/* Main Graph Card */}
    <div className="chart-card">
      <div className="chart-header">KNOWLEDGE MAP RELATIONSHIPS</div>
      <div className="graph-wrapper">
        <GraphVisualization nodes={graphData.nodes} links={graphData.links} />
      </div>
    </div>
  </div>
)}
        {activeTab === "whiteboard" && (
  <div className="animate-in">
    <div className="card" style={{ textAlign: "center" }}>
      {!whiteboardRoom ? (
        <div className="setup-collaboration">
          <h3>🎨 Private Whiteboard</h3>
          <p>Enter a username to invite them to draw with you.</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
            <input 
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Username to invite..." 
              style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
            />
            <button onClick={() => {
              if(!inviteName) return alert("Enter a name");
              socket.emit("request-whiteboard", { from: user.name, toUser: inviteName });
              alert(`Request sent to ${inviteName}`);
            }}>
              🤝 Send Request
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
            <span>🟢 Connected Session:{whiteboardRoom}</span>
<button onClick={handleEndSession} className="delete-btn">
  End Session for All
</button>          </div>
          <Whiteboard roomId={whiteboardRoom} socket={socket} />
        </div>
      )}
    </div>
  </div>
)}
{activeTab === "chat" && (
  <div className="animate-in">
    {/* 🚪 ROOM SELECTOR BAR */}
    <div className="card room-selector-bar" style={{ marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
      
      <button 
        className={roomId === "public-hall" ? "active-room-btn" : ""}
        onClick={() => {
          setRoomId("public-hall");
          socket.emit("join-room", { roomId: "public-hall", user: user.name });
        }}
      >
        🌐 Public Hall
      </button>

      <button onClick={() => {
        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const newCode = `STUDY_${randomSuffix}`;
        setRoomId(newCode);
        socket.emit("join-room", { roomId: newCode, user: user.name });
        navigator.clipboard.writeText(newCode);
        alert(`Private Room Created: ${newCode}\nCode copied to clipboard!`);
      }}>
        🔒 Create Private
      </button>

      {/* 🤝 INVITE BY USERNAME SECTION */}
      {roomId.startsWith("STUDY_") && (
        <div style={{ display: "flex", gap: "5px", borderLeft: "2px solid #eee", paddingLeft: "15px" }}>
          <input 
            placeholder="Friend's Username" 
            value={inviteName} 
            onChange={(e) => setInviteName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatInvite()}
            style={{ width: "140px", padding: "6px", borderRadius: "4px", border: "1px solid #ddd" }}
          />
          <button onClick={() => sendChatInvite(inviteName)} style={{ backgroundColor: "#6c5ce7", color: "white" }}>
  🤝 Invite
</button>
        </div>
      )}

      {/* 🔗 SHARE LINK BUTTON */}
      {roomId.startsWith("STUDY_") && (
        <button 
          className="share-btn"
          style={{ backgroundColor: "#28a745", color: "white" }}
          onClick={async () => {
            const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
            try {
              if (navigator.share) {
                await navigator.share({
                  title: 'Join my Study Room',
                  text: `Join my private study session! Code: ${roomId}`,
                  url: inviteUrl,
                });
              } else {
                await navigator.clipboard.writeText(inviteUrl);
                alert("Invite link copied to clipboard!");
              }
            } catch (err) { console.error(err); }
          }}
        >
          🔗 Share Link
        </button>
      )}

      <div style={{ display: "flex", gap: "5px", marginLeft: "auto" }}>
        <input 
          placeholder="Code" 
          value={roomCodeInput} 
          style={{ width: "100px", padding: "6px" }}
          onChange={(e) => setRoomCodeInput(e.target.value)} 
        />
        <button onClick={() => {
          if(!roomCodeInput) return alert("Enter a code");
          setRoomId(roomCodeInput);
          socket.emit("join-room", { roomId: roomCodeInput, user: user.name });
        }}>Join</button>
      </div>
    </div>

    {/* 💬 CHATBOX DISPLAY */}
    <div className="card chat-wrapper">
      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: "bold", color: "#444" }}>Current Room:</span>
          <span className="badge" style={{ fontSize: "1rem", padding: "5px 15px" }}>{roomId}</span>
        </div>
        {roomId.startsWith("STUDY_") ? (
           <span style={{ color: "#28a745", fontSize: "0.85rem", fontWeight: "bold" }}>● PRIVATE SESSION</span>
        ) : (
           <span style={{ color: "#777", fontSize: "0.85rem" }}>● PUBLIC CHANNEL</span>
        )}
      </div>
      
      <ChatBox
        socket={socket}
        user={user?.name || "Anonymous"}
        roomId={roomId}
      />
    </div>
  </div>
)}
        {activeTab === "files" && <FileUploader token={token} />}

        {activeTab === "calendar" && (
  <div className="calendar-grid">
    <div className="card">
      <h3>Task Manager</h3>
      <div className="task-input-group">
        <input 
          value={taskInput} 
          onChange={(e) => setTaskInput(e.target.value)} 
          placeholder="New Task" 
        />
        <input 
          type="datetime-local" 
          value={taskDate} 
          onChange={(e) => setTaskDate(e.target.value)} 
        />
        <button onClick={addTask}>Add Task</button>
      </div>

      {/* 🚩 Optimized Task List with Delete Button */}
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t._id} className="task-item">
            <div className="task-info">
              <strong>{t.title}</strong>
              <small>{new Date(t.dueDate).toLocaleString()}</small>
            </div>
            <button 
              className="delete-btn" 
              onClick={() => deleteTask(t._id)}
              title="Delete Task"
            >
              🗑️Delete
            </button>
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