import * as React from "react";
import { Card } from "@/components/design-system/Card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartWidgetProps {
  title: string;
  data: ChartData[];
  type: 'line' | 'bar' | 'area' | 'pie';
  height?: number;
  showLegend?: boolean;
  interactive?: boolean;
  className?: string;
  config?: any; // For ChartContainer config
  dataKey?: string; // Main data key to plot
  nameKey?: string; // For Pie chart
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const ChartWidget = ({
  title,
  data,
  type,
  height = 300,
  showLegend = true,
  interactive = true,
  className,
  config = {
    value: {
      label: "Value",
      color: "hsl(var(--primary))",
    },
  },
  dataKey = "value",
  nameKey = "name",
}: ChartWidgetProps) => {
  
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            {interactive && <Tooltip content={<ChartTooltipContent />} />}
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={`var(--color-${Object.keys(config)[0]})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            {interactive && <Tooltip content={<ChartTooltipContent />} />}
            {showLegend && <Legend />}
            <Bar 
              dataKey={dataKey} 
              fill={`var(--color-${Object.keys(config)[0]})`} 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            {interactive && <Tooltip content={<ChartTooltipContent />} />}
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={`var(--color-${Object.keys(config)[0]})`} 
              fillOpacity={1} 
              fill={`url(#color${Object.keys(config)[0]})`} 
            />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {interactive && <Tooltip content={<ChartTooltipContent hideLabel />} />}
            {showLegend && <Legend />}
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <Card title={title} className={className} padding="md">
      <div style={{ height }}>
        <ChartContainer config={config} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart() as any}
            </ResponsiveContainer>
        </ChartContainer>
      </div>
    </Card>
  );
};
