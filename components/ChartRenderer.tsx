import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  description?: string;
  data: { name: string; value: number }[];
}

interface ChartRendererProps {
  config: ChartData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const { type, title, description, data } = config;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} />
            <YAxis />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" name="数值" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} />
            <YAxis />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} name="趋势" />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
          </PieChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="my-8 p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
      <h4 className="text-lg font-semibold text-gray-800 text-center mb-2">{title}</h4>
      {description && <p className="text-sm text-gray-500 text-center mb-6">{description}</p>}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartRenderer;