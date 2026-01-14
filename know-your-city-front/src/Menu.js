import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function Menu() {
    const [grids, setGrids] = useState([]);
    const [loading, setLoading] = useState(false);
    const userId = localStorage.getItem('user_id');
    const navigate = useNavigate();

    // 1. Define loadGrids FIRST so it is available everywhere
    const loadGrids = useCallback(async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/user_grids/${userId}`);
            const data = await res.json();
            setGrids(data);
        } catch (err) {
            console.error(err);
        }
    }, [userId]);

    // 2. Use it in useEffect
    useEffect(() => {
        loadGrids();
    }, [loadGrids]);

    // 3. Define other handlers
    const handleSelectGrid = (gridId) => {
        navigate(`/map/${gridId}`);
    };

    const handleCreateGrid = () => {
        if (!navigator.geolocation) {
            alert("GPS not available");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            try {
                const res = await fetch('http://127.0.0.1:5000/api/create_grid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        lat: latitude,
                        lng: longitude
                    })
                });

                if (res.ok) {
                    await loadGrids(); // This works now
                } else {
                    const data = await res.json();
                    alert(data.message || "Error creating grid");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        });
    };

    const handleDelete = async (e, gridId) => {
        e.stopPropagation(); 
        
        if(!window.confirm("Are you sure you want to delete this grid? Progress will be lost.")) {
            return;
        }
    
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/delete_grid/${gridId}`, {
                method: 'DELETE'
            });
            if(res.ok) {
                loadGrids(); // This works now
            } else {
                alert("Could not delete grid.");
            }
        } catch(err) {
            console.error(err);
        }
    };

    return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#282c34', minHeight: '100vh', color: 'white' }}>
            <h2>🗺️ Your Missions ({grids.length}/3)</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '30px auto' }}>
                {grids.length === 0 && <p>No active grids found. Start a new one!</p>}
                
                {grids.map(grid => (
                    <div key={grid.id} 
                        onClick={() => handleSelectGrid(grid.id)}
                        style={{ 
                            padding: '15px', 
                            border: '1px solid #444', 
                            borderRadius: '8px',
                            background: '#333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#3c3c3c'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#333'}
                    >
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{grid.name}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>Created: {grid.created_at}</div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSelectGrid(grid.id); }}
                                style={{ padding: '8px 16px', background: '#e38b4f', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                            >
                                Play ▶
                            </button>
                            
                            <button 
                                onClick={(e) => handleDelete(e, grid.id)}
                                style={{ 
                                    padding: '8px 12px', 
                                    background: '#dc3545', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    color: 'white', 
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {grids.length < 3 ? (
                <button 
                    onClick={handleCreateGrid} 
                    disabled={loading}
                    style={{ 
                        marginTop: '20px',
                        padding: '15px 30px', 
                        fontSize: '16px', 
                        background: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '30px',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? "Generating..." : "➕ Start New Grid"}
                </button>
            ) : (
                <div style={{ marginTop: '20px', padding: '15px', color: '#aaa', fontStyle: 'italic' }}>
                    Maximum grid limit reached. Delete a grid to start a new one.
                </div>
            )}
        </div>
    );
}

export default Menu;