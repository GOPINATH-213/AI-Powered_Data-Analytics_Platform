import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService, Dashboard } from '../services/analyticsService';
import { LayoutDashboard, ArrowRight, Trash2, Database, Search, Filter } from 'lucide-react';

export const DashboardBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.listDashboards();
      setDashboards(data);
    } catch (err) {
      console.error('Failed to load dashboards list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this dashboard layout?')) return;
    try {
      await analyticsService.deleteDashboard(id);
      fetchDashboards();
    } catch (err) {
      alert('Failed to delete dashboard.');
    }
  };

  const handleOpenDashboard = (id: string) => {
    navigate(`/dashboards/${id}`);
  };

  // Extract distinct categories dynamically
  const categories = ['All', ...Array.from(new Set(dashboards.map(d => (d as any).dashboardCategory || 'General')))];

  const filtered = dashboards.filter(d => {
    const matchesSearch = d.dashboardName.toLowerCase().includes(search.toLowerCase()) || 
                          ((d as any).dashboardCategory || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ((d as any).dashboardCategory || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'name-asc') {
      return a.dashboardName.localeCompare(b.dashboardName);
    }
    if (sortBy === 'name-desc') {
      return b.dashboardName.localeCompare(a.dashboardName);
    }
    if (sortBy === 'category-asc') {
      return (a.dashboardCategory || 'General').localeCompare(b.dashboardCategory || 'General');
    }
    if (sortBy === 'category-desc') {
      return (b.dashboardCategory || 'General').localeCompare(a.dashboardCategory || 'General');
    }
    if (sortBy === 'date-desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          Business Intelligence Dashboards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive dashboards generated automatically by the analytics schema inferrer.
        </p>
      </div>

      {/* Filters & Sorting Console */}
      {dashboards.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-full sm:max-w-xs">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm w-full outline-none"
              />
            </div>

            {/* Category Select Dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-full sm:max-w-xs">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm w-full outline-none cursor-pointer"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat} Category</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold cursor-pointer outline-none"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="category-asc">Category (A-Z)</option>
              <option value="category-desc">Category (Z-A)</option>
              <option value="date-desc">Newest Created</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-border bg-card text-center space-y-4 max-w-2xl mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
            <LayoutDashboard className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg">No Dashboards Generated</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Upload datasets, then trigger the Analytics pipeline from the Data Sources tab to automatically generate interactive visual charts.
            </p>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No dashboards match your filter constraints.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((dash) => (
            <div
              key={dash._id}
              onClick={() => handleOpenDashboard(dash._id)}
              className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {(dash as any).dashboardCategory || 'General'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors pt-1.5">
                  {dash.dashboardName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  <span>Source Ingestion Dataset</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
                <button
                  onClick={(e) => handleDelete(dash._id, e)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-colors"
                  title="Delete Dashboard"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="inline-flex items-center gap-1 text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">
                  Open Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;
