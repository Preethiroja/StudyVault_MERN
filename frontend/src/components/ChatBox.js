import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// ✅ socket outside component (IMPORTANT)
const socket = io("http://localhost:5000");

export default function ChatBox({
  user = "Anonymous",
  context = "General Discussion",
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const messagesEndRef = useRef(null);

  // ================= JOIN & ONLINE USERS =================
  useEffect(() => {
    socket.emit("join", { user });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("onlineUsers");
    };
  }, [user]);

  // ================= RECEIVE MESSAGES =================
  useEffect(() => {
    const handleReceive = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.off("receiveMessage", handleReceive);
    };
  }, []);

  // ================= TYPING INDICATOR =================
  useEffect(() => {
    socket.on("typing", (name) => {
      setTypingUser(name);
      setTimeout(() => setTypingUser(""), 1500);
    });

    return () => socket.off("typing");
  }, []);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ================= SEND MESSAGE =================
  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("sendMessage", {
      user,
      message: input,
      context,
      time: new Date().toLocaleTimeString(),
    });

    setInput("");
  };

  return (
    <div className="card">
      <h3>💬 Live Chat</h3>

      <p style={{ fontSize: "12px", color: "#555" }}>
        Context: <b>{context}</b>
      </p>

      <p style={{ fontSize: "12px", marginBottom: "8px" }}>
        👥 Online Users:{" "}
        {onlineUsers.length > 0 ? onlineUsers.join(", ") : "No one online"}
      </p>

      <div
        style={{
          height: "230px",
          overflowY: "auto",
          border: "1px solid #ddd",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "8px",
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            <b>{m.user}</b>{" "}
            <span style={{ fontSize: "11px", color: "#999" }}>
              [{m.time}]
            </span>
            <div style={{ fontSize: "14px" }}>{m.message}</div>
            <div style={{ fontSize: "11px", color: "#0fb9b1" }}>
              #{m.context}
            </div>
          </div>
        ))}

        {typingUser && (
          <p style={{ fontSize: "12px", color: "#888" }}>
            ✍️ {typingUser} is typing...
          </p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          socket.emit("typing", user);
        }}
        placeholder="Type your message..."
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button onClick={sendMessage} style={{ marginTop: "8px" }}>
        Send
      </button>
    </div>
  );
}
