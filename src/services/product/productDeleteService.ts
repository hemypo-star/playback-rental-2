
/**
 * Deletes a product by ID
 * @param id Product ID
 * @returns Success status
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};
