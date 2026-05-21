import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Upload, Trash2, Eye, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useServices } from '../hooks/useData';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function Stock() {
  const { services, loading, refresh } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [uploadService, setUploadService] = useState('');
  const [uploadLines, setUploadLines] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const handleCreateService = async () => {
    if (!newServiceName.trim()) return;
    setActionLoading(true);
    try {
      await api.createService(newServiceName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''));
      addToast('Service created successfully', 'success');
      setNewServiceName('');
      setModalOpen(false);
      refresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  const handleDeleteService = async (name) => {
    if (!confirm(`Delete "${name}" and all its stock?`)) return;
    try {
      await api.deleteService(name);
      addToast('Service deleted', 'success');
      refresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUploadStock = async () => {
    if (!uploadService || !uploadLines.trim()) return;
    setActionLoading(true);
    try {
      const lines = uploadLines.split('\n').filter((l) => l.trim());
      const result = await api.addStock(uploadService, lines);
      addToast(`Uploaded: ${result.valid} valid, ${result.duplicates} duplicates`, 'success');
      setUploadLines('');
      setUploadModalOpen(false);
      refresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">{services.length} services configured</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl hover:bg-accent transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Stock
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </motion.button>
        </div>
      </motion.div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-card border border-border rounded-2xl p-6 shimmer"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-12 text-center"
        >
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">Create your first stock service to get started</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalOpen(true)}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Add Service
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold capitalize">{service.name}</h3>
                    <Badge variant="primary">{service.count} stocks</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <Link
                  to={`/stock/${service.name}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteService(service.name)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Service">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service Name</label>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="e.g., netflix, spotify"
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateService}
            disabled={actionLoading || !newServiceName.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Service'}
          </motion.button>
        </div>
      </Modal>

      {/* Upload Stock Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Stock">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service</label>
            <select
              value={uploadService}
              onChange={(e) => setUploadService(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stock Lines (url:email:password)</label>
            <textarea
              value={uploadLines}
              onChange={(e) => setUploadLines(e.target.value)}
              placeholder={"https://example.com:user@email.com:password123"}
              rows={8}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUploadStock}
            disabled={actionLoading || !uploadService || !uploadLines.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload Stock'}
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
