import React, { useState, useEffect } from 'react';
import { getStatus } from './services/api';

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // This runs automatically when the page loads
  useEffect(() => {
    getStatus()
      .then(response => setData(response))
      .catch(err => setError("Failed to connect to backend"));
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>City App Connection Test</h1>
      
      {/* State: Loading */}
      {!data && !error && <p>Trying to reach Flask...</p>}

      {/* State: Error */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* State: Success */}
      {data && (
        <div style={{ padding: '20px', border: '2px solid green', display: 'inline-block', borderRadius: '10px' }}>
          <h2 style={{ color: 'green' }}>✓ Connected!</h2>
          <p><strong>Status:</strong> {data.status}</p>
          <p><strong>Message:</strong> {data.message}</p>
          <p><strong>Payload:</strong> {data.payload}</p>
        </div>
      )}
    </div>
  );
}

export default App;