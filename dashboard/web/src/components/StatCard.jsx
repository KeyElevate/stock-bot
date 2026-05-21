import { motion } from 'framer-motion';
import CountUp from './CountUp';

export default function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 text-primary',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-500',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-500',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
      <div className="relative bg-card border border-border rounded-2xl p-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-3xl font-bold"
            >
              <CountUp end={value} duration={1.5} delay={delay + 0.3} />
            </motion.p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.8 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>
    </motion.div>
  );
}
