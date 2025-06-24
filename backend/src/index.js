import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickSources } from './feed.js';
import { getArticlesBySources } from './newsapi.js';
import { getCache, setCache } from './cache.js';
import { parseArticle } from './article.js';
import { saveReaction } from './db.js';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из корневой папки проекта
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Отладочная информация для проверки загрузки .env
console.log('Environment variables status:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- NEWSAPI_KEY present:', !!process.env.NEWSAPI_KEY);
console.log('- NEWSAPI_KEY length:', process.env.NEWSAPI_KEY?.length || 0);
console.log('- REDIS_URL present:', !!process.env.REDIS_URL);
console.log('- PG_CONNECTION_STRING present:', !!process.env.PG_CONNECTION_STRING);

const app = express();

// Настраиваем CORS для всех источников в dev режиме
app.use(cors({
  origin: true, // разрешаем все источники в dev
  credentials: true
}));

app.use(express.json());

// Логирование для отладки
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.query);
  next();
});

// /feed эндпоинт
app.get('/feed', async (req, res) => {
  const x = parseFloat(req.query.x);
  const y = parseFloat(req.query.y);
  
  console.log('Feed request with coordinates:', { x, y });
  
  if (isNaN(x) || isNaN(y)) {
    return res.status(400).json({ error: 'x and y required' });
  }
  
  const cacheKey = `feed:${x.toFixed(3)}:${y.toFixed(3)}`;
  
  try {
    // Проверяем кеш
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('Returning cached feed');
      return res.json(JSON.parse(cached));
    }

    console.log('No cache, fetching fresh articles...');
    
    // Получаем источники
    const sources = pickSources(x, y);
    console.log('Selected sources:', sources);
    
    if (sources.length === 0) {
      return res.json([]);
    }

    // Получаем статьи
    const articles = await getArticlesBySources(sources.map(s => s.id));
    console.log(`Got ${articles.length} articles from NewsAPI`);
    
    // Показываем все полученные статьи для отладки
    if (articles.length > 0) {
      console.log('Available articles by source:');
      articles.forEach(article => {
        console.log(`  - ${article.source?.id}: ${article.title}`);
      });
    }
    
    // Формируем карточки
    const cards = [];
    
    for (const src of sources) {
      // Ищем статью для этого источника
      const art = articles.find(a => a.source && a.source.id === src.id);
      
      if (art) {
        cards.push({
          articleId: art.url,
          title: art.title,
          sourceId: src.id,
          sourceName: src.name,
          imageUrl: art.urlToImage,
          url: art.url,
          publishedAt: art.publishedAt,
          side: src.side
        });
        console.log(`✓ Found article for ${src.id}: ${art.title}`);
      } else {
        console.log(`✗ No articles found for source: ${src.id}`);
        
        // Если нет точного совпадения, берем любую статью (для демо)
        if (articles.length > 0) {
          const fallbackArticle = articles[cards.length % articles.length];
          cards.push({
            articleId: fallbackArticle.url,
            title: fallbackArticle.title,
            sourceId: src.id,
            sourceName: src.name,
            imageUrl: fallbackArticle.urlToImage,
            url: fallbackArticle.url,
            publishedAt: fallbackArticle.publishedAt,
            side: src.side
          });
          console.log(`→ Used fallback article for ${src.id}: ${fallbackArticle.title}`);
        }
      }
    }
    
    console.log(`Returning ${cards.length} cards`);
    
    // Кешируем результат
    if (cards.length > 0) {
      await setCache(cacheKey, JSON.stringify(cards), 1800); // 30 мин
    }
    
    res.json(cards);
    
  } catch (e) {
    console.error('Error in /feed:', e);
    res.status(500).json({ 
      error: 'Failed to fetch articles', 
      details: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// /article эндпоинт
app.get('/article', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  
  const cacheKey = `article:${encodeURIComponent(url)}`;
  
  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const article = await parseArticle(url);
    await setCache(cacheKey, JSON.stringify(article), 86400); // 24ч
    res.json(article);
    
  } catch (e) {
    console.error('Error in /article:', e);
    res.status(500).json({ 
      error: 'Failed to parse article', 
      details: e.message 
    });
  }
});

// /reaction эндпоинт
app.post('/reaction', async (req, res) => {
  try {
    const { userId, articleId, emoji, ts } = req.body;
    
    if (!userId || !articleId || !emoji) {
      return res.status(400).json({ error: 'userId, articleId, and emoji required' });
    }
    
    console.log('Saving reaction:', { userId, emoji, articleId: articleId.substring(0, 50) + '...' });
    
    await saveReaction({ userId, articleId, emoji, ts: ts || Date.now() });
    res.json({ status: 'ok' });
    
  } catch (e) {
    console.error('Error in /reaction:', e);
    res.status(500).json({ 
      error: 'Failed to save reaction', 
      details: e.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    newsApiKeyPresent: !!process.env.NEWSAPI_KEY
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Привязываемся ко всем интерфейсам

app.listen(PORT, HOST, () => {
  console.log(`Balanced News backend listening on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.1.123:${PORT}`);
});