
import { cn } from '@/lib/utils';
import TimeSelect from './TimeSelect';

interface BookingPeriodSelectProps {
  startHour: string;
  endHour: string;
  onStartHourChange: (value: string) => void;
  onEndHourChange: (value: string) => void;
  className?: string;
}

const BookingPeriodSelect = ({
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
  className
}: BookingPeriodSelectProps) => {
  return (
    <div className={cn("p-4 border-t bg-muted/20", className)}>
      <div className="grid grid-cols-2 gap-4">
        <TimeSelect
          label="Время начала"
          value={startHour}
          onValueChange={onStartHourChange}
        />
        <TimeSelect
          label="Время окончания"
          value={endHour}
          onValueChange={onEndHourChange}
        />
      </div>
    </div>
  );
};

export default BookingPeriodSelect;
