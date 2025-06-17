
import { supabase } from "@/integrations/supabase/client";
import { addDays } from 'date-fns';

// Sample data for initial DB population
const sampleProducts = [
  {
    title: 'Sony Alpha A7 III',
    description: 'Полнокадровая беззеркальная камера с разрешением 24.2 МП',
    price: 4500,
    category: '1', // Store as string in database
    category_id: 1, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84',
    available: true,
    quantity: 3
  },
  {
    title: 'Canon EF 70-200mm f/2.8L IS III USM',
    description: 'Телеобъектив с постоянной диафрагмой для профессиональных фотографов',
    price: 2800,
    category: '2', // Store as string in database
    category_id: 2, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1499085650423-45149d8166a6',
    available: true,
    quantity: 2
  },
  {
    title: 'Godox SL-60W LED',
    description: 'Постоянный LED свет мощностью 60Вт с управлением через пульт',
    price: 1200,
    category: '3', // Store as string in database
    category_id: 3, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1534003276576-0cbfc449fb6f',
    available: true,
    quantity: 5
  },
  {
    title: 'Rode VideoMic Pro+',
    description: 'Направленный микрофон для камер и DSLR с улучшенным качеством звука',
    price: 950,
    category: '4', // Store as string in database
    category_id: 4, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1520170350707-b2da59970118',
    available: false,
    quantity: 4
  },
  {
    title: 'DJI Ronin-S',
    description: 'Трехосевой стабилизатор для DSLR и беззеркальных камер',
    price: 2100,
    category: '5', // Store as string in database
    category_id: 5, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1542192143-6cb2c972e497',
    available: true,
    quantity: 2
  },
  {
    title: 'Blackmagic Pocket Cinema Camera 6K',
    description: 'Кинокамера с разрешением 6K и записью в Blackmagic RAW',
    price: 5200,
    category: '6', // Store as string in database
    category_id: 6, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1585939268110-1fa0f2a708b5',
    available: true,
    quantity: 1
  },
  {
    title: 'DJI Mavic 3',
    description: 'Профессиональный дрон с камерой Hasselblad и увеличенным временем полета',
    price: 6500,
    category: '7', // Store as string in database
    category_id: 7, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44',
    available: true,
    quantity: 2
  },
  {
    title: 'Zoom H6',
    description: 'Портативный аудиорекордер с 6 входами и сменными микрофонными капсюлями',
    price: 1800,
    category: '4', // Store as string in database
    category_id: 4, // New category_id field
    imageurl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04',
    available: true,
    quantity: 3
  }
];

// Function to seed the database with initial data
export const seedDatabase = async () => {
  try {
    const { data: existingCategories } = await supabase.from('categories').select('*');
    const { data: existingProducts } = await supabase.from('products').select('*');
    
    // Only seed if there's no data
    if ((!existingCategories || existingCategories.length === 0) && (!existingProducts || existingProducts.length === 0)) {
      console.log('Seeding database with initial data...');
      
      // Add categories with category_id
      const categories = [
        {
          name: 'Фотокамеры',
          category_id: 1,
          slug: 'photo-cameras',
          description: 'Профессиональные и любительские фотокамеры',
          imageurl: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Объективы',
          category_id: 2,
          slug: 'lenses',
          description: 'Объективы для различных типов съемки',
          imageurl: 'https://images.unsplash.com/photo-1499085650423-45149d8166a6?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Освещение',
          category_id: 3,
          slug: 'lighting',
          description: 'Профессиональное световое оборудование',
          imageurl: 'https://images.unsplash.com/photo-1534003276576-0cbfc449fb6f?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Аудио',
          category_id: 4,
          slug: 'audio',
          description: 'Микрофоны и звукозаписывающее оборудование',
          imageurl: 'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Стабилизаторы',
          category_id: 5,
          slug: 'stabilizers',
          description: 'Стабилизирующее оборудование для камер',
          imageurl: 'https://images.unsplash.com/photo-1542192143-6cb2c972e497?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Видеокамеры',
          category_id: 6,
          slug: 'video-cameras',
          description: 'Профессиональные видеокамеры',
          imageurl: 'https://images.unsplash.com/photo-1585939268110-1fa0f2a708b5?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Дроны',
          category_id: 7,
          slug: 'drones',
          description: 'Беспилотные летательные аппараты для съемки',
          imageurl: 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?auto=format&fit=crop&w=800&q=80'
        }
      ];
      
      for (const category of categories) {
        await supabase.from('categories').insert([category]);
      }
      
      // Insert products
      const { error: productsError } = await supabase
        .from('products')
        .insert(sampleProducts);
      
      if (productsError) {
        console.error('Error seeding products:', productsError);
        return;
      }
      
      // Get product IDs
      const { data: products } = await supabase
        .from('products')
        .select('id, title');
      
      if (!products || products.length === 0) {
        console.error('No products found after seeding');
        return;
      }

      // Create sample bookings with proper dates
      const currentDate = new Date();
      const nextWeek = addDays(currentDate, 7);
      const twoWeeksLater = addDays(currentDate, 14);
      const threeWeeksLater = addDays(currentDate, 21);
      
      const sampleBookings = [
        {
          product_id: products.find(p => p.title === 'Sony Alpha A7 III')?.id,
          start_date: currentDate.toISOString(),
          end_date: nextWeek.toISOString(),
          customer_name: 'Иван Петров',
          customer_email: 'ivan@example.com',
          customer_phone: '+7 (999) 123-4567',
          status: 'confirmed',
          total_price: 4500 * 7,
          notes: null
        },
        {
          product_id: products.find(p => p.title === 'Godox SL-60W LED')?.id,
          start_date: nextWeek.toISOString(),
          end_date: twoWeeksLater.toISOString(),
          customer_name: 'Анна Сидорова',
          customer_email: 'anna@example.com',
          customer_phone: '+7 (999) 765-4321',
          status: 'pending',
          total_price: 1200 * 7,
          notes: 'Нужен дополнительный аккумулятор'
        },
        {
          product_id: products.find(p => p.title === 'DJI Mavic 3')?.id,
          start_date: twoWeeksLater.toISOString(),
          end_date: threeWeeksLater.toISOString(),
          customer_name: 'Алексей Иванов',
          customer_email: 'alex@example.com',
          customer_phone: '+7 (999) 111-2222',
          status: 'confirmed',
          total_price: 6500 * 7,
          notes: null
        }
      ];
      
      // Insert bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .insert(sampleBookings);
      
      if (bookingsError) {
        console.error('Error seeding bookings:', bookingsError);
        return;
      }
      
      console.log('Database seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
