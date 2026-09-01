import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// 📋 Strict Type Contracts for Data Contracts
interface UserProfile {
  id: number;
  username: string;
}

interface ChatMessage {
  userId: string;
  text: string;
  timestamp?: string;
}

// Initialize persistent Socket link pointing to your Express backend port
const socket: Socket = io('http://192.168.1.51:5050');

const App: React.FC = () => {
  // --- Authentication UI State Ecosystem ---
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  
  // Clean Hydration Check: Immediately check local browser cache for user status on initialization
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('app_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // --- Real-Time Chat UI State Ecosystem ---
  const [messageText, setMessageText] = useState<string>('');
  
  // Clean History Hydration: Pull messages from local storage cache so Window B is persistent on boot
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const savedHistory = localStorage.getItem('chat_history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // Lifecycle Hook 1: Manage Real-Time Web-Socket Broadcast Pipes
  useEffect(() => {
    socket.on('message:broadcast', (message: ChatMessage) => {
      console.log("📡 Client Received Live Event Payload:", message);
      setChatHistory((prevHistory) => [...prevHistory, message]);
    });

    return () => {
      socket.off('message:broadcast');
    };
  }, []); 

  // Lifecycle Hook 2: Database History Hydration (Triggers instantly upon login verification)
  useEffect(() => {
    const fetchRecentHistory = async () => {
      if (!currentUser) return; // Halt execution if the user is unauthenticated

      try {
        const response = await fetch('http://localhost:5050/api/messages/recent', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Industry standard token verification pass
          }
        });

        if (!response.ok) throw new Error('Database history synchronization drop.');
        
        const pastMessages: ChatMessage[] = await response.json();
        setChatHistory(pastMessages); // Seamlessly populate your chat frame container on screen
      } catch (err: any) {
        console.error('⚠️ Could not hydrate recent context history from server:', err.message);
      }
    };

    fetchRecentHistory();
  }, [currentUser]); // React watches this value; updates the viewport text strings instantly when login resolves successfully


  // --- Identity Network Event Controllers ---
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setAuthError('');

    if (!username.trim() || !password.trim()) {
      setAuthError('Please fill out all mandatory credentials.');
      return;
    }

    const targetEndpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await fetch(`http://localhost:5050${targetEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Network transaction fault occurred.');
      }

      if (isRegistering) {
        alert('Account provisioned successfully! Proceeding to login phase.');
        setIsRegistering(false); 
        setPassword('');
      } else {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('app_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication processing error.');
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('app_user');
    localStorage.removeItem('chat_history'); // Wipe messages cache on clean exit
    setCurrentUser(null);
    setChatHistory([]);
  };

  // --- Chat Stream Transmission Controllers ---
  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser) return;

    const payload: ChatMessage = {
      userId: currentUser.username, 
      text: messageText
    };

    socket.emit('message:send', payload);
    setMessageText('');
  };

  // --- Conditional UI Render Blocks ---
  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🔒 {isRegistering ? 'Create Account' : 'Secure Application Login'}</h2>
        {authError && <div style={{ color: 'red', marginBottom: '10px' }}>{authError}</div>}
        
        <form onSubmit={handleAuthSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isRegistering ? 'Register Enterprise Account' : 'Authenticate Console'}
          </button>
        </form>

        <button 
          onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} 
          style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isRegistering ? 'Already have a profile workspace? Sign In' : "Don't have a profile? Register Here"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '800px', margin: '5px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>💬 Real-Time Control Terminal</h2>
        <button onClick={handleLogout} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </div>
      <p>Authenticated workspace owner: <strong>{currentUser?.username}</strong></p>

      <div style={{ border: '1px solid #ccc', height: '800px', overflowY: 'scroll', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
        {chatHistory.map((msg, idx) => (
          <div key={idx} style={{ margin: '8px 0', paddingBottom: '5px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#007bff', fontWeight: 'bold' }}>{msg.userId}:</span> {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleChatSubmit} style={{ display: 'flex' }}>
        <input 
          type="text" 
          value={messageText} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)} 
          placeholder="Transmit runtime string event payload..." 
          style={{ flexGrow: 1, padding: '10px', borderRadius: '4px 0 0 4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>Emit</button>
      </form>
    </div>
  );
};

export default App;
