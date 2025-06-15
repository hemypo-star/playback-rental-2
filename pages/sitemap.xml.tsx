
import { GetServerSideProps } from 'next';

function generateSiteMap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${baseUrl}</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${baseUrl}/catalog</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.9</priority>
     </url>
     <url>
       <loc>${baseUrl}/contact</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.8</priority>
     </url>
     <url>
       <loc>${baseUrl}/how-it-works</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.7</priority>
     </url>
     <url>
       <loc>${baseUrl}/privacy-policy</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.5</priority>
     </url>
   </urlset>
 `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default SiteMap;
