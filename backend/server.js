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

// ================= SOCKET.IO STATE =================
const onlineUsers = {}; // Key: socket.id, Value: username

// ================= SOCKET.IO LOGIC =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 👤 1. USER PRESENCE (Login/Join)
  socket.on("join", ({ user }) => {
    if (!user) return;
    onlineUsers[socket.id] = user;
    
    // Broadcast updated unique user list to everyone
    const uniqueUsers = [...new Set(Object.values(onlineUsers))];
    io.emit("onlineUsers", uniqueUsers);
    console.log(`${user} joined global presence`);
  });

  // 🚪 2. ROOM MANAGEMENT (Chat & Study Rooms)
socket.on("join-room", ({ roomId, user }) => {
  if (!roomId || !user) return;

  // Check if the user is already in this room to prevent double system messages
  const isAlreadyInRoom = socket.rooms.has(roomId);

  // Leave previous rooms
  socket.rooms.forEach((room) => {
    if (room !== socket.id && room !== roomId) socket.leave(room);
  });

  socket.join(roomId);
  console.log(`${user} joined room: ${roomId}`);

  // ONLY notify others if they weren't already officially in this room session
  if (!isAlreadyInRoom) {
    socket.to(roomId).emit("receive-message", {
      user: "System",
      message: `${user} joined the room`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
});

  // 💬 3. CHAT MESSAGING
  socket.on("send-message", (data) => {
    // data: { roomId, user, message, time }
    if (data.roomId) {
      io.to(data.roomId).emit("receive-message", data);
    }
  });

  // ✍️ 4. TYPING INDICATORS
  socket.on("typing", ({ roomId, user }) => {
    if (roomId) {
      socket.to(roomId).emit("typing", user);
    } else {
      socket.broadcast.emit("typing", user);
    }
  });

  // ✉️ 5. PRIVATE INVITES (Chat)
  socket.on("request-chat-invite", ({ from, toUser, roomId }) => {
    const targetSocketId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === toUser
    );
    if (targetSocketId) {
      io.to(targetSocketId).emit("chat-invite-received", { from, roomId });
    }
  });

  // 🎨 6. WHITEBOARD COLLABORATION
  socket.on("request-whiteboard", ({ from, toUser }) => {
    const targetSocketId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === toUser
    );
    if (targetSocketId) {
      io.to(targetSocketId).emit("whiteboard-request-received", { from });
    }
  });

  socket.on("accept-whiteboard", ({ from, to }) => {
    // Create a unique room name for the two users
    const whiteboardRoomId = `WB_${[from, to].sort().join("_")}`;
    
    const s1 = Object.keys(onlineUsers).find(id => onlineUsers[id] === from);
    const s2 = Object.keys(onlineUsers).find(id => onlineUsers[id] === to);

    if (s1) io.sockets.sockets.get(s1)?.join(whiteboardRoomId);
    if (s2) io.sockets.sockets.get(s2)?.join(whiteboardRoomId);

    io.to(whiteboardRoomId).emit("whiteboard-approved", { roomId: whiteboardRoomId });
  });

  socket.on("draw", (payload) => {
    const { roomId, ...coords } = payload; 
    if (roomId) {
      socket.to(roomId).emit("draw", coords);
    }
  });

  socket.on("end-whiteboard", ({ roomId }) => {
    if (roomId) {
      io.to(roomId).emit("whiteboard-ended");
      // Force users to leave the whiteboard room
      io.in(roomId).socketsLeave(roomId);
    }
  });

  // ❌ 7. DISCONNECT
  socket.on("disconnect", () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    
    // Update global user list
    const uniqueUsers = [...new Set(Object.values(onlineUsers))];
    io.emit("onlineUsers", uniqueUsers);
    
    console.log(`User disconnected: ${socket.id} (${username || "Unknown"})`);
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});