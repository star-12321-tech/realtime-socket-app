import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userProfile, setUserProfile] = useState(localStorage.getItem('user') || '');
  const [isRegistering, setIsRegistering] = useState(false);

  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [socket, setSocket] = useState(null);

  // Connection manager hook initializes only when token is active
  useEffect(() => {
    if (!token) return;

    // Send JWT token via auth handshake protocol
    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('load_history', (history) => {
      const formatted = history.map(item => ({
        user: item.username || "System",
        text: item.message_text,
        time: new Date(item.created_at).toLocaleTimeString()
      }));
      setMessageList(formatted);
    });

    newSocket.on('receive_message', (data) => {
      setMessageList((prev) => [...prev, {
        user: data.username,
        text: data.message_text,
        time: new Date(data.created_at).toLocaleTimeString()
      }]);
    });

    return () => newSocket.close();
  }, [token]);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? 'register' : 'login';
    
    try {
      const response = await fetch(`http://localhost:3001/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (data.error) return alert(data.error);

      if (isRegistering) {
        alert("Registration Complete! Switch to Login.");
        setIsRegistering(false);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', data.username);
        setToken(data.token);
        setUserProfile(data.username);
      }
    } catch (err) {
      alert("Authentication request failed.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUserProfile('');
    setMessageList([]);
    if (socket) socket.close();
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() !== '' && socket) {
      socket.emit('send_message', { text: message });
      setMessage('');
    }
  };

  /* ==========================================================================
     RENDER INTERFACE STATES
     ========================================================================== */

  if (!token) {
    return (
      <div style={{ padding: '50px', fontFamily: 'Arial', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>🔒 {isRegistering ? "Create Developer Account" : "Secure Member Login"}</h2>
        <form onSubmit={handleAuthAction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: '10px' }} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '10px' }} required />
          <button type="submit" style={{ padding: '12px', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isRegistering ? "Register Profile" : "Authenticate Session"}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#646cff', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}>
          {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>👤 Logged in as: <strong style={{ color: '#646cff' }}>{userProfile}</strong></h3>
        <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </div>
      
      <h2>⚡ Guarded Live Stream Feed</h2>
      <form onSubmit={sendMessage} style={{ display: 'flex', marginBottom: '20px' }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type encrypted live entry..." style={{ flexGrow: 1, padding: '12px', marginRight: '10px' }} />
        <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px' }}>Send</button>
      </form>
      
      <div style={{ border: '1px solid #ddd', padding: '15px', height: '250px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
        {messageList.map((msg, idx) => (
          <p key={idx} style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            <span style={{ fontSize: '12px', color: '#888', marginRight: '5px' }}>[{msg.time}]</span>
            <strong style={{ color: '#646cff' }}>{msg.user}:</strong> {msg.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
