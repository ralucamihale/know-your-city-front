import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://127.0.0.1:5000/api/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Eroare stats:", err));
    }, []);

    if (!stats) return <div style={{ padding: '50px', color: 'white', textAlign: 'center' }}>⏳ Se încarcă statisticile...</div>;

    const cardStyle = {
        background: '#333', padding: '20px', borderRadius: '10px',
        width: '200px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        border: '1px solid #444'
    };

    const numberStyle = { fontSize: '32px', fontWeight: 'bold', color: '#e38b4f', margin: '10px 0' };

    return (
        <div style={{ minHeight: '100vh', background: '#1e1e1e', color: 'white', padding: '30px' }}>
            <button 
                onClick={() => navigate('/menu')}
                style={{ padding: '10px 20px', background: '#444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}
            >
                ⬅ Înapoi la Meniu
            </button>

            <h1 style={{ borderBottom: '2px solid #e38b4f', paddingBottom: '10px', marginBottom: '30px' }}>
                📊 Statistici KnowYourCity
            </h1>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '50px' }}>
                <div style={cardStyle}>
                    <h3>🙋 Utilizatori</h3>
                    <div style={numberStyle}>{stats.total_users}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Total înregistrați</div>
                </div>
                <div style={cardStyle}>
                    <h3>🗺️ Hărți</h3>
                    <div style={numberStyle}>{stats.total_grids}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Jocuri create</div>
                </div>
                <div style={cardStyle}>
                    <h3>🟧 Zone</h3>
                    <div style={numberStyle}>{stats.total_cells}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Km² explorați</div>
                </div>
            </div>

            <div style={{ background: '#2c2c2c', padding: '30px', borderRadius: '15px', maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>📈 Activitate (7 Zile)</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={stats.chart_data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="date" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} itemStyle={{ color: '#e38b4f' }} />
                            <Legend />
                            <Bar dataKey="explored" name="Zone Deblocate" fill="#e38b4f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;