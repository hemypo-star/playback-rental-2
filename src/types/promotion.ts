export interface Promotion {
  id: string;
  title: string;
  imageurl: string;
  linkurl: string;
  active: boolean;
  order: number;
  created_at?: string;
  slug?: string;           // Уникальный URL
  content?: string;        // Текст акции
  linked_products?: string[];   // Массив UUID товаров
  linked_categories?: string[]; // Массив UUID категорий
}

export interface PromotionFormValues {
  title: string;
  imageFile: File | null;
  imageUrl?: string;
  linkUrl?: string;        // Сделали необязательным
  active: boolean;
  content?: string;
  linked_products?: string[];
  linked_categories?: string[];
}