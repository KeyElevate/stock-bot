import { motion } from 'framer-motion';
import { Package, Layers, Users, ScrollText, Shield, Ban, Clock } from 'lucide-react';
import StatCard from '../components/StatCard';
import AnimatedChart from '../components/AnimatedChart';
import { SkeletonCard } from '../components/Skeleton';
import { useStats } from '../hooks/useData';
import Badge from '../components/Badge';

export default function Dashboard() {
  const { data, loading } = useStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const chartData = (data?.serviceStats || []).map((s) => ({
    name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
    count: s.count,
  }));

  const commandChartData = (data?.commandStats || []).slice(0, 6).map((c) => ({
    name: `/${c.command}`,
    count: c.count,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your stock bot</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-emerald-500 rounded-full"
          />
          <span className="text-sm text-emerald-500 font-medium">Bot Online</span>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Stock" value={data?.totalStock || 0} color="primary" delay={0} />
        <StatCard icon={Layers} label="Services" value={data?.totalServices || 0} color="emerald" delay={0.1} />
        <StatCard icon={Users} label="Users" value={data?.totalUsers || 0} color="blue" delay={0.2} />
        <StatCard icon={ScrollText} label="Deliveries" value={data?.stockLogsCount || 0} color="amber" delay={0.3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Stock by Service</h2>
          <AnimatedChart data={chartData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Command Usage</h2>
          <AnimatedChart data={commandChartData} />
        </motion.div>
      </div>

      {/* Moderation Stats & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Moderation Cards */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Moderation</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Banned</span>
                </div>
                <Badge variant="error">{data?.bannedUsers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Blacklisted</span>
                </div>
                <Badge variant="warning">{data?.blacklistedUsers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Muted</span>
                </div>
                <Badge variant="info">{data?.mutedUsers || 0}</Badge>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Deliveries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Deliveries</h3>
          <div className="space-y-3">
            {(data?.recentStockLogs || []).slice(0, 5).map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {log.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.username}</p>
                    <p className="text-xs text-muted-foreground">{log.service}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-secondary px-2 py-1 rounded">{log.email}</code>
                  <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                    {log.status === 'success' ? 'Delivered' : 'Failed'}
                  </Badge>
                </div>
              </motion.div>
            ))}
            {(!data?.recentStockLogs || data.recentStockLogs.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No deliveries yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
