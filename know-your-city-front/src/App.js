import React, { useState, useEffect } from 'react';
import { getCities } from './services/api';

function App() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCities()
      .then(data => {
        setCities(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to fetch cities");
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', textAlign: 'center' }}>
      <h1>🌍 Know Your City</h1>
      
      {/* Loading State */}
      {loading && <p>Loading cities from Supabase...</p>}

      {/* Error State */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Empty State */}
      {!loading && !error && cities.length === 0 && (
        <p>No cities found in the database.</p>
      )}

      {/* Data List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
        {cities.map((city) => (
          <div 
            key={city.id} 
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              width: '200px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            {/* Adjust these keys (name, country) to match your actual Supabase columns */}
            <h3>{city.name}</h3> 
            <p style={{ color: '#666' }}>{city.country || 'Unknown Location'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;