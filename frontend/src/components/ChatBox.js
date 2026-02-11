import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// ✅ Move socket inside if you want to ensure it handles room changes properly, 
// or keep it outside and ensure join-room is called.
const socket = io("http://localhost:5000");

export default function ChatBox({
  user = "Anonymous",
  context = "General Discussion",
  roomId = "public-hall" // 🚩 Added this prop
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const messagesEndRef = useRef(null);

  // ================= ROOM MANAGEMENT =================
  useEffect(() => {
    // When roomId changes, tell the server to move this user
    socket.emit("join-room", { roomId, user });

    // Clear messages when switching rooms (optional, but cleaner)
    setMessages([]); 

    return () => {
      // Optional: Leave room logic if implemented on backend
    };
  }, [roomId, user]);

  // ================= RECEIVE MESSAGES =================
  useEffect(() => {
    // We use a specific listener for room-based messages
    const handleReceive = (data) => {
      // Only show message if it belongs to this room (Server usually handles this, but safety first)
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receive-message", handleReceive); // 🚩 Matches server's io.to(roomId).emit

    return () => {
      socket.off("receive-message", handleReceive);
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

    // 🚩 CRITICAL: Send the roomId so the server knows where to broadcast
    socket.emit("send-message", {
      roomId,
      user,
      message: input,
      context,
      time: new Date().toLocaleTimeString(),
    });

    setInput("");
  };

  return (
    <div className="card chat-container">
      <div className="chat-header">
        <h3>💬 {roomId === "public-hall" ? "Public Hall" : `Private Room: ${roomId}`}</h3>
        <span className="context-tag">#{context}</span>
      </div>

      <div className="chat-messages-box">
        {messages.length === 0 && <p className="empty-chat">No messages in this room yet...</p>}
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.user === user ? "my-message" : ""}`}>
            <div className="msg-meta">
              <b>{m.user}</b> <span className="msg-time">{m.time}</span>
            </div>
            <div className="msg-text">{m.message}</div>
          </div>
        ))}

        {typingUser && (
          <p className="typing-indicator">✍️ {typingUser} is typing...</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            socket.emit("typing", user);
          }}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}