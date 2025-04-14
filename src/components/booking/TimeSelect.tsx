
import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}

const TimeSelect = ({ label, value, onValueChange }: TimeSelectProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: i < 10 ? `0${i}:00` : `${i}:00`
  }));

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Час" />
        </SelectTrigger>
        <SelectContent>
          {hours.map(hour => (
            <SelectItem key={`hour-${hour.value}`} value={hour.value}>
              {hour.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimeSelect;
