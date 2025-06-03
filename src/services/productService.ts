
/**
 * This file serves as a facade for all product-related services
 * Re-exports functionality from more specialized modules
 */

// Re-export CRUD operations - using all products for admin
export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from './productCrudService';

// Re-export availability operations - these use filtered products for catalog
export {
  getAvailableProducts,
  isProductAvailable
} from './product/productAvailabilityService';

// Re-export the catalog-specific function for available products only
export { getAvailableProductsOnly } from './product/productBasicService';

// Re-export CSV operations
export {
  exportProductsToCSV,
  importProductsFromCSV
} from './productCsvService';
