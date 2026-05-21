import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Terminal } from 'lucide-react';
import Badge from '../components/Badge';
import { api } from '../lib/api';

export default function Logs() {
  const [activeTab, setActiveTab] = useState('stock');
  const [stockLogs, setStockLogs] = useState([]);
  const [commandLogs, setCommandLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const data = await api.getStockLogs(1, 50);
        setStockLogs(data.logs || []);
      } else {
        const data = await api.getCommandLogs(1, 50);
        setCommandLogs(data.logs || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'stock', label: 'Stock Deliveries', icon: ScrollText },
    { key: 'commands', label: 'Command Usage', icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-muted-foreground">View bot activity and delivery logs</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="h-12 bg-muted rounded shimmer"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        ) : activeTab === 'stock' ? (
          stockLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No stock delivery logs</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLogs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            {log.username?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{log.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="primary">{log.service}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-secondary px-2 py-1 rounded">{log.email}</code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                          {log.status === 'success' ? 'Delivered' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(log.created_at * 1000).toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : commandLogs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No command logs</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Command</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Guild</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {commandLogs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {log.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{log.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-secondary px-2 py-1 rounded">/{log.command}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                      {log.guild_id || 'DM'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(log.created_at * 1000).toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
