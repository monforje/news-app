import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// Базовый URL API из конфигурации Expo (.env)
const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:3001';

export default function ArticleScreen({ route, navigation }) {
  const { url } = route.params;
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [reactionStatus, setReactionStatus] = useState('');

  const axiosConfig = {
    timeout: 20000, // 20 секунд для парсинга статьи
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  useEffect(() => {
    fetchArticle();
  }, [url]);

  const fetchArticle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching article from:', `${API_BASE_URL}/article`);
      console.log('Article URL:', url);
      
      const response = await axios.get(`${API_BASE_URL}/article`, { 
        ...axiosConfig,
        params: { url }
      });
      
      console.log('Article response:', response.data);
      setArticle(response.data);
      
    } catch (err) {
      console.error('Error fetching article:', err);
      
      let errorMessage = 'Ошибка загрузки статьи';
      
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = `Не удается подключиться к серверу парсинга статей.\nСервер: ${API_BASE_URL}`;
      } else if (err.response) {
        errorMessage = `Ошибка сервера: ${err.response.status}\n${err.response.data?.error || err.response.statusText}`;
      } else if (err.request) {
        errorMessage = 'Запрос не дошел до сервера. Проверьте подключение к интернету.';
      } else {
        errorMessage = err.message || 'Неизвестная ошибка';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReaction = async (emoji) => {
    try {
      // Генерируем или получаем device ID
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      console.log('Sending reaction:', { emoji, deviceId, url });

      const response = await axios.post(`${API_BASE_URL}/reaction`, {
        userId: deviceId,
        articleId: url,
        emoji,
        ts: Date.now()
      }, axiosConfig);

      console.log('Reaction response:', response.data);

      setSelectedReaction(emoji);
      setReactionStatus('Спасибо за вашу реакцию!');
      
      // Убираем статус через 3 секунды
      setTimeout(() => setReactionStatus(''), 3000);
      
    } catch (err) {
      console.error('Error sending reaction:', err);
      
      let errorMessage = 'Не удалось отправить реакцию';
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = 'Проблема с сетью. Реакция не отправлена.';
      }
      
      Alert.alert('Ошибка', errorMessage);
    }
  };

  const openOriginalArticle = () => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getReactionButton = (emoji, label) => {
    const isSelected = selectedReaction === emoji;
    return (
      <TouchableOpacity
        style={[
          styles.reactionButton,
          isSelected && styles.selectedReactionButton
        ]}
        onPress={() => sendReaction(emoji)}
      >
        <Text style={[
          styles.reactionEmoji,
          isSelected && styles.selectedReactionEmoji
        ]}>
          {getEmojiIcon(emoji)}
        </Text>
        <Text style={[
          styles.reactionLabel,
          isSelected && styles.selectedReactionLabel
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const getEmojiIcon = (emoji) => {
    switch (emoji) {
      case 'like': return '👍';
      case 'meh': return '😐';
      case 'dislike': return '👎';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка статьи...</Text>
          <Text style={styles.loadingSubtext}>
            Извлекаем и обрабатываем контент
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>😔 Ошибка</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchArticle}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.originalButton} onPress={openOriginalArticle}>
            <Text style={styles.originalButtonText}>Открыть оригинал</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <Text style={styles.debugInfo}>
              API: {API_BASE_URL}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Назад</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openOriginalArticle}>
          <Text style={styles.originalLink}>Оригинал</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{article.title}</Text>
        
        {article.author && (
          <Text style={styles.author}>Автор: {article.author}</Text>
        )}
        
        {article.publishedAt && (
          <Text style={styles.publishedAt}>
            {formatDate(article.publishedAt)}
          </Text>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.articleContent}>
            {article.htmlContent?.replace(/<[^>]*>/g, '') || 'Содержимое статьи недоступно'}
          </Text>
        </View>

        {article.readingTimeSec && (
          <Text style={styles.readingTime}>
            Время чтения: ~{Math.ceil(article.readingTimeSec / 60)} мин
          </Text>
        )}
      </ScrollView>

      <View style={styles.reactionsContainer}>
        <Text style={styles.reactionsTitle}>Ваше мнение о статье:</Text>
        
        <View style={styles.reactionsRow}>
          {getReactionButton('like', 'Нравится')}
          {getReactionButton('meh', 'Нейтрально')}
          {getReactionButton('dislike', 'Не нравится')}
        </View>

        {reactionStatus ? (
          <Text style={styles.reactionStatus}>{reactionStatus}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  originalLink: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 30,
    marginTop: 16,
    marginBottom: 12,
  },
  author: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  publishedAt: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  contentContainer: {
    marginBottom: 20,
  },
  articleContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'justify',
  },
  readingTime: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  originalButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  originalButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  reactionsContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  reactionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  reactionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  selectedReactionButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  selectedReactionEmoji: {
    // эмодзи не меняется при выборе
  },
  reactionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  selectedReactionLabel: {
    color: '#fff',
  },
  reactionStatus: {
    fontSize: 14,
    color: '#28a745',
    textAlign: 'center',
    fontWeight: '600',
  },
});
