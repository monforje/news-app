import 'dotenv/config';

export default {
  expo: {
    name: 'balanced-news-app',
    slug: 'balanced-news-app',
    version: '1.0.0',
    extra: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001'
    }
  }
};
