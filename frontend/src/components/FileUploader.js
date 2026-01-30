import { useState, useEffect } from "react";
import { api } from "../api";

export default function FileUploader({ token }) {
  const [files,setFiles] = useState([]);
  const [file,setFile] = useState(null);

  const uploadFile=async()=>{
    const formData = new FormData();
    formData.append("file",file);
    await api.post("/share",formData,{headers:{Authorization:token,"Content-Type":"multipart/form-data"}});
    loadFiles();
  };

  const loadFiles=async()=>{
    const res = await api.get("/share",{headers:{Authorization:token}});
    setFiles(res.data);
  };

  useEffect(()=>{ loadFiles(); },[]);

  return (
    <div className="card">
      <h3>Temporary File Sharing</h3>
      <input type="file" onChange={e=>setFile(e.target.files[0])}/>
      <button onClick={uploadFile}>Upload</button>
      <ul>{files.map(f=><li key={f._id}><a href={`http://localhost:5000/${f.path}`} target="_blank">{f.filename}</a></li>)}</ul>
    </div>
  );
}
