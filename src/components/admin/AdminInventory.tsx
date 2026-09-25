import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { ProductIcon } from '../common/ProductIcon';
import {
  Boxes,
  Plus,
  Minus,
  AlertTriangle,
  Search,
  CheckCircle,
  Tag,
  DollarSign,
  Package,
  Layers,
} from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const {
    products,
    updateProductStock,
    addProduct,
    formatPrice,
    addAuditLog,
    language,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    nameBn: '',
    category: 'kitchen',
    price: 1500,
    wholesalePrice: 1100,
    minWholesaleQty: 10,
    stock: 50,
    minStockAlert: 10,
    hsn: '7323',
    gstRate: 18,
    imageIcon: 'i-pot',
    description: '',
    descriptionBn: '',
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameBn.includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleStockAdjust = (product: Product, delta: number) => {
    const newQty = Math.max(0, product.stock + delta);
    updateProductStock(product.id, newQty);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.nameBn) {
      alert('Please provide product name in English and Bengali.');
      return;
    }

    const sku = `UD-${newProduct.category?.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const productToSave: Product = {
      id: `prod-${Date.now()}`,
      sku,
      name: newProduct.name || '',
      nameBn: newProduct.nameBn || '',
      nameHi: newProduct.name || '',
      category: (newProduct.category as any) || 'kitchen',
      price: Number(newProduct.price) || 999,
      wholesalePrice: Number(newProduct.wholesalePrice) || 750,
      minWholesaleQty: Number(newProduct.minWholesaleQty) || 10,
      stock: Number(newProduct.stock) || 50,
      minStockAlert: Number(newProduct.minStockAlert) || 10,
      hsn: newProduct.hsn || '7323',
      gstRate: Number(newProduct.gstRate) || 18,
      rating: 4.9,
      reviewsCount: 1,
      imageIcon: newProduct.imageIcon || 'i-pot',
      description: newProduct.description || '',
      descriptionBn: newProduct.descriptionBn || '',
    };

    addProduct(productToSave);
    setShowAddModal(false);
    // Reset
    setNewProduct({
      name: '',
      nameBn: '',
      category: 'kitchen',
      price: 1500,
      wholesalePrice: 1100,
      minWholesaleQty: 10,
      stock: 50,
      minStockAlert: 10,
      hsn: '7323',
      gstRate: 18,
      imageIcon: 'i-pot',
      description: '',
      descriptionBn: '',
    });
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn' ? 'অটোমেটেড ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম' : 'Automated Inventory & Warehouse Management'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Real-time stock alerts, auto-deduction on sales, and HSN batch pricing.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[#0F1913] hover:bg-[#182620] text-white px-4 py-2 rounded text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#CC9A2E]" />
          <span>Add New Product SKU</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] flex items-center gap-3">
          <div className="p-3 rounded-md bg-[#3C6656]/10 text-[#3C6656]">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#565F52] uppercase font-semibold">Total Stock Units</span>
            <div className="text-xl font-black text-[#0F1913]">{totalStockUnits} Units</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] flex items-center gap-3">
          <div className="p-3 rounded-md bg-amber-100 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#565F52] uppercase font-semibold">Low Stock Threshold Alerts</span>
            <div className="text-xl font-black text-amber-800">{lowStockCount} Products Need Restock</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] flex items-center gap-3">
          <div className="p-3 rounded-md bg-purple-100 text-purple-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#565F52] uppercase font-semibold">Total Catalog SKUs</span>
            <div className="text-xl font-black text-[#0F1913]">{products.length} Active SKUs</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-lg border border-[#CBCFB9]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#565F52] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search SKU, Product Name or HSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-[#FBFAF5] border border-[#CBCFB9] rounded pl-9 pr-3 py-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'kitchen', 'sports', 'wholesale', 'industrial'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded font-semibold whitespace-nowrap capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#182620] text-white'
                  : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9] hover:bg-[#E4E8D9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-[#CBCFB9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#EEF0E7] text-[#0F1913] font-heading font-bold uppercase text-[11px] border-b border-[#CBCFB9]">
                <th className="p-3">SKU & Item Details</th>
                <th className="p-3">Category</th>
                <th className="p-3">HSN & GST %</th>
                <th className="p-3">Retail Price</th>
                <th className="p-3">Wholesale Price (B2B)</th>
                <th className="p-3">Available Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBCFB9]/40">
              {filteredProducts.map((prod) => {
                const isLow = prod.stock <= prod.minStockAlert;
                return (
                  <tr key={prod.id} className="hover:bg-[#FBFAF5] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[#E4E8D9] flex items-center justify-center text-[#3C6656] shrink-0 border border-[#CBCFB9]">
                          <ProductIcon name={prod.imageIcon} className="w-6 h-6 text-[#3C6656]" />
                        </div>
                        <div>
                          <span className="font-mono text-[11px] font-bold text-[#A87C1F] block">
                            {prod.sku}
                          </span>
                          <span className="font-bold text-[#0F1913] block">{prod.name}</span>
                          <span className="text-[10px] text-[#565F52]">{prod.nameBn}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-medium uppercase text-[10px] text-[#565F52]">
                      {prod.category}
                    </td>

                    <td className="p-3 font-mono">
                      <span className="block text-[#0F1913] font-semibold">{prod.hsn}</span>
                      <span className="text-[10px] text-[#3C6656] font-sans">GST {prod.gstRate}%</span>
                    </td>

                    <td className="p-3 font-bold text-[#0F1913]">
                      {formatPrice(prod.price)}
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-[#A87C1F] block">
                        {formatPrice(prod.wholesalePrice)}
                      </span>
                      <span className="text-[10px] text-[#565F52]">
                        Min Qty: {prod.minWholesaleQty}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="font-mono text-sm font-bold text-[#0F1913] block">
                        {prod.stock} units
                      </span>
                      <span className="text-[10px] text-[#565F52]">
                        Alert: &lt;{prod.minStockAlert}
                      </span>
                    </td>

                    <td className="p-3">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" />
                          In Stock
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 border border-[#CBCFB9] rounded bg-[#FBFAF5] p-0.5">
                        <button
                          onClick={() => handleStockAdjust(prod, -1)}
                          disabled={prod.stock <= 0}
                          className="p-1 hover:bg-[#E4E8D9] rounded text-[#0F1913] disabled:opacity-40"
                          title="Deduct 1 unit"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleStockAdjust(prod, 10)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-[#182620] text-white hover:bg-[#0F1913] rounded"
                          title="Restock +10 units"
                        >
                          +10
                        </button>

                        <button
                          onClick={() => handleStockAdjust(prod, 50)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-[#CC9A2E] text-[#0F1913] hover:bg-[#A87C1F] hover:text-white rounded"
                          title="Bulk Pallet Restock +50 units"
                        >
                          +50
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-[#CBCFB9] rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#CBCFB9]">
              <h3 className="font-heading font-bold text-base text-[#0F1913]">
                Add New Product to Inventory
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stainless Steel Pressure Cooker 5L"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Name (Bengali) *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: স্টেইনলেস স্টিল প্রেসার কুকার ৫ লিটার"
                    value={newProduct.nameBn}
                    onChange={(e) => setNewProduct({ ...newProduct, nameBn: e.target.value })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  >
                    <option value="kitchen">Kitchen & Cookware</option>
                    <option value="sports">Sports & Fitness</option>
                    <option value="wholesale">Wholesale B2B</option>
                    <option value="industrial">Industrial Tools</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">HSN Code</label>
                  <input
                    type="text"
                    required
                    value={newProduct.hsn}
                    onChange={(e) => setNewProduct({ ...newProduct, hsn: e.target.value })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">GST Rate %</label>
                  <select
                    value={newProduct.gstRate}
                    onChange={(e) => setNewProduct({ ...newProduct, gstRate: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Retail Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Wholesale Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.wholesalePrice}
                    onChange={(e) => setNewProduct({ ...newProduct, wholesalePrice: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Min Wholesale Qty</label>
                  <input
                    type="number"
                    required
                    value={newProduct.minWholesaleQty}
                    onChange={(e) => setNewProduct({ ...newProduct, minWholesaleQty: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F1913] mb-1">Min Stock Alert Threshold</label>
                  <input
                    type="number"
                    required
                    value={newProduct.minStockAlert}
                    onChange={(e) => setNewProduct({ ...newProduct, minStockAlert: Number(e.target.value) })}
                    className="w-full bg-[#FBFAF5] border border-[#CBCFB9] rounded p-2 text-[#0F1913]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#CBCFB9] flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#E4E8D9] text-[#0F1913] rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F1913] text-white rounded font-bold hover:bg-[#182620]"
                >
                  Save Product to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
