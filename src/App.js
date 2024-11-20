import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { io } from 'socket.io-client';

// Connect to the live socket.io server hosted on Vercel
const socket = io('https://videoback-1.onrender.com');

// Your PeerJS server URL and path, updated to the live backend
const peer = new Peer(undefined, { 
  path: '/peerjs', 
  host: 'https://videoback-1.onrender.com', 
  port: 443, // Use 443 for HTTPS
  secure: true // Ensure the connection is secure for production
});

const App = () => {
  const [peerId, setPeerId] = useState('');
  const [otherPeerId, setOtherPeerId] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  
  const userVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  
  const [userStream, setUserStream] = useState(null);

  // Initialize user's video stream
  useEffect(() => {
    // Get user's media (audio and video)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setUserStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        // Listen for incoming calls
        peer.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (partnerStream) => {
            if (partnerVideoRef.current) {
              partnerVideoRef.current.srcObject = partnerStream;
            }
          });
        });
      })
      .catch((err) => console.error('Failed to get media:', err));

    // Handle peer ID generation
    peer.on('open', (id) => {
      setPeerId(id);
    });

    // Handle socket signaling for offer, answer, and ice-candidate
    socket.on('offer', (offer) => {
      console.log('Offer received:', offer);
      const call = peer.call(offer.peerId, userStream); // use the user's stream here
      call.on('stream', (partnerStream) => {
        if (partnerVideoRef.current) {
          partnerVideoRef.current.srcObject = partnerStream;
        }
      });
    });

    socket.on('answer', (answer) => {
      // Handle answer from the other peer (optional)
      // This will typically be handled by the `call` event on PeerJS, but you can extend it here.
    });

    socket.on('ice-candidate', (candidate) => {
      // Handle ICE candidates for NAT traversal (optional)
      if (candidate) {
        peer.signal(candidate);
      }
    });

  }, [userStream]);

  // Make a video call to another peer
  const makeCall = () => {
    const call = peer.call(otherPeerId, userStream); // use the user's stream here
    call.on('stream', (partnerStream) => {
      if (partnerVideoRef.current) {
        partnerVideoRef.current.srcObject = partnerStream;
      }
    });

    // Listen for ICE candidates and send them via Socket.io
    peer.on('signal', (signalData) => {
      if (signalData.type === 'offer') {
        socket.emit('offer', { peerId: otherPeerId, offer: signalData });
      } else if (signalData.type === 'answer') {
        socket.emit('answer', { peerId: otherPeerId, answer: signalData });
      } else if (signalData.type === 'candidate') {
        socket.emit('ice-candidate', { peerId: otherPeerId, candidate: signalData });
      }
    });

    setIsCallActive(true);
  };

  return (
    <div>
      <h1>Video Call App</h1>
      <div>
        <h2>Your Peer ID: {peerId}</h2>
        <input
          type="text"
          value={otherPeerId}
          onChange={(e) => setOtherPeerId(e.target.value)}
          placeholder="Enter other peer ID"
        />
        <button onClick={makeCall} disabled={isCallActive}>Make Call</button>
      </div>
      
      <div>
        <video ref={userVideoRef} autoPlay muted style={{ width: '300px' }} />
        <video ref={partnerVideoRef} autoPlay style={{ width: '300px' }} />
      </div>
    </div>
  );
};

export default App;
