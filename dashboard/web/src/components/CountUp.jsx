import { useState, useEffect, useRef } from 'react';
import { useInView, motion } from 'framer-motion';

export default function CountUp({ end, duration = 1.5, delay = 0, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true;
      const startTime = Date.now() + delay * 1000;
      const endTime = startTime + duration * 1000;

      const animate = () => {
        const now = Date.now();
        if (now >= endTime) {
          setCount(end);
          return;
        }
        const progress = (now - startTime) / (duration * 1000);
        setCount(Math.floor(progress * end));
        requestAnimationFrame(animate);
      };

      const timeout = setTimeout(() => requestAnimationFrame(animate), delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [inView, end, duration, delay]);

  return (
    <motion.span ref={ref} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {count.toLocaleString()}{suffix}
    </motion.span>
  );
}
