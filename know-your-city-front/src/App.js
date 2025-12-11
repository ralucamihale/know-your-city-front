import React, { useState, useEffect } from 'react';
import { getStatus } from './services/api';
import MapComponent from './MapComponent';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatus()
      .then(response => setData(response))
      .catch(err => setError("Failed to connect to backend"));
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <h2>KnowYourCity</h2>
        <div className="status-indicator">
          {!data && !error && <span style={{color: 'orange'}}>Conectare...</span>}
          {error && <span style={{color: '#ff6b6b'}}>Offline</span>}
          {data && <span style={{color: '#4caf50'}}>Online</span>}
        </div>
      </header>

      <main className="map-section">
        <MapComponent />
      </main>
      
      {/* Mesajul de debug jos, opțional */}
      {data && (
        <div className="debug-info">
           Mesaj server: {data.message}
        </div>
      )}
    </div>
  );
}

export default App;