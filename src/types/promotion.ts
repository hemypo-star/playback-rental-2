
export interface Promotion {
  id: string;
  title: string;
  imageurl: string;
  linkurl: string;
  active: boolean;
  order: number;
  created_at?: string;
  slug?: string;
  content?: string;
  linked_products?: string[];
  linked_categories?: string[];
}

export interface PromotionFormValues {
  title: string;
  imageUrl?: string;
  imageFile?: File | null;
  linkUrl?: string;
  active: boolean;
  content?: string; // Новое поле
}
