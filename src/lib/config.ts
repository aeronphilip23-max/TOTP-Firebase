
export const getBaseUrl = () => {
  // Always respect NEXTAUTH_URL if explicitly set
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // In production on Vercel
  if (process.env.VERCEL_ENV === 'production') {
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


export const baseUrl = getBaseUrl();