/**
 * Auth Configuration Module
 * Contains Google Sign-In client ID and app settings
 */

const AUTH_CONFIG = {
  // Google OAuth Client ID
  CLIENT_ID: '88663261491-uugvuvfgrq20ftg481k1l6evouh98uon.apps.googleusercontent.com',
  
  // API endpoint
  API_URL: 'https://script.google.com/macros/s/AKfycbzoapuRNn9OeliSHt3s_DtbzDQ1YNntPFYZ-p5wbYeVbJXrmTlXJuuk-gJZ8kX8CQG2/exec',
  
  // Auto-execute for modules
  init() {
    return AUTH_CONFIG;
  }
};

// Export for ES6 modules
export default AUTH_CONFIG;

