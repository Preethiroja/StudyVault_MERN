import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff"); 
  const [tool, setTool] = useState("draw"); 
  const [brushSize, setBrushSize] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    socket.on("draw-data", (data) => {
      const { type, x, y, color, size, text } = data;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      if (type === "text") {
        ctx.font = `${size * 5}px Poppins`;
        ctx.fillText(text, x, y);
      } else if (type === "draw") {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (type === "start") {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    });
    return () => socket.off("draw-data");
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startAction = (e) => {
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext("2d");
    if (tool === "text") {
      const text = prompt("Enter your text:");
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${brushSize * 5}px Poppins`;
        ctx.fillText(text, x, y);
        socket.emit("draw-data", { type: "text", x, y, color, size: brushSize, text });
      }
    } else {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === "eraser" ? "#1e293b" : color;
      ctx.lineWidth = brushSize;
      socket.emit("draw-data", { type: "start", x, y, color: ctx.strokeStyle, size: brushSize });
    }
  };

  const performAction = (e) => {
    if (!isDrawing || tool === "text") return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    socket.emit("draw-data", { type: "draw", x, y, color: ctx.strokeStyle, size: brushSize });
  };

  // 💾 NEW: DOWNLOAD FUNCTION
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `whiteboard-${Date.now()}.png`;
    link.click();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="whiteboard-wrapper">
      <div className="whiteboard-controls">
        <div className="control-group">
          <button className={tool === "draw" ? "active" : ""} onClick={() => setTool("draw")}>✏️ Draw</button>
          <button className={tool === "text" ? "active" : ""} onClick={() => setTool("text")}>🔠 Text</button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}>🧽 Eraser</button>
        </div>
        <div className="control-group">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <input type="range" min="1" max="10" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} />
        </div>
        <div className="control-group">
          <button className="download-btn" onClick={downloadCanvas}>💾 Save PNG</button>
          <button className="clear-btn" onClick={clearCanvas}>🗑️ Clear</button>
        </div>
      </div>
      <canvas ref={canvasRef} onMouseDown={startAction} onMouseMove={performAction} onMouseUp={() => setIsDrawing(false)} />
    </div>
  );
}