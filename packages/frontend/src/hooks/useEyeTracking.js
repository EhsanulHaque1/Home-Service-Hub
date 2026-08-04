import { useEffect } from 'react';

export function useEyeTracking(containerRef, disabled) {
  useEffect(() => {
    const handleMove = (e) => {
      if (disabled) return;
      const container = containerRef.current;
      if (!container) return;
      container.querySelectorAll('.pupil').forEach((pupil) => {
        const rect = pupil.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.pageY - eyeY, e.pageX - eyeX);
        const distance = Math.min(4, Math.hypot(e.pageX - eyeX, e.pageY - eyeY) / 30);
        pupil.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      });
    };

    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [containerRef, disabled]);
}
