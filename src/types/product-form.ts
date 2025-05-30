
export interface ProductFormValues {
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  imageFile?: File | null;
  available: boolean;
  quantity: number;
}
