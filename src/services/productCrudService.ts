
/**
 * This file re-exports functionality from more specialized product modules
 */

// Import from specific service modules
import { getProducts, getProductById } from './product/productBasicService';
import { createProduct } from './product/productCreateService';
import { updateProduct } from './product/productUpdateService';
import { deleteProduct } from './product/productDeleteService';
import { getAvailableProducts } from './product/productAvailabilityService';

// Re-export all functionality
export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAvailableProducts
};
