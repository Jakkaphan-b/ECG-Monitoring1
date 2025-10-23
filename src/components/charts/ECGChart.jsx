import React, { useRef, useEffect, useState } from 'react';

const ECGChart = ({ data = [], width = 800, height = 400, showGrid = true }) => {
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState([]);

  useEffect(() => {
    drawChart();
  }, [data, width, height]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const { width: canvasWidth, height: canvasHeight } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Setup
    const padding = 40;
    const chartWidth = canvasWidth - (padding * 2);
    const chartHeight = canvasHeight - (padding * 2);

    // Calculate data range
    const timeRange = data.length > 0 ? {
      min: data[0].x,
      max: data[data.length - 1].x
    } : { min: 0, max: 1 };

    const voltageRange = data.reduce((range, point) => ({
      min: Math.min(range.min, point.y),
      max: Math.max(range.max, point.y)
    }), { min: Infinity, max: -Infinity });

    // Add some padding to voltage range
    const voltagePadding = Math.max(0.1, (voltageRange.max - voltageRange.min) * 0.1);
    voltageRange.min -= voltagePadding;
    voltageRange.max += voltagePadding;

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, padding, chartWidth, chartHeight, timeRange, voltageRange);
    }

    // Draw ECG waveform
    drawECGWaveform(ctx, data, padding, chartWidth, chartHeight, timeRange, voltageRange);

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
    if (data.length < 2) return;

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
          <span>📊 {data.length} samples</span>
          <span>📡 {data.length > 0 ? '🟢 Live' : '🔴 No Signal'}</span>
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
        Real-time ECG waveform visualization
      </div>
    </div>
  );
};

export default ECGChart;