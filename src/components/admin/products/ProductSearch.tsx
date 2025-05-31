
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ProductSearch({ value, onChange, placeholder = "Поиск товаров..." }: ProductSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 max-w-sm"
      />
    </div>
  );
}
