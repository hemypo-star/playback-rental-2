
import Layout from '../components/Layout';
import { HowItWorksSection } from '../src/components/home/HowItWorksSection';

const HowItWorks = () => {
  return (
    <Layout title="Как это работает" description="Узнайте, как арендовать оборудование">
      <div className="min-h-screen">
        <div className="pt-16">
          <HowItWorksSection />
        </div>
      </div>
    </Layout>
  );
};

export default HowItWorks;
