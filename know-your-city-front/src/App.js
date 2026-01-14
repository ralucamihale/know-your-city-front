import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Login from './Login';
import Register from './Register';
import './App.css';

// --- STILURI CSS IN-LINE PENTRU SIMPLITATE ---
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
        pointerEvents: 'none', // Să poți da click prin el pe hartă
        transition: 'opacity 0.3s ease-in-out',
    },
    btnContainer: {
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        gap: '10px'
    },
    mainBtn: {
        padding: '15px 30px',
        fontSize: '18px',
        fontWeight: 'bold',
        backgroundColor: '#e38b4f',
        color: 'white',
        border: 'none',
        borderRadius: '30px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: 'pointer'
    },
    resetBtn: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 'bold',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        cursor: 'pointer'
    }
};

function GameMap() {
  const mapDiv = useRef(null);
  
  // Refs pentru acces instant în evenimente
  const viewRef = useRef(null);
  const gridLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const gridMetadataRef = useRef(null);

  const [notification, setNotification] = useState(null); // Mesajul de pe ecran
  const [hasGrid, setHasGrid] = useState(false);
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem('user_id'); 
  const navigate = useNavigate();

  useEffect(() => {
      if (!userId) {
          showMessage("Trebuie să te autentifici!", "error");
          navigate('/');
      }
  }, [userId, navigate]);

  // --- 1. SISTEM DE MESAJE (TOAST) ---
  const showMessage = (msg, type = "info") => {
      // Putem schimba culoarea în funcție de tip (opțional)
      setNotification(msg);
      // Mesajul dispare singur după 3 secunde
      setTimeout(() => {
          setNotification(null);
      }, 3000);
  };

  // --- FUNCTII AUXILIARE ---
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

  // --- LOGICA DE EXPLORARE ---
  const explorePosition = async (lat, lng) => {
      try {
          const res = await fetch('http://127.0.0.1:5000/api/explore', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ lat, lng, user_id: userId })
          });
          const data = await res.json();
          
          if(data.status === 'unlocked') {
              if (gridMetadataRef.current && gridLayerRef.current) {
                  // Afișăm mesaj pe ecran
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
          } else if (data.status === 'already_visited') {
              // Opțional: Poți scoate linia asta dacă te enervează mesajele prea dese
              // showMessage("Deja vizitat...");
          }
      } catch (e) {
          console.log("Eroare explorare", e);
      }
  };

  const loadUserGrid = async () => {
      try {
          const res = await fetch(`http://127.0.0.1:5000/api/grid_by_user/${userId}`);
          const data = await res.json();
          
          if(data.has_grid && gridLayerRef.current) {
              setHasGrid(true);
              
              gridMetadataRef.current = {
                  centerLat: data.center_lat,
                  centerLng: data.center_lng,
                  cellSize: data.cell_size,
                  dimension: data.dimension
              };

              gridLayerRef.current.removeAll(); 
              
              // --- FIX: Așteptăm ca view-ul să fie gata înainte de goTo ---
              if(viewRef.current) {
                  viewRef.current.when(() => {
                      viewRef.current.goTo({ center: [data.center_lng, data.center_lat], zoom: 15 })
                        .catch(err => {
                             // Ignorăm erorile de întrerupere a animației
                             if (err.name !== "AbortError") console.log(err);
                        });
                  });
              }
              // -----------------------------------------------------------

              drawGridOutline(data.center_lat, data.center_lng, data.dimension, data.cell_size);

              const graphics = data.unlocked_cells.map(cell => 
                  createCellGraphic(cell.row, cell.col, data.center_lat, data.center_lng, data.cell_size)
              );
              gridLayerRef.current.addMany(graphics);

          } else {
              setHasGrid(false);
          }
      } catch (err) {
          console.error("Err loading grid", err);
      }
  };

  // --- 2. REPARARE BUTON RESET ---
  const createNewGrid = () => {
      if(!navigator.geolocation) { 
          showMessage("GPS nedisponibil!", "error"); 
          return; 
      }
      
      setLoading(true);
      showMessage("Se calculează poziția GPS...");

      // Curățăm harta vizual IMEDIAT ca să vezi că s-a dat reset
      if(gridLayerRef.current) {
          gridLayerRef.current.removeAll();
          setHasGrid(false); 
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          
          showMessage("Se generează grid-ul..."); // Feedback vizual

          try {
              const res = await fetch('http://127.0.0.1:5000/api/create_grid', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                      user_id: userId,
                      lat: latitude,
                      lng: longitude,
                      force_reset: true // Forțăm ștergerea celui vechi
                  })
              });
              
              if(res.ok) {
                  showMessage("✅ Grid generat cu succes!");
                  loadUserGrid();
              } else {
                  showMessage("Eroare la server.", "error");
              }
          } catch(e) {
              showMessage("Eroare de rețea.", "error");
          } finally {
              setLoading(false);
          }
      }, (err) => {
          setLoading(false);
          showMessage("Eroare GPS: " + err.message, "error");
      });
  };

  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({ basemap: "dark-gray-vector" });
    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [26.1025, 44.4268], 
      zoom: 15
    });

    viewRef.current = view;

    const gLayer = new GraphicsLayer();
    map.add(gLayer);
    gridLayerRef.current = gLayer;
    
    const uLayer = new GraphicsLayer();
    map.add(uLayer);
    userLayerRef.current = uLayer;

    loadUserGrid();

    // CLICK LISTENER (TELEPORT)
    view.on("click", (event) => {
        const lat = event.mapPoint.latitude;
        const lng = event.mapPoint.longitude;

        if(userLayerRef.current) {
            userLayerRef.current.removeAll();
            const point = { type: "point", longitude: lng, latitude: lat };
            const markerSymbol = {
                type: "simple-marker",
                color: [0, 255, 0], 
                outline: { color: [255, 255, 255], width: 2 }
            };
            userLayerRef.current.add(new Graphic({ geometry: point, symbol: markerSymbol }));
        }
        
        explorePosition(lat, lng);
    });

    if ("geolocation" in navigator) {
        const watcher = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                if(userLayerRef.current) {
                    userLayerRef.current.removeAll(); 
                    const point = { type: "point", longitude: longitude, latitude: latitude };
                    const markerSymbol = {
                        type: "simple-marker",
                        color: [0, 119, 255],
                        outline: { color: [255, 255, 255], width: 2 }
                    };
                    userLayerRef.current.add(new Graphic({ geometry: point, symbol: markerSymbol }));
                }
            },
            (err) => console.log(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watcher);
    }
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      
      {/* COMPONENTA DE NOTIFICARE (Toast) */}
      {notification && (
          <div style={styles.notification}>
              {notification}
          </div>
      )}
      
      {/* BUTOANELE */}
      <div style={styles.btnContainer}>
          {!hasGrid && (
              <button onClick={createNewGrid} disabled={loading} style={styles.mainBtn}>
                  {loading ? "Se lucrează..." : "📍 Începe Jocul Aici"}
              </button>
          )}

          {hasGrid && (
              <button onClick={createNewGrid} disabled={loading} style={styles.resetBtn}>
                  {loading ? "Regenerare..." : "🔄 Mută Grid-ul Aici (Reset)"}
              </button>
          )}
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
        <Route path="/map" element={<GameMap />} />
      </Routes>
    </Router>
  );
}

export default App;