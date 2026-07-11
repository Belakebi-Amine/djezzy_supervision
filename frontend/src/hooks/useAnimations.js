import { useState, useEffect, useRef } from 'react';

// Animated counter: smoothly counts from 0 to target value
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
  const num = parseFloat(String(target).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) { setValue(target); return; }
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(eased * num * 10) / 10);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return value;
}

// Click ripple effect: spawns expanding circle at click position
export function useRipple() {
  const containerRef = useRef(null);

  const spawnRipple = (e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute; border-radius: 50%; pointer-events: none;
      width: ${size}px; height: ${size}px;
      left: ${x - size / 2}px; top: ${y - size / 2}px;
      background: radial-gradient(circle, rgba(232,64,26,0.15) 0%, transparent 70%);
      animation: rippleExpand 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
      z-index: 0;
    `;
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  };

  return { containerRef, spawnRipple };
}

// Click particles: burst of small dots at click position
export function spawnParticles(x, y, count = 6) {
  const colors = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    const angle = (Math.PI * 2 * i) / count;
    const dist = 20 + Math.random() * 30;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const size = 3 + Math.random() * 4;
    dot.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: ${colors[i % colors.length]};
      pointer-events: none; z-index: 9999;
      transition: all 0.5s cubic-bezier(0.4,0,0.2,1);
      opacity: 1;
    `;
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
      dot.style.opacity = '0';
    });
    setTimeout(() => dot.remove(), 550);
  }
}
