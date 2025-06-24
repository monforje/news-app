import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuizScreen from './screens/QuizScreen';
import FeedScreen from './screens/FeedScreen';
import ArticleScreen from './screens/ArticleScreen';

function SplashScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingBias();
  }, []);

  const checkExistingBias = async () => {
    try {
      const bias = await AsyncStorage.getItem('bias');
      console.log('Existing bias found:', bias);
      if (bias) {
        // Если bias уже есть, переходим сразу к ленте
        navigation.replace('Feed');
      }
    } catch (error) {
      console.error('Error checking bias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balanced News</Text>
      <Text style={styles.subtitle}>
        Выходите из информационного пузыря{'\n'}
        Читайте новости с разных точек зрения
      </Text>
      <Button 
        title="Начать" 
        onPress={() => navigation.replace('Quiz')} 
      />
    </View>
  );
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="Article" component={ArticleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
