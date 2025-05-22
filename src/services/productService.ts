
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';
import { getProductImageUrl, uploadProductImage } from '@/utils/imageUtils';
import { addCategory, getCategoryById, getCategories } from '@/services/categoryService';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl
    })) || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

export const createProduct = async (product: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Creating product:", product, "with image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    let imageFileName = product.imageUrl || '';
    
    // If we have an image (file or URL), upload or use it
    if (imageFile) {
      try {
        if (typeof imageFile === 'string') {
          console.log("Using external URL for product image");
          imageFileName = imageFile;
        } else {
          console.log("Uploading image file before creating product");
          imageFileName = await uploadProductImage(imageFile);
        }
        console.log("Image ready, filename/URL:", imageFileName);
      } catch (uploadError) {
        console.error("Error with product image:", uploadError);
        // Continue with product creation even if image handling fails
      }
    }
    
    // Make sure we're using imageurl for the database column and all required fields are present
    const dbProduct = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || '',
      imageurl: imageFileName, // Use the uploaded image filename or URL
      quantity: product.quantity || 1,
      available: product.available !== undefined ? product.available : true
    };
    
    // Validate that all required fields have values
    if (!dbProduct.title || !dbProduct.category) {
      throw new Error("Product title and category are required fields");
    }
    
    // Insert the product
    const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
    
    if (error) {
      console.error("Error inserting product:", error);
      throw error;
    }
    
    if (!data) {
      console.error("No data returned from product insertion");
      return null;
    }
    
    console.log("Product created:", data);
    
    // Map imageurl to imageUrl for consistency in the frontend
    return {
      ...data,
      imageUrl: data.imageurl
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Updating product:", id, "with updates:", updates, "and image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    // If there's an image (file or URL), handle it appropriately
    let fileName = null;
    if (imageFile) {
      console.log("Processing new image for product:", id);
      try {
        if (typeof imageFile === 'string') {
          fileName = imageFile; // Use the URL directly
          console.log("Using external URL for image:", fileName);
        } else {
          fileName = await uploadProductImage(imageFile, id);
          console.log("Image uploaded, filename:", fileName);
        }
      } catch (uploadError) {
        console.error("Error with image:", uploadError);
        // Continue with the update even if the image handling fails
      }
    }
    
    // Make sure we're using imageurl for the database column
    const dbUpdates: Record<string, any> = {};
    
    // Copy specific updated properties to dbUpdates
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.available !== undefined) dbUpdates.available = updates.available;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (fileName !== null) dbUpdates.imageurl = fileName;
    else if (updates.imageUrl !== undefined) dbUpdates.imageurl = updates.imageUrl;
    
    // Check if there's anything to update
    if (Object.keys(dbUpdates).length === 0) {
      console.log("No updates to apply, returning existing product");
      return getProductById(id);
    }
    
    console.log("Updating product with:", dbUpdates);
    
    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    
    console.log("Product updated:", data);
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

// Add the missing getAvailableProducts function
export const getAvailableProducts = async (startDate: Date, endDate: Date): Promise<Product[]> => {
  try {
    const products = await getProducts();
    const { getBookings } = await import('./bookingService');
    const bookings = await getBookings();
    
    // Filter out products that have bookings in the requested period
    return products.filter(product => {
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        booking.status !== 'cancelled' &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // If the product has quantity > number of bookings, it's still available
      return productBookings.length < (product.quantity || 1);
    });
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

// CSV operations with enhanced reliability
export const exportProductsToCSV = async () => {
  try {
    const products = await getProducts();
    
    const headers = ['id', 'title', 'description', 'price', 'category', 'imageurl', 'quantity', 'available'];
    const csvRows = [
      headers.join(';'),
      ...products.map(product => 
        headers.map(header => {
          const value = product[header as keyof typeof product];
          let cellValue = String(value);
          
          // Escape quotes and add quotes around fields with special characters
          if (typeof value === 'string' && (
              value.includes(';') || 
              value.includes('"') || 
              value.includes('\r') || 
              value.includes('\n')
          )) {
            cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
          }
          return cellValue;
        }).join(';')
      )
    ];
    
    // Use Windows line breaks for better compatibility
    return csvRows.join('\r\n');
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return '';
  }
};

export const importProductsFromCSV = async (csvContent: string) => {
  try {
    // Remove UTF-8 BOM if present (to fix Russian text)
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    
    // Detect and handle different line break styles
    const lines = csvContent.split(/\r\n|\r|\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }
    
    // Auto-detect delimiter (prioritizing semicolon which is common in Russian locales)
    const possibleDelimiters = [';', ',', '\t'];
    let delimiter = ';'; // Default to semicolon
    
    // Simple heuristic: count occurrences of each delimiter in first line
    const firstLine = lines[0];
    const delimiterCounts = possibleDelimiters.map(d => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(d, 'g')) || []).length
    }));
    
    // Choose delimiter with highest count
    const bestDelimiter = delimiterCounts.sort((a, b) => b.count - a.count)[0];
    if (bestDelimiter && bestDelimiter.count > 0) {
      delimiter = bestDelimiter.delimiter;
    }
    
    console.log(`CSV Import: Detected delimiter "${delimiter}"`);
    
    // Parse header row to determine column positions dynamically
    const headerRow = parseCSVLine(lines[0], delimiter);
    const columnMap = new Map();
    
    // Create a mapping between column names and their positions
    headerRow.forEach((header, index) => {
      // Normalize headers (lowercase, no spaces)
      const normalizedHeader = header.toLowerCase().trim();
      columnMap.set(normalizedHeader, index);
    });
    
    console.log('CSV Import: Detected columns:', Object.fromEntries(columnMap));
    
    // Check if we have the minimum required columns
    const requiredColumns = ['title', 'category'];
    const missingColumns = requiredColumns.filter(col => 
      !Array.from(columnMap.keys()).some(key => key.includes(col))
    );
    
    if (missingColumns.length > 0) {
      throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
    }
    
    const products = [];
    
    // Get existing categories for quick lookup
    const existingCategories = await getCategories();
    const categoryMap = new Map(existingCategories.map(cat => [cat.name.toLowerCase(), cat]));
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i], delimiter);
      const product: Record<string, any> = {};
      
      // Map column values to product properties
      const getColumnValue = (columnName: string, defaultValue: any = null) => {
        // Try exact match first
        let index = columnMap.get(columnName.toLowerCase());
        
        // If not found, try partial match
        if (index === undefined) {
          const foundKey = Array.from(columnMap.keys()).find(key => 
            key.includes(columnName.toLowerCase()) || columnName.toLowerCase().includes(key)
          );
          if (foundKey) index = columnMap.get(foundKey);
        }
        
        // Return value if found and not empty, otherwise default
        if (index !== undefined && index < values.length && values[index].trim() !== '') {
          return values[index].trim();
        }
        return defaultValue;
      };
      
      // Map essential fields
      product.id = getColumnValue('id');
      product.title = getColumnValue('title', '');
      product.description = getColumnValue('description', '');
      product.category = getColumnValue('category', '');
      
      // Handle numeric fields with proper conversion
      const price = getColumnValue('price', '0');
      product.price = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      
      const quantity = getColumnValue('quantity', '1');
      product.quantity = parseInt(quantity, 10) || 1;
      
      // Handle boolean fields
      const availableValue = getColumnValue('available', 'true');
      product.available = availableValue.toLowerCase() === 'true' || availableValue === '1' || availableValue.toLowerCase() === 'да';
      
      // Handle image URL special case
      const imageUrl = getColumnValue('imageurl', '');
      product.imageurl = imageUrl;
      
      // Skip empty rows or rows with missing required fields
      if (!product.title || !product.category) {
        console.warn(`Skipping row ${i+1}: Missing required fields`);
        continue;
      }
      
      // Ensure category exists or create it
      if (product.category) {
        const categoryExists = categoryMap.has(product.category.toLowerCase());
        
        if (!categoryExists) {
          console.log(`Creating new category: ${product.category}`);
          const newCategory = await addCategory({ 
            name: product.category,
            slug: product.category.toLowerCase().replace(/\s+/g, '-')
          });
          
          if (newCategory) {
            categoryMap.set(newCategory.name.toLowerCase(), newCategory);
          }
        }
      }
      
      products.push(product);
    }
    
    console.log(`Processed ${products.length} products from CSV`);
    
    // Insert products using individual transactions to ensure better error handling
    for (const product of products) {
      try {
        const { id, ...productData } = product;
        
        // Handle existing products (update) vs. new products (insert)
        if (id) {
          const existingProduct = await getProductById(id);
          if (existingProduct) {
            await updateProduct(id, productData);
          } else {
            await createProduct(productData);
          }
        } else {
          await createProduct(productData);
        }
      } catch (error) {
        console.error(`Error processing product: ${product.title}`, error);
        // Continue with next product rather than failing the entire import
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error importing products from CSV:', error);
    throw error;
  }
};

// Enhanced helper function to parse CSV lines considering quoted fields
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(currentValue);
      currentValue = '';
    } else {
      // Regular character
      currentValue += char;
    }
  }
  
  // Add the last field
  result.push(currentValue);
  return result;
}
