import React, { useState, useEffect, useRef } from 'react';
import { rtdb, auth, db } from '../../firebase';
import { ref, onValue, off } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

const ECGChart = () => {
  const canvasRef = useRef(null);
  const [ecgData, setEcgData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [sampleRate, setSampleRate] = useState(250);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadDeviceId();
  }, []);

  const loadDeviceId = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'devices', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.device_id) {
          setDeviceId(data.device_id);
          setupListeners(data.device_id);
        }
      }
    } catch (error) {
      console.error('Error loading device ID:', error);
    }
  };

  const setupListeners = (deviceId) => {
    // Listen to ECG chunks
    const chunksRef = ref(rtdb, `ecg_stream/${deviceId}/chunks`);
    const statusRef = ref(rtdb, `ecg_stream/${deviceId}/status`);

    const chunksListener = onValue(chunksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.values) {
          setSampleRate(data.sampleRate || 250);
          setLastUpdate(new Date().toLocaleTimeString());
          setEcgData(prev => {
            const newData = [...prev, ...data.values];
            return newData.slice(-1000); // Keep last 1000 samples
          });
        }
      }
    });

    const statusListener = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsConnected(data.connected || false);
      }
    });

    return () => {
      off(chunksRef, 'value', chunksListener);
      off(statusRef, 'value', statusListener);
    };
  };

  useEffect(() => {
    drawECG();
  }, [ecgData]);

  const drawECG = () => {
    const canvas = canvasRef.current;
    if (!canvas || ecgData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height);

    // Draw ECG waveform
    drawWaveform(ctx, width, height);
  };

  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#0f4c3a';
    ctx.lineWidth = 1;

    // Vertical lines (time)
    const timeStep = width / 20;
    for (let x = 0; x <= width; x += timeStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines (amplitude)
    const ampStep = height / 10;
    for (let y = 0; y <= height; y += ampStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = '#0f6b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  const drawWaveform = (ctx, width, height) => {
    if (ecgData.length < 2) return;

    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const dataToShow = Math.min(ecgData.length, Math.floor(width * 2));
    const startIdx = Math.max(0, ecgData.length - dataToShow);
    
    for (let i = 0; i < dataToShow && (startIdx + i) < ecgData.length; i++) {
      const x = (i / dataToShow) * width;
      // Normalize ADC value (0-4095) to canvas height
      const normalizedValue = (ecgData[startIdx + i] - 2048) / 2048; // Center around 0
      const y = height / 2 - (normalizedValue * height / 4); // Scale to 1/4 of height

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const handleCanvasResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    drawECG();
  };

  useEffect(() => {
    const resizeHandler = () => {
      setTimeout(handleCanvasResize, 100); // Small delay to ensure parent has resized
    };
    
    handleCanvasResize();
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, []);

  // Calculate heart rate estimate (simple peak detection)
  const getHeartRate = () => {
    if (ecgData.length < sampleRate) return '--';
    
    const recentData = ecgData.slice(-sampleRate); // Last 1 second
    const threshold = Math.max(...recentData) * 0.7;
    let peaks = 0;
    
    for (let i = 1; i < recentData.length - 1; i++) {
      if (recentData[i] > threshold && 
          recentData[i] > recentData[i-1] && 
          recentData[i] > recentData[i+1]) {
        peaks++;
      }
    }
    
    return peaks * 60; // Convert to BPM (assuming 1 second of data)
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">ECG Real-time Monitor</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {sampleRate} Hz • {ecgData.length} samples
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated: {lastUpdate}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative bg-black rounded-lg p-4" style={{ height: '300px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">📱</div>
              <div className="text-white">รอการเชื่อมต่ออุปกรณ์...</div>
              <div className="text-sm mt-1 text-gray-400">Device ID: {deviceId}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">
            {isConnected ? getHeartRate() : '--'}
          </div>
          <div className="text-sm text-gray-600">Heart Rate (BPM)</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {isConnected ? '❤️' : '💔'}
          </div>
          <div className="text-sm text-gray-600">Heart Status</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {ecgData.length > 0 ? Math.round(ecgData[ecgData.length - 1]) : '--'}
          </div>
          <div className="text-sm text-gray-600">Current Value</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {sampleRate}
          </div>
          <div className="text-sm text-gray-600">Sample Rate (Hz)</div>
        </div>
      </div>
    </div>
  );
};

export default ECGChart;