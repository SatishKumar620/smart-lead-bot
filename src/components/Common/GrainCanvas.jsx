import { useEffect, useRef } from 'react';

const GrainCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = 0;

    const renderNoise = (timestamp) => {
      // Render noise at ~12 frames per second (every 80ms)
      if (timestamp - lastTime > 80) {
        lastTime = timestamp;
        const w = canvas.width;
        const h = canvas.height;
        if (w > 0 && h > 0) {
          const imgData = ctx.createImageData(w, h);
          const data = imgData.data;
          const len = data.length;
          for (let i = 0; i < len; i += 4) {
            const val = (Math.random() * 255) | 0;
            data[i] = val;     // R
            data[i + 1] = val; // G
            data[i + 2] = val; // B
            data[i + 3] = 255; // A
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
      animationFrameId = requestAnimationFrame(renderNoise);
    };

    animationFrameId = requestAnimationFrame(renderNoise);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="grain"
    />
  );
};

export default GrainCanvas;
