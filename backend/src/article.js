import axios from 'axios';

// TODO: заменить на Mercury/Readability
export async function parseArticle(url) {
  // Заглушка: просто возвращаем title и htmlContent
  const { data } = await axios.get(url);
  return {
    title: url,
    author: '',
    publishedAt: '',
    htmlContent: data,
    readingTimeSec: 120
  };
} 