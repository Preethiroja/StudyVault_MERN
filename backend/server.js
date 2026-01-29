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
app.use("/api/share", require("./routes/shareRoutes"));

// ================= SOCKET.IO =================
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 👤 User joins
  socket.on("join", ({ user }) => {
    onlineUsers[socket.id] = user;
    io.emit("onlineUsers", Object.values(onlineUsers));
  });

  // 💬 Chat message
  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  // ✍️ Typing indicator
  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
  });

  // 🎨 Whiteboard drawing
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("onlineUsers", Object.values(onlineUsers));
    console.log("User disconnected:", socket.id);
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on ${PORT}`);
});
