export default function Navbar({ onLogout }) {
  return (
    <div className="navbar">
      <div className="nav-title">📖 StudyVault</div>
      <button className="logout-btn" onClick={onLogout}>Logout</button>
    </div>
  );
}
