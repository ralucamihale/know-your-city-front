import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (response.ok) {
        alert("Cont creat! Acum te poți autentifica.");
        navigate('/');
    } else {
        alert("Eroare la înregistrare.");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Înregistrare</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', width: '300px', margin: 'auto' }}>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={{ padding: '10px', marginBottom: '10px' }}/>
        <input type="password" placeholder="Parola" onChange={e => setPassword(e.target.value)} style={{ padding: '10px', marginBottom: '10px' }}/>
        <button type="submit" style={{ padding: '10px', background: '#333', color: 'white', border: 'none' }}>Creează cont</button>
      </form>
    </div>
  );
}

export default Register;