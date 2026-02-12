import { useState, useEffect, useRef } from "react";

export default function ChatBox({ 
  user = "Anonymous", 
  context = "General Discussion", 
  roomId = "public-hall", 
  socket 
}) { 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const messagesEndRef = useRef(null);

  // ================= MAIN SOCKET LOGIC =================
  useEffect(() => {
    if (!socket) return;

    // 1. Tell server we are joining this specific room
    socket.emit("join-room", { roomId, user });

    // 2. Define handler functions
    // We name them so we can clean them up specifically
    const onMessageReceived = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const onTyping = (name) => {
      // Don't show the typing indicator if it's you typing
      if (name !== user) {
        setTypingUser(name);
        // Clear the indicator after 1.5 seconds of silence
        const timer = setTimeout(() => setTypingUser(""), 1500);
        return () => clearTimeout(timer);
      }
    };

    // 3. Attach listeners
    socket.on("receive-message", onMessageReceived);
    socket.on("typing", onTyping);

    // 4. CLEANUP: This is the "Double-Killer"
    // This runs before the effect runs again or when the component unmounts
    return () => {
      socket.off("receive-message", onMessageReceived);
      socket.off("typing", onTyping);
    };
  }, [roomId, socket, user]); 

  // ================= AUTO SCROLL =================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ================= SEND MESSAGE =================
  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("send-message", {
      roomId,
      user,
      message: input,
      context,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        {messages.length === 0 && (
          <p className="empty-chat">No messages in this room yet...</p>
        )}
        
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`message-bubble ${m.user === user ? "my-message" : ""}`}
          >
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
            socket.emit("typing", { roomId, user }); // Pass room so only room-mates see it
          }}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}