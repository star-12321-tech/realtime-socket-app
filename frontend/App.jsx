import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Connect directly to the Node.js server URL
const socket = io('http://localhost:3001');

function App() {
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);

  useEffect(() => {
    // Listen for incoming messages from the backend server
    socket.on('receive_message', (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    // Clean up connection listeners when component unmounts to prevent memory leaks
    return () => {
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() !== '') {
      // Emit the message payload to the server
      socket.emit('send_message', { text: message, time: new Date().toLocaleTimeString() });
      setMessage(''); // Clear input box
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>⚡ Live WebSocket Stream</h2>
      
      <form onSubmit={sendMessage}>
        <input 
          type="text" 
          placeholder="Type live feed text..." 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '8px 15px' }}>Send Live</button>
      </form>

      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '10px', height: '200px', overflowY: 'auto' }}>
        <h4>Incoming Stream Feed:</h4>
        {messageList.map((msg, index) => (
          <p key={index} style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>[{msg.time}]</strong> {msg.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
