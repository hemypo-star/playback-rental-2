
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '@/components/home/HeroSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import CallToActionSection from '@/components/home/CallToActionSection';

const Index = () => {
  const navigate = useNavigate();

  // Redirect to catalog if this is meant to be a redirect-only page
  // Comment out the useEffect below if you want to show the home page content
  /*
  useEffect(() => {
    navigate('/catalog');
  }, [navigate]);
  */

  return (
    <div className="min-h-screen">
      <HeroSection />
      <CategoriesSection />
      <FeaturedProductsSection />
      <HowItWorksSection />
      <CallToActionSection />
    </div>
  );
};

export default Index;
