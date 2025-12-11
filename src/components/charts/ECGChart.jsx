import React, { useRef, useEffect, useState } from 'react';

const ECGChart = ({ width = 800, height = 400, showGrid = true }) => {
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [ecgData, setEcgData] = useState([]);
  const [status, setStatus] = useState({ connected: false, heart_rate: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // ฟังก์ชันสร้างข้อมูล ECG จำลอง
  const generateMockECGData = () => {
    const data = [];
    const heartRate = 75;
    const sampleRate = 250; // 250 Hz
    const totalSamples = 1000;
    
    for (let i = 0; i < totalSamples; i++) {
      const time = i / sampleRate;
      const beatDuration = 60 / heartRate;
      const timeInBeat = (time % beatDuration) / beatDuration;
      
      let amplitude = 0;
      if (timeInBeat < 0.1) {
        // P wave
        amplitude = 0.3 * Math.sin(timeInBeat * 10 * Math.PI);
      } else if (timeInBeat < 0.2) {
        amplitude = 0;
      } else if (timeInBeat < 0.3) {
        // QRS complex
        if (timeInBeat < 0.25) {
          amplitude = -0.4; // Q wave
        } else if (timeInBeat < 0.28) {
          amplitude = 1.2; // R wave
        } else {
          amplitude = -0.6; // S wave
        }
      } else if (timeInBeat < 0.4) {
        amplitude = 0;
      } else if (timeInBeat < 0.7) {
        // T wave
        amplitude = 0.5 * Math.sin((timeInBeat - 0.4) * 10 * Math.PI);
      }
      
      // เพิ่ม noise เล็กน้อย
      amplitude += (Math.random() - 0.5) * 0.05;
      
      data.push({
        x: i * 4, // 4ms per sample
        y: amplitude,
        timestamp: Date.now() + i,
        heartRate: heartRate
      });
    }
    
    return data;
  };

  // เพิ่มข้อมูลจำลองเริ่มต้น
  useEffect(() => {
    const initialData = generateMockECGData();
    setEcgData(initialData);
    setStatus({ connected: false, heart_rate: 75 });
    setLastUpdate(new Date());
  }, []);

  // ดึงข้อมูลจาก Firebase Realtime Database
  useEffect(() => {
    const fetchECGData = async () => {
      try {
        // ดึงข้อมูล status
        const statusResponse = await fetch(
          'https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/ECG_004/status.json'
        );
        const statusData = await statusResponse.json();
        
        console.log('Status data:', statusData); // Debug log
        
        if (statusData) {
          setStatus(statusData);
        }

        // ดึงข้อมูล ECG analysis (ล่าสุด 10 รายการ)
        const ecgResponse = await fetch(
          'https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/ECG_004/ecg_data.json'
        );
        const ecgAnalysisData = await ecgResponse.json();
        
        console.log('ECG Analysis data:', ecgAnalysisData); // Debug log
        
        if (ecgAnalysisData && Object.keys(ecgAnalysisData).length > 0) {
          // แปลงข้อมูล ECG analysis เป็นจุดข้อมูลสำหรับกราฟ
          const dataPoints = Object.entries(ecgAnalysisData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a)) // เรียงตาม timestamp ใหม่สุด
            .slice(0, 100) // เอา 100 จุดล่าสุด
            .map(([timestamp, data], index) => ({
              x: index * 4, // จำลองเวลา (4ms ต่อจุด)
              y: generateECGWaveform(data, index), // สร้างคลื่น ECG จากข้อมูล analysis
              timestamp: parseInt(timestamp),
              heartRate: data.heart_rate || 75
            }));

          console.log('Generated data points:', dataPoints.length, dataPoints.slice(0, 5)); // Debug log
          setEcgData(dataPoints);
          setLastUpdate(new Date());
        } else {
          // ถ้าไม่มีข้อมูลจาก Firebase ให้สร้างข้อมูลจำลอง
          console.log('No ECG data found, generating mock data');
          const mockData = generateMockECGData();
          setEcgData(mockData);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching ECG data:', error);
        setStatus({ connected: false, heart_rate: 0 });
        // สร้างข้อมูลจำลองเมื่อเกิด error
        const mockData = generateMockECGData();
        setEcgData(mockData);
      }
    };

    // ดึงข้อมูลครั้งแรก
    fetchECGData();

    // ตั้ง interval ดึงข้อมูลทุก 2 วินาที
    const interval = setInterval(fetchECGData, 2000);

    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันสร้างคลื่น ECG จากข้อมูล analysis
  const generateECGWaveform = (analysisData, index) => {
    if (!analysisData) {
      console.log('No analysis data for index:', index);
      return 0;
    }
    
    // สร้างคลื่น ECG ตาม analysis data
    const { p_wave_amplitude = 0.3, qrs_amplitude = 1.2, t_wave_amplitude = 0.8, heart_rate = 75 } = analysisData;
    
    // คำนวณตำแหน่งในคลื่นหัวใจ (0-1)
    const cycleLength = 60000 / heart_rate; // ความยาวของ 1 cycle ในมิลลิวินาที
    const timeInCycle = (index * 4) % cycleLength;
    const normalizedTime = timeInCycle / cycleLength;
    
    // สร้างคลื่น ECG แบบจำลอง
    let amplitude = 0;
    
    if (normalizedTime < 0.1) {
      // P wave
      amplitude = p_wave_amplitude * Math.sin(normalizedTime * 10 * Math.PI);
    } else if (normalizedTime < 0.2) {
      // Baseline
      amplitude = 0;
    } else if (normalizedTime < 0.3) {
      // QRS complex
      if (normalizedTime < 0.25) {
        amplitude = -qrs_amplitude * 0.3; // Q wave
      } else if (normalizedTime < 0.28) {
        amplitude = qrs_amplitude; // R wave
      } else {
        amplitude = -qrs_amplitude * 0.5; // S wave
      }
    } else if (normalizedTime < 0.4) {
      // Baseline
      amplitude = 0;
    } else if (normalizedTime < 0.7) {
      // T wave
      amplitude = t_wave_amplitude * Math.sin((normalizedTime - 0.4) * 10 * Math.PI);
    } else {
      // Baseline
      amplitude = 0;
    }
    
    // เพิ่ม noise เล็กน้อย
    amplitude += (Math.random() - 0.5) * 0.05;
    
    if (index < 5) {
      console.log(`Point ${index}: amplitude=${amplitude}, normalizedTime=${normalizedTime}`);
    }
    
    return amplitude;
  };

  useEffect(() => {
    drawChart();
  }, [ecgData, width, height]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not found');
      return;
    }

    console.log('Drawing chart with data length:', ecgData.length);

    const ctx = canvas.getContext('2d');
    const { width: canvasWidth, height: canvasHeight } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // ถ้าไม่มีข้อมูล ให้วาดข้อความแจ้ง
    if (!ecgData.length) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading ECG data...', canvasWidth / 2, canvasHeight / 2);
      return;
    }

    // Setup
    const padding = 40;
    const chartWidth = canvasWidth - (padding * 2);
    const chartHeight = canvasHeight - (padding * 2);

    // Calculate data range
    const timeRange = ecgData.length > 0 ? {
      min: ecgData[0].x,
      max: ecgData[ecgData.length - 1].x
    } : { min: 0, max: 1 };

    const voltageRange = ecgData.reduce((range, point) => ({
      min: Math.min(range.min, point.y),
      max: Math.max(range.max, point.y)
    }), { min: Infinity, max: -Infinity });

    // Add some padding to voltage range
    const voltagePadding = Math.max(0.1, (voltageRange.max - voltageRange.min) * 0.1);
    voltageRange.min -= voltagePadding;
    voltageRange.max += voltagePadding;

    console.log('Voltage range:', voltageRange);
    console.log('Time range:', timeRange);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, padding, chartWidth, chartHeight, timeRange, voltageRange);
    }

    // Draw ECG waveform
    drawECGWaveform(ctx, ecgData, padding, chartWidth, chartHeight, timeRange, voltageRange);

    // Draw axes
    drawAxes(ctx, padding, chartWidth, chartHeight, timeRange, voltageRange);
  };

  const drawGrid = (ctx, padding, chartWidth, chartHeight, timeRange, voltageRange) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i * chartWidth / 10);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (voltage)
    for (let i = 0; i <= 8; i++) {
      const y = padding + (i * chartHeight / 8);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
  };

  const drawECGWaveform = (ctx, data, padding, chartWidth, chartHeight, timeRange, voltageRange) => {
    if (data.length < 2) {
      console.log('Not enough data points to draw:', data.length);
      return;
    }

    console.log('Drawing waveform with', data.length, 'points');
    console.log('First few points:', data.slice(0, 3));

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + ((point.x - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth;
      const y = padding + ((voltageRange.max - point.y) / (voltageRange.max - voltageRange.min)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw peaks if any
    peaks.forEach(peak => {
      const x = padding + ((peak.x - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth;
      const y = padding + ((voltageRange.max - peak.y) / (voltageRange.max - voltageRange.min)) * chartHeight;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawAxes = (ctx, padding, chartWidth, chartHeight, timeRange, voltageRange) => {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Y-axis labels (voltage)
    for (let i = 0; i <= 4; i++) {
      const voltage = voltageRange.min + ((voltageRange.max - voltageRange.min) * i / 4);
      const y = padding + chartHeight - (i * chartHeight / 4);
      ctx.fillText(voltage.toFixed(2) + 'V', padding - 20, y + 4);
    }

    // X-axis label
    ctx.fillText('Time', padding + chartWidth / 2, padding + chartHeight + 35);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Voltage (V)', 0, 0);
    ctx.restore();
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ❤️ ECG Real-time Monitor
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>📊 {ecgData.length} samples</span>
          {/* <span>  {status.heart_rate || 0} BPM</span> */}
          <span>  {ecgData.length > 0 ? ecgData[ecgData.length - 1].heartRate : 0} BPM</span>
          <span>📡 {status.connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
          {lastUpdate && (
            <span>🕒 {lastUpdate.toLocaleTimeString('th-TH')}</span>
          )}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border rounded"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Real-time ECG data from Firebase Realtime Database
        {status.device_id && <span className="ml-2">• Device: {status.device_id || 'ECG_001'}</span>}
      </div>
    </div>
  );
};

export default ECGChart;