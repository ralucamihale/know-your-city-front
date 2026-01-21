import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Login from './Login';
import Register from './Register';
import Menu from './Menu'; 
import './App.css';

// --- CONSTANTS ---
// We use the same coordinates as the Menu to ensure alignment
const HARDCODED_LAT = 44.4363421207524;
const HARDCODED_LNG = 26.047860301820446;

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

  const { gridId } = useParams(); 
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
          const res = await fetch('http://127.0.0.1:5000/api/explore', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  lat, 
                  lng, 
                  user_id: userId,
                  grid_id: gridId 
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
              
              // Draw Grid Outline
              drawGridOutline(data.center_lat, data.center_lng, data.dimension, data.cell_size);

              // Draw Already Unlocked Cells
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

  const updateUserMarker = (lat, lng) => {
    if(userLayerRef.current) {
        userLayerRef.current.removeAll(); 
        const point = { type: "point", longitude: lng, latitude: lat };
        const markerSymbol = {
            type: "simple-marker",
            color: [0, 119, 255], 
            outline: { color: [255, 255, 255], width: 2 }
        };
        userLayerRef.current.add(new Graphic({ geometry: point, symbol: markerSymbol }));
    }
  };

  useEffect(() => {
    if (!mapDiv.current) return;

    // 1. Initialize Map centered at HARDCODED location
    const map = new Map({ basemap: "dark-gray-vector" });
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [HARDCODED_LNG, HARDCODED_LAT], // Start camera here
      zoom: 15
    });
    
    // Zoom buttons top-right
    view.ui.move("zoom", "top-right");

    viewRef.current = view;

    const gLayer = new GraphicsLayer();
    map.add(gLayer);
    gridLayerRef.current = gLayer;
    
    const uLayer = new GraphicsLayer();
    map.add(uLayer);
    userLayerRef.current = uLayer;

    // Load grid data
    loadUserGrid();

    // --- 2. SPOOF THE USER LOCATION ---
    // Instead of waiting for GPS, we immediately place the user 
    // at the hardcoded coordinates.
    view.when(() => {
        console.log("📍 Spoofing User Location to:", HARDCODED_LAT, HARDCODED_LNG);
        
        // A. Draw the blue dot
        updateUserMarker(HARDCODED_LAT, HARDCODED_LNG);
        
        // B. Check the server to unlock the cell immediately
        explorePosition(HARDCODED_LAT, HARDCODED_LNG);
    });

    // --- 3. CLICK TO TELEPORT (Development Mode) ---
    // This lets you simulate walking by clicking around
    view.on("click", (event) => {
        const lat = event.mapPoint.latitude;
        const lng = event.mapPoint.longitude;

        updateUserMarker(lat, lng); 
        explorePosition(lat, lng); 
    });

    // --- 4. REAL GPS DISABLED FOR THIS TEST ---
    /* if ("geolocation" in navigator) {
        const watcher = navigator.geolocation.watchPosition(...) 
        // Code commented out to prevent real GPS from overriding our spoof
    }
    */
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId]); 

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {notification && (
          <div style={styles.notification}>
              {notification}
          </div>
      )}

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
        <Route path="/map/:gridId" element={<GameMap />} />
      </Routes>
    </Router>
  );
}

export default App;