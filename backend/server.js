require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./db");

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ================= GLOBAL MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ================= ROUTES =================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/files", require("./routes/shareRoutes"));

// ================= SOCKET.IO =================
const onlineUsers = {}; // Key: socket.id, Value: username

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🚪 End Whiteboard for all in room
  socket.on("end-whiteboard", ({ roomId }) => {
    if (roomId) {
      io.to(roomId).emit("whiteboard-ended");
      io.in(roomId).socketsLeave(roomId);
    }
  });

  // 👤 User joins
  socket.on("join", ({ user }) => {
    onlineUsers[socket.id] = user;
    
    // 🔥 FIX: Send only UNIQUE names to the frontend
    const uniqueUsers = [...new Set(Object.values(onlineUsers))];
    io.emit("onlineUsers", uniqueUsers);
  });

  // 💬 Chat message
  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  // ✍️ Typing indicator
  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
  });

  // 🎨 Whiteboard logic
  socket.on("request-whiteboard", ({ from, toUser }) => {
    const targetSocketId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === toUser
    );
    if (targetSocketId) {
      io.to(targetSocketId).emit("whiteboard-request-received", { from });
    }
  });

  socket.on("accept-whiteboard", ({ from, to }) => {
    const roomId = [from, to].sort().join("_");
    const s1 = Object.keys(onlineUsers).find(id => onlineUsers[id] === from);
    const s2 = Object.keys(onlineUsers).find(id => onlineUsers[id] === to);

    if (s1) io.sockets.sockets.get(s1).join(roomId);
    if (s2) io.sockets.sockets.get(s2).join(roomId);

    io.to(roomId).emit("whiteboard-approved", { roomId });
  });

  socket.on("draw", (payload) => {
    const { roomId, ...coords } = payload; 
    if (roomId) {
      socket.to(roomId).emit("draw", coords);
    } else {
      socket.broadcast.emit("draw", payload);
    }
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    
    // 🔥 FIX: Send only UNIQUE names after someone leaves
    const uniqueUsers = [...new Set(Object.values(onlineUsers))];
    io.emit("onlineUsers", uniqueUsers);
    
    console.log("User disconnected:", socket.id);
  });
});
io.on("connection", (socket) => {
  // --- ADD THIS BLOCK ---
  socket.on("join-room", ({ roomId, user }) => {
    // Force the socket into a specific "room"
    socket.join(roomId);
    console.log(`✅ ${user} connected to Room: ${roomId}`);
    
    // Notify others in that specific room only
    socket.to(roomId).emit("message", { 
      user: "System", 
      text: `${user} has joined the study session.` 
    });
  });

  // Update your existing Chat/Whiteboard listeners to include roomId
  socket.on("send-message", (data) => {
    // Use io.to(roomId) instead of io.emit()
    io.to(data.roomId).emit("receive-message", data);
  });
  // ----------------------
});
// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on ${PORT}`);
});