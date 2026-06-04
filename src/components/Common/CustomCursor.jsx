import { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const cdRef = useRef(null);
  const crRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer:fine)');
    setIsDesktop(mediaQuery.matches);

    const handleMediaChange = (e) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    if (!mediaQuery.matches) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;

    const handleMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId;

    const animateCursor = () => {
      const cd = cdRef.current;
      const cr = crRef.current;

      if (cd) {
        cd.style.left = `${mx}px`;
        cd.style.top = `${my}px`;
      }

      if (cr) {
        rx += (mx - rx) * 0.14;
        ry += (my - ry) * 0.14;
        cr.style.left = `${rx}px`;
        cr.style.top = `${ry}px`;
      }

      animationFrameId = requestAnimationFrame(animateCursor);
    };

    animationFrameId = requestAnimationFrame(animateCursor);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!isDesktop) return null;

  return (
    <>
      <div ref={cdRef} className="cur" id="cd" />
      <div ref={crRef} className="cur" id="cr" />
    </>
  );
};

export default CustomCursor;
