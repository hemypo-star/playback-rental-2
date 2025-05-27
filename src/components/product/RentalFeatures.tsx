import { PackageIcon, CheckIcon, Truck, ShieldCheck, Calendar } from 'lucide-react';
const RentalFeatures = () => {
  return <div className="p-6 rounded-xl glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
          <PackageIcon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-medium">Условия аренды</h3>
      </div>
      <ul className="space-y-3">
        <li className="flex items-start gap-2">
          <CheckIcon className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span className="text-sm">Профессиональное оборудование в отличном состоянии</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckIcon className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span className="text-sm">Залог - паспорт или фиксированная сумма по договору</span>
        </li>
        
        
        <li className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span className="text-sm">Гибкие сроки аренды от 4 часов до нескольких недель</span>
        </li>
      </ul>
    </div>;
};
export default RentalFeatures;