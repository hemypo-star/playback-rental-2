
export interface Promotion {
  id: string;
  title: string;
  imageurl: string;
  linkurl: string;
  order: number;
  active: boolean;
  created_at?: string;
}

export interface PromotionFormValues {
  title: string;
  imageUrl?: string;
  imageFile?: File | null;
  linkUrl: string;
  active: boolean;
}
