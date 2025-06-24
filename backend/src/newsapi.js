import axios from 'axios';

// Временно хардкодим ключ для тестирования
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || '3e2ce6956e1c4a44bbe2097dda9c4d53';
const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';

console.log('NewsAPI Key loaded:', !!NEWSAPI_KEY, 'Length:', NEWSAPI_KEY?.length);

// Получить свежие статьи по списку id источников (макс. 4)
export async function getArticlesBySources(sourceIds) {
  if (!NEWSAPI_KEY) {
    throw new Error('NEWSAPI_KEY not found');
  }
  
  if (!sourceIds || sourceIds.length === 0) {
    return [];
  }
  
  console.log('Fetching articles from NewsAPI for sources:', sourceIds);
  
  try {
    const params = {
      sources: sourceIds.join(','),
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 25,
      apiKey: NEWSAPI_KEY
    };
    
    console.log('NewsAPI request URL:', NEWSAPI_URL);
    console.log('NewsAPI request params:', { 
      ...params, 
      apiKey: `${NEWSAPI_KEY.substring(0, 8)}...` 
    });
    
    const { data } = await axios.get(NEWSAPI_URL, { params });
    
    console.log('NewsAPI response status:', data.status);
    console.log('Total results:', data.totalResults);
    
    if (data.status !== 'ok') {
      console.error('NewsAPI error response:', data);
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`);
    }
    
    if (!data.articles) {
      console.log('No articles in response');
      return [];
    }
    
    console.log(`Got ${data.articles.length} articles from NewsAPI`);
    
    // Показываем даты статей для отладки
    if (data.articles.length > 0) {
      console.log('Sample article dates:');
      data.articles.slice(0, 3).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title} - ${article.publishedAt}`);
      });
    }
    
    // Более мягкая фильтрация: берем статьи за последние 7 дней вместо 24 часов
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log('Filtering articles newer than:', sevenDaysAgo.toISOString());
    
    const recentArticles = data.articles.filter(article => {
      if (!article.publishedAt) {
        console.log('Article without publishedAt:', article.title);
        return false;
      }
      
      const publishedDate = new Date(article.publishedAt);
      const isRecent = publishedDate > sevenDaysAgo;
      
      if (!isRecent) {
        console.log(`Filtered out old article: ${article.title} (${article.publishedAt})`);
      }
      
      return isRecent;
    });
    
    console.log(`Filtered to ${recentArticles.length} recent articles (last 7 days)`);
    
    // Если все еще нет статей, возвращаем просто все статьи без фильтрации
    if (recentArticles.length === 0) {
      console.log('No recent articles found, returning all articles');
      return data.articles;
    }
    
    return recentArticles;
    
  } catch (error) {
    console.error('NewsAPI request failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        throw new Error('Invalid NewsAPI key - check your API key');
      } else if (error.response.status === 429) {
        throw new Error('NewsAPI rate limit exceeded - upgrade your plan or try later');
      }
    }
    
    throw new Error(`Failed to fetch from NewsAPI: ${error.message}`);
  }
}
