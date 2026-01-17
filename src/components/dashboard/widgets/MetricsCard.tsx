import * as React from "react";
import { Card } from "@/components/design-system/Card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export const MetricsCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  trend,
  className,
}: MetricsCardProps) => {
  return (
    <Card className={className} padding="md">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
          {title}
        </h3>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold">{value}</div>
        {(change !== undefined || trend) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === 'up' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
            {trend === 'down' && <ArrowDown className="h-3 w-3 text-rose-500" />}
            {trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
            
            {change !== undefined && (
              <span
                className={cn(
                  changeType === 'increase' && "text-emerald-500",
                  changeType === 'decrease' && "text-rose-500"
                )}
              >
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
            {change !== undefined && <span className="text-muted-foreground ml-1">from last period</span>}
          </p>
        )}
      </div>
    </Card>
  );
};
