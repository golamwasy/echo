import { useEffect, useState } from "react";

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
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: "4rem" }}>
      <h1>Guestbook</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!error && count === null && <p>Loading...</p>}
      {!error && count !== null && (
        <p>
          This page has been visited <strong>{count}</strong> time{count === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

export default App;
