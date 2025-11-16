// lib/config.ts - IMPROVED VERSION
export const getBaseUrl = () => {
  // Always respect NEXTAUTH_URL if explicitly set
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // In production on Vercel
  if (process.env.VERCEL_ENV === 'production') {
    // Use VERCEL_PROJECT_PRODUCTION_URL if available, otherwise VERCEL_URL
    const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (productionUrl) {
      return `https://${productionUrl}`;
    }
  }
  
  // In preview/staging on Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Local development - default fallback
  return 'http://localhost:3000';
};

// Use in your middleware or other server components
export const baseUrl = getBaseUrl();