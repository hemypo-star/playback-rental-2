
import { PackageIcon, CheckIcon } from 'lucide-react';

const RentalFeatures = () => {
  return (
    <div className="p-6 rounded-xl glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
          <PackageIcon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-medium">Аренда включает в себя</h3>
      </div>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-500" />
          <span>Чехол для переноски</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-500" />
          <span>Основные аксессуары</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-500" />
          <span>Руководство пользователя</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-500" />
          <span>Техническая поддержка</span>
        </li>
      </ul>
    </div>
  );
};

export default RentalFeatures;
