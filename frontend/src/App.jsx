import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);

  useEffect(() => {
    // Catch original MySQL entries on boot
    socket.on('load_history', (history) => {
      const formatted = history.map(item => ({
        text: item.message_text,
        time: new Date(item.created_at).toLocaleTimeString()
      }));
      setMessageList(formatted);
    });

    // Catch real-time updates
    socket.on('receive_message', (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    return () => {
      socket.off('load_history');
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() !== '') {
      socket.emit('send_message', { text: message });
      setMessage(''); 
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h2>⚡ Live MySQL Stream Feed</h2>
      <form onSubmit={sendMessage} style={{ display: 'flex', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type persistent text entry..."
          style={{ flexGrow: 1, padding: '12px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Send
        </button>
      </form>
      <div style={{ border: '1px solid #ddd', padding: '15px', height: '250px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
        {messageList.map((msg, idx) => (
          <p key={idx} style={{ margin: '5px 0' }}>
            <strong>[{msg.time}]</strong> {msg.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
