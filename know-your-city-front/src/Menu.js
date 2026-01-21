import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function Menu() {
    // Standard User State
    const [grids, setGrids] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Admin State
    const [adminGrids, setAdminGrids] = useState([]);
    const [showAdminPanel, setShowAdminPanel] = useState(false); // Toggle visibility
    
    // Auth Data
    const userId = localStorage.getItem('user_id');
    const isAdmin = localStorage.getItem('is_admin') === 'true'; // Check the flag stored in Login.js
    
    const navigate = useNavigate();

    // 1. Load User's Personal Grids
    const loadGrids = useCallback(async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/user_grids/${userId}`);
            const data = await res.json();
            setGrids(data);
        } catch (err) {
            console.error(err);
        }
    }, [userId]);

    // 2. Load ALL Grids (Admin Only)
    const loadAdminGrids = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/admin/all_grids`);
            const data = await res.json();
            setAdminGrids(data);
            setShowAdminPanel(true);
        } catch (err) {
            console.error("Admin fetch error:", err);
            alert("Could not load global grids. Are you sure you are an admin?");
        }
    };

    useEffect(() => {
        loadGrids();
    }, [loadGrids]);

    // 3. Handlers
    const handleSelectGrid = (gridId) => {
        navigate(`/map/${gridId}`);
    };

    const handleCreateGrid = () => {
        // --- HARDCODED LOCATION FOR TESTING ---
        const latitude = 44.4363421207524;
        const longitude = 26.047860301820446;

        setLoading(true);

        const create = async () => {
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
                    await loadGrids();
                } else {
                    const data = await res.json();
                    alert(data.message || "Error creating grid");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        create();
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
                loadGrids(); 
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
            
            {/* --- STANDARD USER GRID LIST --- */}
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

            {/* CREATE BUTTON */}
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

            {/* --- ADMIN SECTION (Visible only if is_admin is true) --- */}
            {isAdmin && (
                <div style={{ marginTop: '60px', borderTop: '2px dashed #666', paddingTop: '30px' }}>
                    <h2 style={{ color: '#ffc107', textShadow: '0px 0px 10px rgba(255, 193, 7, 0.5)' }}>
                        👮 Admin Overwatch
                    </h2>
                    
                    {!showAdminPanel ? (
                        <button 
                            onClick={loadAdminGrids}
                            style={{ padding: '10px 20px', background: '#444', color: '#fff', border: '1px solid #777', cursor: 'pointer', borderRadius: '5px' }}
                        >
                            Load All Global Grids
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            {adminGrids.map(g => (
                                <div key={g.id} 
                                    onClick={() => handleSelectGrid(g.id)}
                                    style={{ 
                                        width: '200px',
                                        padding: '10px', 
                                        background: '#222', 
                                        border: '1px solid #ffc107', 
                                        borderRadius: '5px',
                                        textAlign: 'left',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', color: '#ffc107', fontSize: '14px' }}>{g.name}</div>
                                    <div style={{ fontSize: '11px', color: '#ccc' }}>Grid ID: {g.id}</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>{g.created_at}</div>
                                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#aaa' }}>Click to Spectate 👁️</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Menu;