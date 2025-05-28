
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
  deleteProduct
} from './productCrudService';

// Re-export availability operations
export {
  getAvailableProducts,
  isProductAvailable
} from './product/productAvailabilityService';

// Re-export CSV operations
export {
  exportProductsToCSV,
  importProductsFromCSV
} from './productCsvService';
