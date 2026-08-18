import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://api.homelab.local";

function App() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/visits`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setCount(data.count))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <div className="card">
        <div className="card__icon">📖</div>
        <h1>Guestbook</h1>
        <p className="card__subtitle">Thanks for stopping by.</p>

        {error && <p className="error">Error: {error}</p>}

        {!error && count === null && (
          <div className="status">
            <div className="spinner" />
            <span>Loading...</span>
          </div>
        )}

        {!error && count !== null && (
          <div>
            <p className="count">{count}</p>
            <p className="count__label">
              visit{count === 1 ? "" : "s"} so far
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
