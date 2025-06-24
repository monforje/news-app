import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  Image,
  Alert,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Определяем URL в зависимости от платформы
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Используйте ваш ngrok URL или туннель URL
    return 'https://undjgu-2a01-620-1c4b-a400-2c-e180-9897-8f1d.ru.tuna.am'; // ЗАМЕНИТЕ НА ВАШ ТЕКУЩИЙ ТУННЕЛЬ URL
  } else {
    // В продакшене
    return 'http://193.23.219.62:3001';
  }
};

const API_BASE_URL = getApiBaseUrl();

export default function FeedScreen({ navigation }) {
  const [cards, setCards] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBias, setUserBias] = useState(null);

  // Конфигурация axios для лучшей совместимости
  const axiosConfig = {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const fetchFeed = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      console.log('Platform:', Platform.OS);
      console.log('Fetching feed from:', API_BASE_URL);
      
      const biasString = await AsyncStorage.getItem('bias');
      if (!biasString) {
        Alert.alert('Ошибка', 'Необходимо пройти квиз заново', [
          { text: 'OK', onPress: () => navigation.replace('Quiz') }
        ]);
        return;
      }
      
      const bias = JSON.parse(biasString);
      setUserBias(bias);
      console.log('Using bias for feed:', bias);
      
      // Проверяем доступность сервера
      const healthUrl = `${API_BASE_URL}/health`;
      console.log('Checking server health at:', healthUrl);
      
      try {
        const healthResponse = await axios.get(healthUrl, { 
          ...axiosConfig, 
          timeout: 5000 
        });
        console.log('Server is healthy:', healthResponse.data);
      } catch (healthError) {
        console.error('Health check failed:', healthError.message);
        throw new Error(`Сервер недоступен по адресу ${API_BASE_URL}`);
      }
      
      const feedUrl = `${API_BASE_URL}/feed`;
      console.log('Fetching feed from:', feedUrl);
      
      const response = await axios.get(feedUrl, { 
        ...axiosConfig,
        params: { 
          x: bias.x, 
          y: bias.y, 
          client_ts: Date.now() 
        }
      });
      
      console.log('Feed response status:', response.status);
      console.log('Feed response data:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setCards(response.data);
      } else {
        console.warn('Unexpected response format:', response.data);
        setCards([]);
      }
      
    } catch (err) {
      console.error('Error fetching feed:', err);
      
      let errorMessage = 'Ошибка загрузки новостей';
      
      if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = `Не удается подключиться к серверу.\n\nПроверьте сетевое подключение`;
      } else if (err.response) {
        errorMessage = `Ошибка сервера: ${err.response.status}\n${err.response.data?.error || err.response.statusText}`;
      } else {
        errorMessage = err.message || 'Неизвестная ошибка';
      }
      
      setError(errorMessage);
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [navigation]);

  const resetQuiz = async () => {
    Alert.alert(
      'Сбросить квиз?',
      'Вы пройдете квиз заново и получите новые координаты.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Сбросить', 
          onPress: async () => {
            await AsyncStorage.removeItem('bias');
            navigation.replace('Quiz');
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const formatTimeAgo = (dateString) => {
    try {
      const now = new Date();
      const published = new Date(dateString);
      const diffInHours = Math.floor((now - published) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Только что';
      if (diffInHours === 1) return '1 час назад';
      if (diffInHours < 24) return `${diffInHours} часов назад`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return '1 день назад';
      if (diffInDays < 7) return `${diffInDays} дней назад`;
      return published.toLocaleDateString();
    } catch (e) {
      return 'Недавно';
    }
  };

  const getSideBadgeStyle = (side) => {
    return side === 'friendly' 
      ? [styles.sideBadge, styles.friendlyBadge]
      : [styles.sideBadge, styles.opposingBadge];
  };

  const getSideText = (side) => {
    return side === 'friendly' ? 'Близкие взгляды' : 'Другая точка зрения';
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Article', { url: item.url })}
      activeOpacity={0.7}
    >
      {item.imageUrl && (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.cardImage}
          resizeMode="cover"
          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
        />
      )}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.sourceName}>{item.sourceName}</Text>
          <View style={getSideBadgeStyle(item.side)}>
            <Text style={styles.sideText}>
              {getSideText(item.side)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.cardTitle} numberOfLines={3}>
          {item.title}
        </Text>
        
        <Text style={styles.timeAgo}>
          {formatTimeAgo(item.publishedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {error ? '😔 Ошибка загрузки' : '📰 Новостей пока нет'}
      </Text>
      <Text style={styles.emptyStateText}>
        {error || 'Потяните вниз, чтобы обновить ленту'}
      </Text>
      {error && (
        <View>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFeed}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Balanced News</Text>
            <Text style={styles.headerSubtitle}>
              Сбалансированный взгляд на новости
            </Text>
          </View>
          <TouchableOpacity onPress={resetQuiz} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Новый квиз</Text>
          </TouchableOpacity>
        </View>
        {userBias && (
          <Text style={styles.biasText}>
            Ваши координаты: ({userBias.x.toFixed(2)}, {userBias.y.toFixed(2)})
          </Text>
        )}
        {__DEV__ && (
          <Text style={styles.debugText}>
            {Platform.OS}: {API_BASE_URL}
          </Text>
        )}
      </View>
      
      <FlatList
        data={cards}
        keyExtractor={(item, index) => item.articleId || `item_${index}`}
        renderItem={renderCard}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchFeed}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={cards.length === 0 ? styles.emptyContainer : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  biasText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  friendlyBadge: {
    backgroundColor: '#E8F5E8',
  },
  opposingBadge: {
    backgroundColor: '#FFF2E8',
  },
  sideText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
