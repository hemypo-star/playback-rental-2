
import { useState } from 'react';
import { Category } from '@/types/product';

export const useCategoryFormState = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
  }>({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'name' && (!formData.slug || formData.slug === '')) {
      setFormData((prev) => ({
        ...prev,
        slug: value.toLowerCase().replace(/\s+/g, '-'),
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setEditCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
    setUploadType('file');
    setNewCategoryName('');
    setFileForCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
    });
    setImagePreview(category.imageUrl || '');
    setUploadType(category.imageUrl?.startsWith('http') ? 'url' : 'file');
    setOpenDialog(true);
  };

  return {
    openDialog,
    setOpenDialog,
    editCategory,
    setEditCategory,
    showAddSection,
    setShowAddSection,
    newCategoryName,
    setNewCategoryName,
    fileForCategory,
    setFileForCategory,
    formData,
    setFormData,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    uploadType,
    setUploadType,
    handleInputChange,
    handleFileChange,
    resetForm,
    handleEdit,
  };
};
