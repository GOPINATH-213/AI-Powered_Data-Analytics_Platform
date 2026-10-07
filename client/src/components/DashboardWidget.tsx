import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { DashboardWidget as WidgetType } from '../services/analyticsService';

interface WidgetProps {
  widget: WidgetType;
  data: Record<string, any>[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DashboardWidget: React.FC<WidgetProps> = ({ widget, data }) => {
  const { widgetType, chartType, configuration } = widget;

  if (widgetType === 'kpi') {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-sm h-full hover:shadow-md transition-shadow">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
          {configuration.metricName || 'Key Performance Metric'}
        </span>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-foreground tracking-tight">
            {typeof configuration.metricValue === 'number'
              ? configuration.metricValue.toLocaleString()
              : configuration.metricValue}
          </span>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          No data available
        </div>
      );
    }

    const { xAxisKey, yAxisKey, nameKey, valueKey } = configuration;

    // Take top 20 records for clean rendering bounds
    const chartData = data.slice(0, 20);

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={10} tickLine={false} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey={yAxisKey} stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={10} tickLine={false} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey={yAxisKey} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = chartData.map((row) => ({
          name: row[nameKey] || 'Other',
          value: Number(row[valueKey]) || 0,
        })).filter(item => item.value > 0);

        return (
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                label={{ fontSize: 9 }}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '10px',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="90%">
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis type="number" dataKey={xAxisKey} name={xAxisKey} stroke="#888888" fontSize={10} />
              <YAxis type="number" dataKey={yAxisKey} name={yAxisKey} stroke="#888888" fontSize={10} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Scatter name="Data Distribution" data={chartData} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Unknown visualization format
          </div>
        );
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col shadow-sm h-full hover:shadow-md transition-shadow">
      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-4 shrink-0">
        {configuration.title || 'Dynamic Chart View'}
      </span>
      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>
    </div>
  );
};
export default DashboardWidget;
