import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Trash2, Download, Server, Clock, HardDrive, Cpu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then(setSystemInfo)
      .catch(() => {});
  }, []);

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatMemory = (bytes) => `${Math.round(bytes / 1024 / 1024)} MB`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your dashboard and bot</p>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'light', icon: Sun, label: 'Light' },
            { key: 'dark', icon: Moon, label: 'Dark' },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <motion.button
                key={t.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (theme !== t.key) toggleTheme();
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === t.key
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{t.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* System Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          System Information
        </h2>
        {systemInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 p-4 bg-secondary rounded-xl"
            >
              <Cpu className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Node.js</p>
                <p className="text-sm font-medium">{systemInfo.nodeVersion}</p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 p-4 bg-secondary rounded-xl"
            >
              <Clock className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Uptime</p>
                <p className="text-sm font-medium">{formatUptime(systemInfo.uptime)}</p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 p-4 bg-secondary rounded-xl"
            >
              <HardDrive className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="text-sm font-medium">{formatMemory(systemInfo.memory?.heapUsed || 0)}</p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 p-4 bg-secondary rounded-xl"
            >
              <Server className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">PID</p>
                <p className="text-sm font-medium">{process?.pid || 'N/A'}</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <p className="text-muted-foreground">Loading system information...</p>
        )}
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Data Management
        </h2>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl hover:bg-accent transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export Database
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
