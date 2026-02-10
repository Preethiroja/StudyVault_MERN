import { useRef, useEffect, useState, useCallback } from "react";

// NOTE: We no longer import or create a socket here. 
// We receive it as a prop from Dashboard.js

export default function Whiteboard({ roomId, socket }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  // UseCallback prevents the ESLint warning and keeps the function stable
  const drawLine = useCallback((x0, y0, x1, y1, emit) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    // Send drawing data through the shared socket
    socket.emit("draw", { x0, y0, x1, y1, roomId });
  }, [roomId, socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Set internal canvas resolution to match displayed size
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    // Listener for incoming drawing data from other users
    const handleRemoteDraw = (data) => {
      const { x0, y0, x1, y1 } = data;
      drawLine(x0, y0, x1, y1, false);
    };

    socket.on("draw", handleRemoteDraw);

    // Cleanup listener on unmount
    return () => {
      socket.off("draw", handleRemoteDraw);
    };
  }, [drawLine, socket]);

  const startDrawing = (e) => {
    setDrawing(true);
    // Store the starting coordinates on the ctx object for easy access
    ctxRef.current.lastX = e.nativeEvent.offsetX;
    ctxRef.current.lastY = e.nativeEvent.offsetY;
  };

  const draw = (e) => {
    if (!drawing) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Draw locally and emit to server
    drawLine(ctxRef.current.lastX, ctxRef.current.lastY, x, y, true);

    // Update coordinates for the next segment
    ctxRef.current.lastX = x;
    ctxRef.current.lastY = y;
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  return (
    <div className="whiteboard-container" style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          border: "2px solid #dfe6e9",
          borderRadius: "10px",
          width: "100%",
          height: "400px",
          background: "#ffffff",
          cursor: "crosshair",
          display: "block"
        }}
      />
      <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "#636e72" }}>
        {roomId ? `Collaborating in Room: ${roomId}` : "Local Whiteboard"}
      </div>
    </div>
  );
}