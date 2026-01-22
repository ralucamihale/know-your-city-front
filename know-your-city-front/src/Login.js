import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (response.ok) {
        // --- FIX: Salvam token, user_id, SI statusul de admin ---
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        
        // Convertim boolean-ul primit in string pentru localStorage
        localStorage.setItem('is_admin', data.is_admin); 
        // -------------------------------------------------------
        
        navigate('/menu');
      } else {
        alert("Eroare: " + data.message);
      }
    } catch (err) {
      alert("Nu s-a putut conecta la server.");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Autentificare KnowYourCity</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', margin: 'auto' }}>
        <input 
          type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} 
          style={{ padding: '10px', marginBottom: '10px' }}
        />
        <input 
          type="password" placeholder="Parola" value={password} onChange={e => setPassword(e.target.value)} 
          style={{ padding: '10px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#e38b4f', color: 'white', border: 'none' }}>
          Intră în joc
        </button>
      </form>
      <p>Nu ai cont? <a href="/register">Înregistrează-te</a></p>
    </div>
  );
}

export default Login;