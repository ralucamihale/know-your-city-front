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
// Înlocuiește funcția GameMap existentă cu aceasta:
function GameMap() {
  const mapDiv = useRef(null);
  const [viewInstance, setViewInstance] = useState(null);
  const [gridLayer, setGridLayer] = useState(null);
  const [userLayer, setUserLayer] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  
  // Starea jocului
  const [hasGrid, setHasGrid] = useState(false);
  const [loading, setLoading] = useState(false);

  // ID-ul userului (hardcodat pt demo sau luat din localStorage daca ai implementat login complet)
  // Recomandare: dupa login salveaza user_id in localStorage
  const userId = localStorage.getItem('user_id');// Schimba asta daca ai id-uri UUID in baza de date, ex: localStorage.getItem('user_id')

  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({ basemap: "dark-gray-vector" });
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [26.1025, 44.4268], 
      zoom: 15
    });

    const gLayer = new GraphicsLayer();
    map.add(gLayer);
    setGridLayer(gLayer);
    
    const uLayer = new GraphicsLayer();
    map.add(uLayer);
    setUserLayer(uLayer);

    setViewInstance(view);

    // Incarcam grid-ul existent (daca are)
    loadUserGrid();

    // Setup GPS
    if ("geolocation" in navigator) {
        const watcher = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Update User Point
                if(uLayer) {
                    uLayer.removeAll(); 
                    const point = { type: "point", longitude: longitude, latitude: latitude };
                    const markerSymbol = {
                        type: "simple-marker",
                        color: [0, 119, 255],
                        outline: { color: [255, 255, 255], width: 2 }
                    };
                    uLayer.add(new Graphic({ geometry: point, symbol: markerSymbol }));
                }

                // Auto-center (optional, sa nu fie prea agresiv)
                // view.goTo({ center: [longitude, latitude] }).catch(()=>{});

                // Incercam sa exploram doar daca avem grid
                explorePosition(latitude, longitude);
            },
            (err) => setGpsError(err.message),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    }
  }, []);

  // Functie pentru desenarea unei celule
  const drawCell = (row, col, centerLat, centerLng, cellSize) => {
    if(!gridLayer) return;

    // Calcule pentru a gasi colturile patratului relativ la centrul gridului
    // Aproximari: 
    // 1 grad lat = 111320 metri
    // 1 grad lng = 40075000 * cos(lat) / 360
    
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360;

    const latOffset = (row * cellSize) / metersPerLat; 
    const lngOffset = (col * cellSize) / metersPerLng;

    const cellCenterLat = centerLat + latOffset;
    const cellCenterLng = centerLng + lngOffset;

    // Jumatate de latura in grade (pentru a desena patratul)
    const halfSizeLat = (cellSize / 2) / metersPerLat;
    const halfSizeLng = (cellSize / 2) / metersPerLng;

    const polygon = {
        type: "polygon",
        rings: [
            [cellCenterLng - halfSizeLng, cellCenterLat - halfSizeLat], // Stanga Jos
            [cellCenterLng + halfSizeLng, cellCenterLat - halfSizeLat], // Dreapta Jos
            [cellCenterLng + halfSizeLng, cellCenterLat + halfSizeLat], // Dreapta Sus
            [cellCenterLng - halfSizeLng, cellCenterLat + halfSizeLat], // Stanga Sus
            [cellCenterLng - halfSizeLng, cellCenterLat - halfSizeLat]  // Inchidere
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
    
    // Verificam sa nu desenam dubluri (simplist)
    // In productie se folosesc ID-uri pe grafice
    gridLayer.add(graphic);
  };

  const drawGridOutline = (centerLat, centerLng, dimension, cellSize) => {
    if(!gridLayer) return;

    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(centerLat * Math.PI / 180) / 360;

    // Calculăm dimensiunea totală în grade
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
            type: "simple-line",  // Doar linie, fără umplere
            color: [255, 255, 255, 0.8], // Alb
            width: 2,
            style: "dash" // Linie punctată
        }
    });

    gridLayer.add(outlineGraphic);
  };

  const loadUserGrid = async () => {
      try {
          const res = await fetch(`http://127.0.0.1:5000/api/grid_by_user/${userId}`);
          const data = await res.json();
          
          if(data.has_grid && gridLayer) {
              setHasGrid(true);
              gridLayer.removeAll(); // Curățăm tot
              
              // 1. Mutăm camera
              if(viewInstance) {
                  // Nu dăm zoom prea mare ca să vedem tot gridul
                  viewInstance.goTo({ center: [data.center_lng, data.center_lat], zoom: 14 });
              }

              // 2. Desenăm CONTURUL (Nou)
              drawGridOutline(data.center_lat, data.center_lng, data.dimension, data.cell_size);

              // 3. Desenăm celulele DEBLOCATE
              data.unlocked_cells.forEach(cell => {
                  drawCell(cell.row, cell.col, data.center_lat, data.center_lng, data.cell_size);
              });
          } else {
              setHasGrid(false);
          }
      } catch (err) {
          console.error("Err loading grid", err);
      }
  };

  const createNewGrid = () => {
      if(!navigator.geolocation) {
          alert("GPS nedisponibil");
          return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          
          try {
              const res = await fetch('http://127.0.0.1:5000/api/create_grid', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                      user_id: userId,
                      lat: latitude,
                      lng: longitude
                  })
              });
              
              if(res.ok) {
                  alert("Grid generat cu succes! Incepe explorarea.");
                  loadUserGrid(); // Reincarcam gridul ca sa actualizam starea
              } else {
                  alert("Eroare la server.");
              }
          } catch(e) {
              alert("Eroare conexiune.");
          } finally {
              setLoading(false);
          }
      }, (err) => {
          alert("Nu am putut lua locatia: " + err.message);
          setLoading(false);
      });
  };

  const explorePosition = async (lat, lng) => {
      // Trimitem constant locatia, backend-ul decide daca deblocheaza ceva
      try {
          const res = await fetch('http://127.0.0.1:5000/api/explore', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ lat, lng, user_id: userId })
          });
          const data = await res.json();
          
          if(data.status === 'unlocked') {
              // Daca am deblocat ceva nou, reincarcam tot gridul (sau am putea desena doar celula noua)
              // Pentru siguranta coordonatelor, reincarcam gridul
              loadUserGrid();
          }
      } catch (e) {
          console.log("Ping explore failed");
      }
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* Mesaj eroare GPS */}
      {gpsError && <div style={{position:'absolute', top:10, left:10, background:'red', color:'white', padding:5, zIndex:99}}>{gpsError}</div>}
      
      {/* BUTONUL DE CREARE GRID */}
      <div style={{
          position: 'absolute', 
          bottom: '30px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 80,
          display: 'flex',
          gap: '10px'
      }}>
          {!hasGrid && (
              <button 
                onClick={createNewGrid} 
                disabled={loading}
                style={{
                    padding: '15px 30px', 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    backgroundColor: '#e38b4f', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '30px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                }}
              >
                  {loading ? "Se generează..." : "📍 Începe Jocul Aici"}
              </button>
          )}

          {hasGrid && (
              <button 
                onClick={createNewGrid} 
                style={{
                    padding: '10px 20px', 
                    fontSize: '14px', 
                    backgroundColor: '#333', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '20px',
                    cursor: 'pointer',
                    opacity: 0.8
                }}
              >
                  🔄 Regenerează Grid (Reset)
              </button>
          )}
      </div>

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