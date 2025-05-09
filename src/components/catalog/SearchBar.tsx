
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormEvent } from 'react';

interface SearchBarProps {
  onSubmit: (searchQuery: string) => void;
  defaultValue?: string;
}

const SearchBar = ({ onSubmit, defaultValue = '' }: SearchBarProps) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    onSubmit(searchInput?.value || '');
  };

  return (
    <div className="relative flex-1 w-full">
      <form onSubmit={handleSubmit}>
        <Input
          id="search-input"
          placeholder="Поиск оборудования..."
          className="pl-10 bg-white/90 border-0 h-12"
          defaultValue={defaultValue}
        />
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Button type="submit" className="sr-only">Поиск</Button>
      </form>
    </div>
  );
};

export default SearchBar;
