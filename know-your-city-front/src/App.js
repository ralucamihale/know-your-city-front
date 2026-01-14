import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Login from './Login';
import Register from './Register';
import './App.css';

// Componenta de Hartă separată
function GameMap() {
  const mapDiv = useRef(null);
  const [gpsError, setGpsError] = useState(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    // 1. Setup Hartă
    const map = new Map({ basemap: "dark-gray-vector" }); // Temă întunecată pt joc
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [26.1025, 44.4268], // Piața Unirii
      zoom: 15
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    // Funcție pentru desenarea unui pătrat de grid
    const drawCell = (row, col) => {
        const centerLat = 44.4268;
        const centerLng = 26.1025;
        const cellSize = 50; // metri
        
        // Conversie inversă (simplificată pt vizualizare)
        const latOffset = row * cellSize / 111320; 
        const lngOffset = col * cellSize / (40075000 * Math.cos(centerLat * Math.PI / 180) / 360);

        const lat = centerLat + latOffset;
        const lng = centerLng + lngOffset;

        // Creăm un pătrat de aprox 50m
        const delta = 0.00025; // aprox 25m în grade
        const polygon = {
            type: "polygon",
            rings: [
                [lng - delta, lat - delta],
                [lng + delta, lat - delta],
                [lng + delta, lat + delta],
                [lng - delta, lat + delta],
                [lng - delta, lat - delta]
            ]
        };

        const graphic = new Graphic({
            geometry: polygon,
            symbol: {
                type: "simple-fill",
                color: [227, 139, 79, 0.6],
                outline: { color: [255, 255, 255], width: 1 }
            }
        });
        graphicsLayer.add(graphic);
    };

    // 2. Încărcăm progresul existent
    fetch('http://127.0.0.1:5000/api/grid/1')
        .then(res => res.json())
        .then(data => {
            data.forEach(cell => drawCell(cell.row, cell.col));
        });

    // 3. Pornim GPS-ul (Task 8)
    if ("geolocation" in navigator) {
        const watcher = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Trimitem la server (Task 10)
                fetch('http://127.0.0.1:5000/api/explore', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        lat: latitude, 
                        lng: longitude,
                        user_id: 1 // Hardcodat pt MVP
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'unlocked') {
                        drawCell(data.row, data.col);
                        console.log("Celulă nouă descoperită!", data);
                    }
                });
            },
            (error) => setGpsError(error.message),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    } else {
        setGpsError("GPS-ul nu este suportat de browser.");
    }

  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {gpsError && <div style={{position:'absolute', top:10, left:10, background:'red', padding:5, zIndex:99}}>{gpsError}</div>}
      <div className="map-container" ref={mapDiv} style={{ height: "100%", width: "100%" }}></div>
    </div>
  );
}

// Rutare principală
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/map" element={<GameMap />} />
      </Routes>
    </Router>
  );
}

export default App;