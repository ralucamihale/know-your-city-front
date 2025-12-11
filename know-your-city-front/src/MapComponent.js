import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import '@arcgis/core/assets/esri/themes/light/main.css'; // Import ArcGIS CSS

const MapComponent = () => {
  const mapDiv = useRef(null);

  useEffect(() => {
    if (mapDiv.current) {
      // Initialize the Map
      const map = new Map({
        basemap: "streets-navigation-vector" // Basemap service
      });

      // Initialize the MapView
      const view = new MapView({
        container: mapDiv.current,
        map: map,
        center: [26.1025, 44.4350], // Longitude, Latitude (Bucharest)
        zoom: 13, // Initial zoom level for the area of interest
        constraints: {
          minZoom: 10, // Prevent zooming out too far
          rotationEnabled: false // Keep map oriented North-up
        }
      });

      // Clean up on unmount
      return () => {
        if (view) {
          view.destroy();
        }
      };
    }
  }, []);

  return (
    <div 
      ref={mapDiv} 
      className="map-container" 
      style={{ height: '100%', width: '100%' }} // Inline style or move to CSS
    />
  );
};

export default MapComponent;