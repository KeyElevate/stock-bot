import { motion } from 'framer-motion';

const variants = {
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary/20 text-primary',
  success: 'bg-emerald-500/20 text-emerald-500',
  error: 'bg-red-500/20 text-red-500',
  warning: 'bg-amber-500/20 text-amber-500',
  info: 'bg-blue-500/20 text-blue-500',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </motion.span>
  );
}
