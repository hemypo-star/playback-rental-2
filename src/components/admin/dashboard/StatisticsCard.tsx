import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatisticsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
    text: string;
  };
}

export const StatisticsCard = ({ title, value, icon: Icon, trend }: StatisticsCardProps) => {
  const TrendIcon = trend?.isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className={`flex items-center gap-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <TrendIcon className="h-3 w-3" />
              {trend.value}
            </span>{' '}
            {trend.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
