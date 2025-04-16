
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface SelectedPeriodProps {
  from: Date;
  to: Date;
}

const SelectedPeriod = ({ from, to }: SelectedPeriodProps) => {
  if (!from || !to) return null;

  return (
    <div className="mt-4 p-3 bg-primary/10 rounded-md">
      <p className="text-sm font-medium flex items-center">
        <Clock className="h-4 w-4 mr-2" />
        Выбранный период аренды:
      </p>
      <p className="text-sm mt-1">
        {from ? format(from, 'dd.MM.yyyy') : ''} {from?.getHours()}:00 — 
        {to ? format(to, 'dd.MM.yyyy') : format(from, 'dd.MM.yyyy')} {to?.getHours()}:00
      </p>
    </div>
  );
};

export default SelectedPeriod;
