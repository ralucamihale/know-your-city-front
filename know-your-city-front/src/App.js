import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import Graphic from "@arcgis/core/Graphic";
import Popup from "@arcgis/core/widgets/Popup";
import Polyline from "@arcgis/core/geometry/Polyline";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine"; 

import Login from './Login';
import Register from './Register';
import Menu from './Menu';
import Dashboard from './Dashboard'; 
import './App.css';

// --- CONSTANTE ---
const HARDCODED_LAT = 44.4363421207524;
const HARDCODED_LNG = 26.047860301820446;

const geoJsonData = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [26.047860, 44.436342] },
            "properties": { "name": "Start Point (Politehnica)", "type": "Base", "description": "Punctul central de start." }
        },
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [26.051000, 44.438000] },
            "properties": { "name": "Metrou Grozăvești", "type": "Transport", "description": "Nod important de transport." }
        },
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [26.060000, 44.435000] },
            "properties": { "name": "Grădina Botanică", "type": "Parc", "description": "Zonă verde mare." }
        },
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [26.035000, 44.430000] },
            "properties": { "name": "AFI Cotroceni", "type": "Mall", "description": "Zonă comercială." }
        }
    ]
};

const styles = {
    notification: {
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '12px 24px',
        borderRadius: '8px', zIndex: 100, pointerEvents: 'none'
    },
    controls: {
        position: 'absolute', 
        bottom: '120px', 
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#fff', padding: '15px',
        borderRadius: '8px', fontSize: '14px', maxWidth: '250px'
    },
    backBtn: {
        position: 'absolute', top: '20px', left: '20px', zIndex: 90,
        padding: '10px 20px', background: '#333', color: 'white', border: 'none',
        borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
    },
    legend: {
        position: 'absolute', bottom: '30px', right: '20px',
        background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '5px',
        fontSize: '12px', color: 'black', boxShadow: '0 0 5px rgba(0,0,0,0.3)'
    }
};

function GameMap() {
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const gridLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const gridMetadataRef = useRef(null);
  const userLocationRef = useRef({ latitude: HARDCODED_LAT, longitude: HARDCODED_LNG });
  
  // --- REFERINTA PENTRU ABORT CONTROLLER (FIX EROARE) ---
  const abortControllerRef = useRef(null);
  // ------------------------------------------------------

  const isMPressed = useRef(false);
  const [movementMode, setMovementMode] = useState(false);

  const { gridId } = useParams(); 
  const [notification, setNotification] = useState(null);
  const userId = localStorage.getItem('user_id'); 
  const navigate = useNavigate();

  useEffect(() => {
      if (!userId) navigate('/');
  }, [userId, navigate]);

  const showMessage = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const updateCellMessage = async (row, col, newMessage) => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/update_message', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, grid_id: gridId, row, col, message: newMessage })
        });
        return res.ok;
      } catch (e) { console.error(e); return false; }
  };

  const calculateRoute = async (destinationGraphic) => {
      if (!routeLayerRef.current) return;
      
      // 1. ANULAM CEREREA ANTERIOARA DACA EXISTA (FIX EROARE)
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      // Cream un controller nou pentru cererea curenta
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      // -----------------------------------------------------

      showMessage("⏳ Calculare traseu...");

      const startLng = userLocationRef.current.longitude;
      const startLat = userLocationRef.current.latitude;
      
      let endLng = 0, endLat = 0;
      if (destinationGraphic.geometry.type === 'point') {
          endLng = destinationGraphic.geometry.longitude;
          endLat = destinationGraphic.geometry.latitude;
      } else if (Array.isArray(destinationGraphic.geometry.coordinates)) {
          endLng = destinationGraphic.geometry.coordinates[0];
          endLat = destinationGraphic.geometry.coordinates[1];
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

      try {
          // Adaugam { signal } la fetch
          const response = await fetch(osrmUrl, { signal });
          
          if (!response.ok) throw new Error("OSRM Failed");
          
          const data = await response.json();
          if (data.code !== "Ok") throw new Error("OSRM Route Not Found");

          const routeCoordinates = data.routes[0].geometry.coordinates;
          const distKm = (data.routes[0].distance / 1000).toFixed(2);
          const timeMin = Math.round(data.routes[0].duration / 60);

          drawPolyline(routeCoordinates, [50, 150, 255, 0.9]); 
          showMessage(`🚗 Traseu (OSRM): ${distKm} km (~${timeMin} min)`);

      } catch (error) {
          // --- FIX EROARE: DACA E ABORT, NU FACEM NIMIC ---
          if (error.name === 'AbortError') {
              console.log("Navigare anulată (utilizator a dat click altundeva).");
              return; 
          }
          // ------------------------------------------------

          console.warn("⚠️ Fallback to direct line:", error);
          const directPath = [[startLng, startLat], [endLng, endLat]];
          drawPolyline(directPath, [255, 50, 50, 0.8], "dash"); 
          
          const polyline = new Polyline({ paths: [directPath], spatialReference: { wkid: 4326 } });
          const dist = geometryEngine.geodesicLength(polyline, "kilometers");
          showMessage(`✈️ Rută Directă: ${dist.toFixed(2)} km`);
      }
  };

  const drawPolyline = (paths, color, style = "solid") => {
      routeLayerRef.current.removeAll();
      const polyline = new Polyline({ paths: [paths], spatialReference: { wkid: 4326 } });
      const graphic = new Graphic({
          geometry: polyline,
          symbol: { type: "simple-line", color: color, width: 4, style: style }
      });
      routeLayerRef.current.add(graphic);
  };

  const createCellGraphic = (row, col, centerLat, centerLng, cellSize, attributes) => {
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360;
    const latOffset = (row * cellSize) / metersPerLat; 
    const lngOffset = (col * cellSize) / metersPerLng;
    const halfSizeLat = (cellSize / 2) / metersPerLat;
    const halfSizeLng = (cellSize / 2) / metersPerLng;
    const cellCenterLat = centerLat + latOffset;
    const cellCenterLng = centerLng + lngOffset;

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
        symbol: { type: "simple-fill", color: [227, 139, 79, 0.6], outline: { color: [255, 255, 255], width: 1 } },
        attributes: attributes, 
        popupTemplate: {
            title: "Cell [{row}, {col}]",
            content: `<b>Status:</b> Unlocked<br><b>Time:</b> {time}<br><b>Note:</b> {msg}`,
            actions: [{ title: "Editează Notița", id: "edit-note", className: "esri-icon-edit" }]
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

    gridLayerRef.current.add(new Graphic({
        geometry: outlinePolygon,
        symbol: { type: "simple-line", color: [255, 255, 255, 0.8], width: 2, style: "dash" }
    }));
  };

  const explorePosition = async (lat, lng) => {
      try {
          const res = await fetch('http://127.0.0.1:5000/api/explore', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ lat, lng, user_id: userId, grid_id: gridId })
          });
          const data = await res.json();
          
          if(data.status === 'unlocked') {
              if (gridMetadataRef.current && gridLayerRef.current) {
                  showMessage(`🎉 Zonă nouă descoperită! (${data.row}, ${data.col})`);
                  const newGraphic = createCellGraphic(
                      data.row, data.col, 
                      gridMetadataRef.current.centerLat, gridMetadataRef.current.centerLng, 
                      gridMetadataRef.current.cellSize,
                      { row: data.row, col: data.col, msg: "Explored just now!", time: data.time }
                  );
                  gridLayerRef.current.add(newGraphic);
              }
          }
      } catch (e) { console.log("Eroare explorare", e); }
  };

  const loadUserGrid = async () => {
      try {
          const res = await fetch(`http://127.0.0.1:5000/api/grid_data/${gridId}`);
          if (!res.ok) throw new Error("Grid not found");
          const data = await res.json();
          
          if(data.has_grid && gridLayerRef.current) {
              gridMetadataRef.current = {
                  centerLat: data.center_lat, centerLng: data.center_lng,
                  cellSize: data.cell_size, dimension: data.dimension
              };
              gridLayerRef.current.removeAll(); 
              drawGridOutline(data.center_lat, data.center_lng, data.dimension, data.cell_size);
              const graphics = data.unlocked_cells.map(cell => 
                  createCellGraphic(
                      cell.row, cell.col, data.center_lat, data.center_lng, data.cell_size,
                      { row: cell.row, col: cell.col, msg: cell.msg || "Explored", time: cell.time }
                  )
              );
              gridLayerRef.current.addMany(graphics);
          }
      } catch (err) { console.error(err); showMessage("Eroare la încărcarea hărții."); }
  };

  const updateUserMarker = (lat, lng) => {
    userLocationRef.current = { latitude: lat, longitude: lng };
    if(userLayerRef.current) {
        userLayerRef.current.removeAll(); 
        userLayerRef.current.add(new Graphic({ 
            geometry: { type: "point", longitude: lng, latitude: lat }, 
            symbol: { type: "simple-marker", color: [0, 119, 255], outline: { color: "white", width: 2 } } 
        }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key.toLowerCase() === 'm') {
            isMPressed.current = true;
            setMovementMode(true); 
        }
    };
    const handleKeyUp = (e) => {
        if (e.key.toLowerCase() === 'm') {
            isMPressed.current = false;
            setMovementMode(false); 
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({ basemap: "dark-gray-vector" });
    const myPopup = new Popup({
        dockEnabled: true,
        dockOptions: { buttonEnabled: false, breakpoint: false }
    });

    const actionHandle = myPopup.on("trigger-action", (event) => {
        const selectedFeature = myPopup.selectedFeature;
        const attrs = selectedFeature.attributes;

        if (event.action.id === "edit-note") {
            const newMsg = prompt("Editează mesajul:", attrs.msg);
            if (newMsg !== null && newMsg !== attrs.msg) {
                updateCellMessage(attrs.row, attrs.col, newMsg).then(success => {
                    if (success) {
                        selectedFeature.attributes.msg = newMsg;
                        myPopup.content = `<b>Status:</b> Unlocked<br><b>Time:</b> ${attrs.time}<br><b>Note:</b> ${newMsg}`;
                    }
                });
            }
        }
        
        if (event.action.id === "navigate-route") {
            myPopup.close();
            calculateRoute(selectedFeature);
        }
    });

    const view = new MapView({
      container: mapDiv.current, map: map, center: [HARDCODED_LNG, HARDCODED_LAT], zoom: 14,
      popup: myPopup 
    });
    
    view.ui.move("zoom", "bottom-left");
    viewRef.current = view;

    const gLayer = new GraphicsLayer(); map.add(gLayer); gridLayerRef.current = gLayer;
    const rLayer = new GraphicsLayer(); map.add(rLayer); routeLayerRef.current = rLayer;
    const uLayer = new GraphicsLayer(); map.add(uLayer); userLayerRef.current = uLayer;

    const blob = new Blob([JSON.stringify(geoJsonData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const geojsonLayer = new GeoJSONLayer({
        url: url,
        copyright: "KnowYourCity Data",
        popupTemplate: {
            title: "{name}",
            content: "Tip: {type} <br> Descriere: {description}",
            actions: [{
                title: "🚗 Navighează aici",
                id: "navigate-route",
                className: "esri-icon-navigation"
            }]
        },
        renderer: {
            type: "simple",
            symbol: { type: "simple-marker", color: [0, 255, 128, 0.8], size: 10, outline: { color: "white", width: 1 } }
        }
    });
    map.add(geojsonLayer);
    
    loadUserGrid();

    view.when(() => {
        updateUserMarker(HARDCODED_LAT, HARDCODED_LNG);
        explorePosition(HARDCODED_LAT, HARDCODED_LNG);
    });

    view.on("click", (event) => {
        if (isMPressed.current) {
            event.stopPropagation();
            const lat = event.mapPoint.latitude;
            const lng = event.mapPoint.longitude;
            updateUserMarker(lat, lng); 
            explorePosition(lat, lng); 
        } 
    });

    return () => {
        if (actionHandle) actionHandle.remove();
        if (view) view.destroy();
    };
  }, [gridId]); 

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {notification && ( <div style={styles.notification}>{notification}</div> )}
      
      <button style={styles.backBtn} onClick={() => navigate('/menu')}>⬅ Back to Menu</button>
      
      <div style={styles.controls}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#e38b4f' }}>
              🎮 Controale Joc:
          </div>
          <div>👆 <b>Click Stânga:</b> Selectează / Informații</div>
          <div>🏃 <b>Ține apăsat M + Click:</b> Deplasează-te</div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#ccc' }}>
              Mod Deplasare: <span style={{ color: movementMode ? '#0f0' : '#f00', fontWeight: 'bold' }}>
                  {movementMode ? "ACTIV" : "INACTIV"}
              </span>
          </div>
      </div>

      <div style={styles.legend}>
          🟢 Repere Urbane <br/>
          🟧 Zone Explorate <br/>
          🔵 Traseu Activ
      </div>
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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map/:gridId" element={<GameMap />} />
      </Routes>
    </Router>
  );
}

export default App;