import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Package } from 'lucide-react';
import Badge from '../components/Badge';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function StockDetail() {
  const { service } = useParams();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchStocks();
  }, [service]);

  const fetchStocks = async () => {
    try {
      const data = await api.getStock(service);
      setStocks(data.stocks || []);
    } catch {
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    try {
      await api.deleteStock(service, email);
      addToast('Stock entry deleted', 'success');
      fetchStocks();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link to="/stock">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl bg-secondary hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold capitalize">{service}</h1>
          <p className="text-muted-foreground">{stocks.length} stock entries</p>
        </div>
      </motion.div>

      {/* Stock Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        ) : stocks.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stock available</h3>
            <p className="text-muted-foreground">Upload stock from the Stock page</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">#</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">URL</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Password</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, i) => (
                  <motion.tr
                    key={`${stock.email}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-secondary px-2 py-1 rounded truncate block max-w-[200px]">
                        {stock.url}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm">{stock.email}</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm">{stock.password}</code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(stock.email)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
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
