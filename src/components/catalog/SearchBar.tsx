
import { SearchIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormEvent, useState, useEffect } from 'react';

interface SearchBarProps {
  onSubmit: (searchQuery: string) => void;
  defaultValue?: string;
}

const SearchBar = ({ onSubmit, defaultValue = '' }: SearchBarProps) => {
    const [value, setValue] = useState(defaultValue);

      useEffect(() => {
        setValue(defaultValue);
      }, [defaultValue]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
      onSubmit(value);
  };

  const handleClear = () => {
    setValue('');
    onSubmit('');
  };

  return (
    <div className="relative flex-1 w-full">
      <form onSubmit={handleSubmit}>
        <Input
          id="search-input"
          placeholder="Поиск оборудования..."
          className="pl-10 pr-12 bg-white/90 border-0 h-12"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
            aria-label="Очистить поиск"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" className="sr-only">Поиск</Button>
      </form>
    </div>
  );
};

export default SearchBar;
