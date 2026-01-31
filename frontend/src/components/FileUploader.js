import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function FileUploader({ token }) {
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");

  const fetchFiles = async () => {
    try {
      const res = await api.get("/files", { headers: { Authorization: token } });
      setFiles(res.data);
      
      const sharedRes = await api.get("/files/shared-with-me", { headers: { Authorization: token } });
      setSharedFiles(sharedRes.data);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await api.post("/files", formData, {
        headers: { Authorization: token, "Content-Type": "multipart/form-data" },
      });
      fetchFiles();
      alert("File uploaded! +5 points earned.");
    } catch (err) {
      alert("Upload failed.");
    }
    setUploading(false);
  };

  const shareToFriend = async (fileId) => {
    if (!friendEmail) return alert("Please enter an email first!");
    try {
      await api.post("/files/share-to-friend", 
        { fileId, friendEmail }, 
        { headers: { Authorization: token } }
      );
      alert("Shared successfully!");
      setFriendEmail(""); 
    } catch (err) {
      alert("User not found or sharing failed.");
    }
  };

  const copyPublicLink = (fileId) => {
    const link = `${window.location.origin.replace(":3000", ":5000")}/api/files/download/${fileId}`;
    navigator.clipboard.writeText(link);
    alert("Public download link copied!");
  };

  // Common button style for consistency
  const btnStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "0.2s"
  };

  return (
    <div className="card" style={{ padding: "20px" }}>
      <h3 style={{ marginBottom: "20px" }}>File Vault 📁</h3>
      
      <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginBottom: "25px" }}>
        <input type="file" onChange={onFileChange} disabled={uploading} />
        {uploading && <p style={{ color: "#0984e3", marginTop: "10px" }}>🚀 Uploading study materials...</p>}
      </div>

      <h4 style={{ color: "#2d3436", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>My Uploads</h4>
      <div className="file-list">
        {files.map((f) => (
          <div key={f._id} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "white",
            padding: "12px 15px",
            marginBottom: "10px",
            borderRadius: "12px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            border: "1px solid #f1f2f6"
          }}>
            <span style={{ fontWeight: "600", flex: "1" }}>{f.filename}</span>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input 
                placeholder="Friend's email" 
                onChange={(e) => setFriendEmail(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd", width: "160px" }}
              />
              <button onClick={() => shareToFriend(f._id)} style={{ ...btnStyle, backgroundColor: "#fdcb6e", color: "#2d3436" }}>🤝 Share</button>
              <button onClick={() => window.open(`${window.location.origin.replace(":3000", ":5000")}/api/files/download/${f._id}`)} style={{ ...btnStyle, backgroundColor: "#0984e3" }}>📥 Download</button>
              <button onClick={() => copyPublicLink(f._id)} style={{ ...btnStyle, backgroundColor: "#00b894" }}>🔗 Link</button>
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ color: "#00b894", marginTop: "40px", borderBottom: "2px solid #e3faf3", paddingBottom: "10px" }}>Shared With Me 🤝</h4>
      <div className="file-list">
        {sharedFiles.length === 0 ? <p style={{ color: "gray", textAlign: "center", padding: "20px" }}>No files shared with you yet.</p> : (
          sharedFiles.map((f) => (
            <div key={f._id} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f0fff4",
              padding: "12px 15px",
              marginBottom: "10px",
              borderRadius: "12px",
              border: "1px solid #c6f6d5"
            }}>
              <span>
                <strong>{f.filename}</strong> <br/>
                <small style={{ color: "#2f855a" }}>Sent by: {f.userId?.name || "Unknown User"}</small>
              </span>
              <button onClick={() => window.open(`${window.location.origin.replace(":3000", ":5000")}/api/files/download/${f._id}`)} style={{ ...btnStyle, backgroundColor: "#38a169" }}>
                📥 Download
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}