
/**
 * This file serves as a facade for all product-related services
 * Re-exports functionality from more specialized modules
 */

// Re-export CRUD operations
export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAvailableProducts
} from './productCrudService';

// Re-export CSV operations
export {
  exportProductsToCSV,
  importProductsFromCSV
} from './productCsvService';
