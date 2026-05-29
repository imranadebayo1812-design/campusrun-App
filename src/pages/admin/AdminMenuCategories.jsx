import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { MOCK_VENDORS } from '@/lib/mockData';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Save, X, Package, Tag, ToggleLeft, ToggleRight, Download, Upload,
} from 'lucide-react';

/* ── CSV helpers ─────────────────────────────────────────────────── */
function escapeCSV(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildTemplateCSV() {
  const rows = ['Vendor Name,Category,Item Name,Price,Available'];
  for (const vendor of MOCK_VENDORS) {
    const groups = vendor.menuGroups
      ? vendor.menuGroups
      : [{ label: 'Menu', names: null }];
    for (const group of groups) {
      const label = group.label.replace(/^[^\w\s]*\s*/u, '').trim() || group.label;
      const groupItems = group.names
        ? vendor.items.filter(i => group.names.includes(i.name))
        : vendor.items;
      for (const item of groupItems) {
        rows.push([
          escapeCSV(vendor.name),
          escapeCSV(label),
          escapeCSV(item.name),
          item.price,
          item.available === false ? 'no' : 'yes',
        ].join(','));
      }
    }
  }
  return rows.join('\n');
}

function parseCSV(text) {
  // Simple CSV parser — handles quoted fields
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur.trim());
    result.push(fields);
  }
  return result;
}

/* ── helpers ─────────────────────────────────────────────────────── */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Unknown';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/* ── inline editable cell ───────────────────────────────────────── */
function EditableCell({ value, onSave, type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    if (draft !== value) onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className={`bg-white/10 border border-brand-500/60 rounded px-2 py-0.5 text-white text-sm focus:outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer hover:text-brand-300 transition-colors ${className}`}
    >
      {value}
    </span>
  );
}

/* ── new item / category form row ───────────────────────────────── */
function NewItemRow({ categoryId, vendorName, onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    const p = parseFloat(price);
    if (!name.trim()) { setErr('Name required'); return; }
    if (!p || p <= 0) { setErr('Valid price required'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('menu_items').insert({
      category_id: categoryId,
      vendor_name: vendorName,
      name: name.trim(),
      price: p,
      is_available: true,
    }).select().single();
    if (error) { setErr(error.message); setSaving(false); return; }
    onAdded(data);
  }

  return (
    <tr className="bg-brand-500/5 border-b border-white/[0.06]">
      <td className="px-4 py-2">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Item name"
          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white placeholder-gray-500 w-full focus:outline-none focus:border-brand-500/60"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="0.00"
          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white placeholder-gray-500 w-28 focus:outline-none focus:border-brand-500/60"
        />
      </td>
      <td className="px-4 py-2 text-xs text-green-400">Available</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          {err && <span className="text-xs text-red-400 mr-2">{err}</span>}
          <button onClick={save} disabled={saving} className="flex items-center gap-1 text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg">
            <Save className="w-3 h-3" /> {saving ? '…' : 'Save'}
          </button>
          <button onClick={onCancel} className="flex items-center gap-1 text-xs text-gray-400 bg-white/[0.06] hover:bg-white/10 px-2.5 py-1 rounded-lg">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── main page ───────────────────────────────────────────────────── */
export default function AdminMenuCategories() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVendors, setExpandedVendors] = useState({});
  const [expandedCats, setExpandedCats] = useState({});
  const [addingItemToCat, setAddingItemToCat] = useState(null);
  const [addingCatToVendor, setAddingCatToVendor] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('menu_categories').select('*').order('vendor_name').order('display_order'),
      supabase.from('menu_items').select('*').order('vendor_name').order('name'),
    ]);
    setCategories(cats || []);
    setItems(its || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function downloadTemplate() {
    const csv = buildTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campusrun_menu_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCSVImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { setError('CSV is empty or has no data rows.'); return; }

    // Detect header row
    const header = rows[0].map(h => h.toLowerCase());
    const vendorCol  = header.indexOf('vendor name');
    const catCol     = header.indexOf('category');
    const nameCol    = header.indexOf('item name');
    const priceCol   = header.indexOf('price');
    const availCol   = header.indexOf('available');

    if ([vendorCol, catCol, nameCol, priceCol].includes(-1)) {
      setError('CSV must have columns: Vendor Name, Category, Item Name, Price, Available');
      return;
    }

    if (!window.confirm(`Import ${rows.length - 1} rows from "${file.name}"?\n\nExisting data will NOT be deleted — duplicates may be created if you import the same file twice.`)) return;

    setImporting(true);
    setError('');
    let catCount = 0;
    let itemCount = 0;
    let firstErr = '';

    // Build a category cache so we don't re-insert same vendor+category combos
    const catCache = {}; // key: `${vendorName}||${catName}`

    const dataRows = rows.slice(1);
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const vendorName = row[vendorCol]?.trim();
      const catName    = row[catCol]?.trim();
      const itemName   = row[nameCol]?.trim();
      const price      = parseFloat(row[priceCol]);
      const available  = availCol === -1 ? true : (row[availCol]?.trim().toLowerCase() !== 'no');

      if (!vendorName || !catName || !itemName || isNaN(price)) continue;

      setImportProgress(`Row ${i + 1}/${dataRows.length}: ${vendorName} › ${itemName}…`);

      // Get or create category
      const cacheKey = `${vendorName}||${catName}`;
      let catId = catCache[cacheKey];
      if (!catId) {
        const { data: cat, error: catErr } = await supabase
          .from('menu_categories')
          .insert({ vendor_name: vendorName, name: catName, display_order: Object.keys(catCache).filter(k => k.startsWith(vendorName + '||')).length })
          .select('id').single();
        if (catErr || !cat) {
          if (!firstErr) firstErr = `Category "${catName}": ${catErr?.message}`;
          continue;
        }
        catCache[cacheKey] = cat.id;
        catId = cat.id;
        catCount++;
      }

      // Insert item
      const { error: itemErr } = await supabase.from('menu_items').insert({
        vendor_name: vendorName,
        category_id: catId,
        name: itemName,
        price,
        is_available: available,
      });
      if (itemErr) {
        if (!firstErr) firstErr = `Item "${itemName}": ${itemErr.message}`;
      } else {
        itemCount++;
      }
    }

    setImportProgress('');
    setImporting(false);
    if (firstErr) setError(`Import finished with errors. First error: ${firstErr}`);
    await loadAll();
    alert(`Done! Imported ${catCount} categories and ${itemCount} items.${firstErr ? `\n\nFirst error:\n${firstErr}` : ''}`);
  }

  const catsByVendor = groupBy(categories, 'vendor_name');
  const itemsByCat = groupBy(items, 'category_id');
  const vendors = Object.keys(catsByVendor).sort();

  function toggleVendor(v) {
    setExpandedVendors(p => ({ ...p, [v]: !p[v] }));
  }
  function toggleCat(id) {
    setExpandedCats(p => ({ ...p, [id]: !p[id] }));
  }

  async function updateItemName(id, name) {
    await supabase.from('menu_items').update({ name }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, name } : i));
  }
  async function updateItemPrice(id, price) {
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    await supabase.from('menu_items').update({ price: p }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, price: p } : i));
  }
  async function toggleItemAvailability(id, current) {
    const is_available = !current;
    await supabase.from('menu_items').update({ is_available }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_available } : i));
  }
  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function updateCatName(id, name) {
    await supabase.from('menu_categories').update({ name }).eq('id', id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  }
  async function deleteCat(id) {
    if (!window.confirm('Delete this category and all its items?')) return;
    await supabase.from('menu_categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setItems(prev => prev.filter(i => i.category_id !== id));
  }

  async function addCategory(vendorName, name) {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('menu_categories').insert({
      vendor_name: vendorName,
      name: name.trim(),
      display_order: (catsByVendor[vendorName]?.length || 0),
    }).select().single();
    if (!error && data) setCategories(prev => [...prev, data]);
    setAddingCatToVendor(null);
    setNewCatName('');
    setSaving(false);
  }

  async function addVendorWithCategory() {
    if (!newVendorName.trim() || !newCatName.trim()) {
      setError('Both vendor name and first category name are required');
      return;
    }
    setSaving(true);
    setError('');
    const { data, error } = await supabase.from('menu_categories').insert({
      vendor_name: newVendorName.trim(),
      name: newCatName.trim(),
      display_order: 0,
    }).select().single();
    if (!error && data) {
      setCategories(prev => [...prev, data]);
      setExpandedVendors(p => ({ ...p, [newVendorName.trim()]: true }));
      // Upsert vendor metadata so it appears in pickup/dropoff lists
      const vendorMeta = {
        name: newVendorName.trim(),
        zone: newZone.trim() || 'Campus',
        emoji: newEmoji.trim() || '🏪',
      };
      if (newLat && newLng) {
        vendorMeta.lat = parseFloat(newLat);
        vendorMeta.lng = parseFloat(newLng);
      }
      await supabase.from('vendors').upsert(vendorMeta, { onConflict: 'name' });
    } else {
      setError(error?.message || 'Failed to create vendor');
    }
    setShowAddVendor(false);
    setNewVendorName('');
    setNewCatName('');
    setNewZone('');
    setNewEmoji('');
    setNewLat('');
    setNewLng('');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Menu Categories</h2>
          <p className="text-sm text-gray-400 mt-0.5">{vendors.length} vendors · {categories.length} categories · {items.length} items</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-surface-800 border border-white/[0.08] hover:bg-surface-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Upload className="w-4 h-4" />
            {importing ? importProgress || 'Importing…' : 'Import from CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSVImport}
          />
          <button
            onClick={() => setShowAddVendor(v => !v)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Add vendor panel */}
      {showAddVendor && (
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-sm font-semibold text-white">New Vendor</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Vendor / Restaurant Name</label>
              <input
                value={newVendorName}
                onChange={e => setNewVendorName(e.target.value)}
                placeholder="e.g. B's Chops"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">First Category Name</label>
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Mains"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Zone / Location Area</label>
              <input
                value={newZone}
                onChange={e => setNewZone(e.target.value)}
                placeholder="e.g. Food Court"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Emoji Icon</label>
              <input
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                placeholder="e.g. 🍕"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Latitude (GPS)</label>
              <input
                type="number"
                step="any"
                value={newLat}
                onChange={e => setNewLat(e.target.value)}
                placeholder="e.g. 9.0762"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Longitude (GPS)</label>
              <input
                type="number"
                step="any"
                value={newLng}
                onChange={e => setNewLng(e.target.value)}
                placeholder="e.g. 7.4002"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddVendor(false); setNewVendorName(''); setNewCatName(''); setNewZone(''); setNewEmoji(''); setNewLat(''); setNewLng(''); setError(''); }}
              className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 py-2 rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              onClick={addVendorWithCategory}
              disabled={saving}
              className="flex-1 bg-brand-500 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Vendor'}
            </button>
          </div>
        </div>
      )}

      {vendors.length === 0 && (
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No vendors yet</p>
          <p className="text-sm text-gray-600 mt-1">Run the SQL seed script or add a vendor above.</p>
        </div>
      )}

      <div className="space-y-3">
        {vendors.map(vendorName => {
          const vendorCats = catsByVendor[vendorName] || [];
          const totalItems = vendorCats.reduce((sum, c) => sum + (itemsByCat[c.id]?.length || 0), 0);
          const isExpanded = !!expandedVendors[vendorName];

          return (
            <div key={vendorName} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Vendor header */}
              <button
                onClick={() => toggleVendor(vendorName)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center">
                    <Tag className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">{vendorName}</p>
                    <p className="text-xs text-gray-500">{vendorCats.length} categories · {totalItems} items</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Categories */}
              {isExpanded && (
                <div className="border-t border-white/[0.06]">
                  {vendorCats.map(cat => {
                    const catItems = itemsByCat[cat.id] || [];
                    const isCatExpanded = !!expandedCats[cat.id];

                    return (
                      <div key={cat.id} className="border-b border-white/[0.04] last:border-0">
                        {/* Category row */}
                        <div className="flex items-center justify-between px-5 py-3 bg-surface-800/30">
                          <button
                            onClick={() => toggleCat(cat.id)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {isCatExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            )}
                            <EditableCell
                              value={cat.name}
                              onSave={v => updateCatName(cat.id, v)}
                              className="text-sm font-semibold text-gray-200"
                            />
                            <span className="text-xs text-gray-600 ml-1">({catItems.length})</span>
                          </button>
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => setAddingItemToCat(cat.id)}
                              className="flex items-center gap-1 text-[11px] text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 px-2 py-1 rounded-lg font-medium"
                            >
                              <Plus className="w-3 h-3" /> Add Item
                            </button>
                            <button
                              onClick={() => deleteCat(cat.id)}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Items table */}
                        {isCatExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price (₦)</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {catItems.map(item => (
                                  <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                    <td className="px-4 py-2.5">
                                      <EditableCell
                                        value={item.name}
                                        onSave={v => updateItemName(item.id, v)}
                                        className="text-white"
                                      />
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <EditableCell
                                        value={String(item.price)}
                                        type="number"
                                        onSave={v => updateItemPrice(item.id, v)}
                                        className="text-green-400 font-semibold w-24"
                                      />
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <button
                                        onClick={() => toggleItemAvailability(item.id, item.is_available)}
                                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                          item.is_available
                                            ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                                            : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                        }`}
                                      >
                                        {item.is_available ? (
                                          <><ToggleRight className="w-3.5 h-3.5" /> Available</>
                                        ) : (
                                          <><ToggleLeft className="w-3.5 h-3.5" /> Unavailable</>
                                        )}
                                      </button>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <button
                                        onClick={() => deleteItem(item.id)}
                                        className="w-7 h-7 inline-flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {addingItemToCat === cat.id && (
                                  <NewItemRow
                                    categoryId={cat.id}
                                    vendorName={vendorName}
                                    onAdded={item => {
                                      setItems(prev => [...prev, item]);
                                      setAddingItemToCat(null);
                                    }}
                                    onCancel={() => setAddingItemToCat(null)}
                                  />
                                )}
                                {catItems.length === 0 && addingItemToCat !== cat.id && (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-4 text-center text-xs text-gray-600">
                                      No items yet — click "Add Item" above
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add category to vendor */}
                  {addingCatToVendor === vendorName ? (
                    <div className="px-5 py-3 flex items-center gap-2 bg-surface-800/20">
                      <input
                        autoFocus
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="Category name"
                        onKeyDown={e => { if (e.key === 'Enter') addCategory(vendorName, newCatName); if (e.key === 'Escape') { setAddingCatToVendor(null); setNewCatName(''); } }}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/60"
                      />
                      <button
                        onClick={() => addCategory(vendorName, newCatName)}
                        disabled={saving}
                        className="flex items-center gap-1 text-xs font-semibold bg-brand-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" /> {saving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setAddingCatToVendor(null); setNewCatName(''); }}
                        className="text-xs text-gray-400 bg-white/[0.06] px-3 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingCatToVendor(vendorName); setNewCatName(''); setExpandedVendors(p => ({ ...p, [vendorName]: true })); }}
                      className="w-full flex items-center gap-2 px-5 py-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add category to {vendorName}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="mt-6 bg-surface-900/50 border border-white/[0.06] rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 mb-1.5">How to import</p>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Click <strong className="text-gray-400">Download Template</strong> — opens a pre-filled spreadsheet in Excel or Google Sheets.</li>
          <li>Edit prices, add/remove items, set Available to <em>yes</em> or <em>no</em>.</li>
          <li>Save as CSV and click <strong className="text-gray-400">Import from CSV</strong> to upload.</li>
          <li>Click any item name or price below to edit it inline after import.</li>
        </ol>
      </div>
    </div>
  );
}
