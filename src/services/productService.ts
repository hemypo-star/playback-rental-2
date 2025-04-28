import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types/product';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

const supabaseServiceClient = createClient(supabaseUrl, supabaseKey);

export const getProducts = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProductById = async (id: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

export const createProduct = async (product: Partial<Product>) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').insert([product]).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const { error } = await supabaseServiceClient.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

export const uploadProductImage = async (file: File): Promise<string> => {
  try {
    const { uploadProductImage: supabaseUploadProductImage } = await import('@/services/supabaseService');
    return await supabaseUploadProductImage(file);
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

export const exportProductsToCSV = async () => {
  try {
    const products = await getProducts();
    
    const headers = ['id', 'title', 'description', 'price', 'category', 'imageurl', 'quantity', 'available'];
    const csvRows = [
      headers.join(','),
      ...products.map(product => 
        headers.map(header => {
          if (typeof product[header as keyof typeof product] === 'string' && product[header as keyof typeof product].includes(',')) {
            return `"${product[header as keyof typeof product]}"`;
          }
          return product[header as keyof typeof product];
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return '';
  }
};

export const importProductsFromCSV = async (csvContent: string) => {
  try {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const product: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index];
        
        if (value && value.startsWith('"') && !value.endsWith('"')) {
          let j = index + 1;
          while (j < values.length) {
            value += ',' + values[j];
            if (values[j].endsWith('"')) break;
            j++;
          }
          value = value.substring(1, value.length - 1);
        }
        
        if (header === 'available') {
          product[header] = value.toLowerCase() === 'true';
        } else if (header === 'price' || header === 'quantity') {
          product[header] = Number(value);
        } else {
          product[header] = value;
        }
      });
      
      products.push(product);
    }
    
    for (const product of products) {
      const { id, ...productData } = product;
      await supabaseServiceClient.from('products').insert([productData]);
    }
    
    return products;
  } catch (error) {
    console.error('Error importing products from CSV:', error);
    return [];
  }
};
