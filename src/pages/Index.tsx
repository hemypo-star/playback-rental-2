
import { HeroSection } from '@/components/home/HeroSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { CallToActionSection } from '@/components/home/CallToActionSection';
import { PromotionsSlider } from '@/components/home/PromotionsSlider';

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <PromotionsSlider />
      <CategoriesSection />
      <HowItWorksSection />
      <CallToActionSection />
    </div>
  );
};

export default Index;
