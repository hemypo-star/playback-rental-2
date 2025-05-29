
import { Product } from '@/types/product';
import { getProducts, getProductById, createProduct, updateProduct } from './productCrudService';
import { addCategory } from '@/services/categoryService';

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
    
    // Get existing categories for quick lookup by category_id
    const { getCategories } = await import('@/services/categoryService');
    const existingCategories = await getCategories();
    const categoryIdMap = new Map(existingCategories.map(cat => [cat.category_id, cat]));
    const categoryNameMap = new Map(existingCategories.map(cat => [cat.name.toLowerCase(), cat]));
    
    console.log('Available categories by ID:', Object.fromEntries(categoryIdMap));
    console.log('Available categories by name:', Array.from(categoryNameMap.keys()));
    
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
      const categoryValue = getColumnValue('category', '');
      
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
      
      console.log(`Row ${i}: Extracted image URL: "${imageUrl}"`);
      
      // Skip empty rows or rows with missing required fields
      if (!product.title || !categoryValue) {
        console.warn(`Skipping row ${i+1}: Missing required fields`);
        continue;
      }
      
      // Handle category - check if it's numeric ID or string name
      let categoryToUse = null;
      
      // Try to parse as category_id first
      const categoryId = parseInt(categoryValue, 10);
      if (!isNaN(categoryId) && categoryIdMap.has(categoryId)) {
        // It's a valid category_id
        categoryToUse = categoryIdMap.get(categoryId);
        product.category_id = categoryId;
        console.log(`Row ${i}: Using existing category ID ${categoryId}: ${categoryToUse?.name}`);
      } else {
        // It's a category name - try to find existing category or create new one
        const categoryExists = categoryNameMap.has(categoryValue.toLowerCase());
        
        if (categoryExists) {
          categoryToUse = categoryNameMap.get(categoryValue.toLowerCase());
          product.category_id = categoryToUse?.category_id;
          console.log(`Row ${i}: Using existing category by name "${categoryValue}": ID ${categoryToUse?.category_id}`);
        } else {
          console.log(`Row ${i}: Creating new category: ${categoryValue}`);
          const newCategory = await addCategory({ 
            name: categoryValue,
            slug: categoryValue.toLowerCase().replace(/\s+/g, '-')
          });
          
          if (newCategory) {
            categoryIdMap.set(newCategory.category_id, newCategory);
            categoryNameMap.set(newCategory.name.toLowerCase(), newCategory);
            categoryToUse = newCategory;
            product.category_id = newCategory.category_id;
            console.log(`Row ${i}: Created new category "${categoryValue}" with ID ${newCategory.category_id}`);
          } else {
            console.error(`Row ${i}: Failed to create category ${categoryValue}`);
            continue;
          }
        }
      }
      
      if (!categoryToUse) {
        console.error(`Row ${i}: No valid category found for "${categoryValue}"`);
        continue;
      }
      
      products.push(product);
    }
    
    console.log(`Processed ${products.length} products from CSV`);
    
    // Insert products using individual transactions to ensure better error handling
    for (const product of products) {
      try {
        const { id, ...productData } = product;
        
        // Log the image URL and category_id before creating/updating product
        console.log(`Processing product "${productData.title}" with category_id: ${productData.category_id}, image URL: "${productData.imageurl}"`);
        
        // Handle existing products (update) vs. new products (insert)
        if (id) {
          const existingProduct = await getProductById(id);
          if (existingProduct) {
            await updateProduct(id, productData);
          } else {
            await createProduct(productData, productData.imageurl);
          }
        } else {
          // Pass the image URL directly to createProduct
          await createProduct(productData, productData.imageurl);
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
