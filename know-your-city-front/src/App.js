import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Login from './Login';
import Register from './Register';
import Menu from './Menu'; // Ensure this matches your file name
import './App.css';

// --- STYLES ---
const styles = {
    notification: {
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        zIndex: 100,
        fontSize: '16px',
        fontWeight: '500',
        boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease-in-out',
    },
    backBtn: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 90,
        padding: '10px 20px',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
};

function GameMap() {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const gridLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const gridMetadataRef = useRef(null);

  const { gridId } = useParams(); // <--- GET ID FROM URL
  const [notification, setNotification] = useState(null);
  const userId = localStorage.getItem('user_id'); 
  const navigate = useNavigate();

  useEffect(() => {
      if (!userId) {
          navigate('/');
      }
  }, [userId, navigate]);

  const showMessage = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const createCellGraphic = (row, col, centerLat, centerLng, cellSize) => {
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360;

    const latOffset = (row * cellSize) / metersPerLat; 
    const lngOffset = (col * cellSize) / metersPerLng;

    const cellCenterLat = centerLat + latOffset;
    const cellCenterLng = centerLng + lngOffset;

    const halfSizeLat = (cellSize / 2) / metersPerLat;
    const halfSizeLng = (cellSize / 2) / metersPerLng;

    const polygon = {
        type: "polygon",
        rings: [
            [cellCenterLng - halfSizeLng, cellCenterLat - halfSizeLat],
            [cellCenterLng + halfSizeLng, cellCenterLat - halfSizeLat],
            [cellCenterLng + halfSizeLng, cellCenterLat + halfSizeLat],
            [cellCenterLng - halfSizeLng, cellCenterLat + halfSizeLat],
            [cellCenterLng - halfSizeLng, cellCenterLat - halfSizeLat]
        ]
    };

    return new Graphic({
        geometry: polygon,
        symbol: {
            type: "simple-fill",
            color: [227, 139, 79, 0.6],
            outline: { color: [255, 255, 255], width: 1 }
        }
    });
  };

  const drawGridOutline = (centerLat, centerLng, dimension, cellSize) => {
    if(!gridLayerRef.current) return;

    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360;
    const totalSizeMeters = dimension * cellSize;
    const halfSizeLat = (totalSizeMeters / 2) / metersPerLat;
    const halfSizeLng = (totalSizeMeters / 2) / metersPerLng;

    const outlinePolygon = {
        type: "polygon",
        rings: [
            [centerLng - halfSizeLng, centerLat - halfSizeLat],
            [centerLng + halfSizeLng, centerLat - halfSizeLat],
            [centerLng + halfSizeLng, centerLat + halfSizeLat],
            [centerLng - halfSizeLng, centerLat + halfSizeLat],
            [centerLng - halfSizeLng, centerLat - halfSizeLat]
        ]
    };

    const outlineGraphic = new Graphic({
        geometry: outlinePolygon,
        symbol: {
            type: "simple-line",
            color: [255, 255, 255, 0.8],
            width: 2,
            style: "dash"
        }
    });

    gridLayerRef.current.add(outlineGraphic);
  };

  const explorePosition = async (lat, lng) => {
      try {
          // --- CHANGED: Send grid_id so backend knows which grid to update ---
          const res = await fetch('http://127.0.0.1:5000/api/explore', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  lat, 
                  lng, 
                  user_id: userId,
                  grid_id: gridId // <--- CRITICAL UPDATE
              })
          });
          const data = await res.json();
          
          if(data.status === 'unlocked') {
              if (gridMetadataRef.current && gridLayerRef.current) {
                  showMessage(`🎉 Zonă nouă descoperită! (${data.row}, ${data.col})`);
                  
                  const newGraphic = createCellGraphic(
                      data.row, 
                      data.col, 
                      gridMetadataRef.current.centerLat, 
                      gridMetadataRef.current.centerLng, 
                      gridMetadataRef.current.cellSize
                  );
                  gridLayerRef.current.add(newGraphic);
              }
          }
      } catch (e) {
          console.log("Eroare explorare", e);
      }
  };

  const loadUserGrid = async () => {
      try {
          // --- CHANGED: Fetch specific grid data using URL param ---
          const res = await fetch(`http://127.0.0.1:5000/api/grid_data/${gridId}`);
          if (!res.ok) throw new Error("Grid not found");

          const data = await res.json();
          
          if(data.has_grid && gridLayerRef.current) {
              
              gridMetadataRef.current = {
                  centerLat: data.center_lat,
                  centerLng: data.center_lng,
                  cellSize: data.cell_size,
                  dimension: data.dimension
              };

              gridLayerRef.current.removeAll(); 
              
              if(viewRef.current) {
                  viewRef.current.when(() => {
                      viewRef.current.goTo({ center: [data.center_lng, data.center_lat], zoom: 15 })
                        .catch(err => { if (err.name !== "AbortError") console.log(err); });
                  });
              }

              drawGridOutline(data.center_lat, data.center_lng, data.dimension, data.cell_size);

              const graphics = data.unlocked_cells.map(cell => 
                  createCellGraphic(cell.row, cell.col, data.center_lat, data.center_lng, data.cell_size)
              );
              gridLayerRef.current.addMany(graphics);
          }
      } catch (err) {
          console.error("Err loading grid", err);
          showMessage("Eroare la încărcarea hărții.");
      }
  };

  useEffect(() => {
    if (!mapDiv.current) return;

    // Initialize Map
    const map = new Map({ basemap: "dark-gray-vector" });
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [26.1025, 44.4268], 
      zoom: 15
    });

    view.ui.move("zoom", "top-right");

    viewRef.current = view;

    // Layers
    const gLayer = new GraphicsLayer();
    map.add(gLayer);
    gridLayerRef.current = gLayer;
    
    const uLayer = new GraphicsLayer();
    map.add(uLayer);
    userLayerRef.current = uLayer;

    // Load grid data from server
    loadUserGrid();

    // 1. CLICK LISTENER (For testing/teleporting)
    view.on("click", (event) => {
        const lat = event.mapPoint.latitude;
        const lng = event.mapPoint.longitude;

        updateUserMarker(lat, lng); // Helper function to draw the dot
        explorePosition(lat, lng);  // Check server for unlock
    });

    // 2. GPS WATCHER (Real movement)
    if ("geolocation" in navigator) {
        const watcher = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Draw the user on the map
                updateUserMarker(latitude, longitude);

                // Check if we unlocked a cell
                // (This fires on the very first position and every update)
                explorePosition(latitude, longitude);
            },
            (err) => console.log("GPS Error:", err),
            { 
                enableHighAccuracy: true, 
                maximumAge: 0, 
                timeout: 5000 
            }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId]); // Re-run if we switch grids

  // Helper to keep code clean
  const updateUserMarker = (lat, lng) => {
      if(userLayerRef.current) {
          userLayerRef.current.removeAll(); 
          const point = { type: "point", longitude: lng, latitude: lat };
          const markerSymbol = {
              type: "simple-marker",
              color: [0, 119, 255], // Blue dot for user
              outline: { color: [255, 255, 255], width: 2 }
          };
          userLayerRef.current.add(new Graphic({ geometry: point, symbol: markerSymbol }));
      }
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {notification && (
          <div style={styles.notification}>
              {notification}
          </div>
      )}

      {/* Back to Menu Button */}
      <button style={styles.backBtn} onClick={() => navigate('/menu')}>
          ⬅ Back to Menu
      </button>

      <div className="map-container" ref={mapDiv} style={{ height: "100%", width: "100%" }}></div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/menu" element={<Menu />} />
        {/* The Route below captures the ID from URL */}
        <Route path="/map/:gridId" element={<GameMap />} />
      </Routes>
    </Router>
  );
}

export default App;