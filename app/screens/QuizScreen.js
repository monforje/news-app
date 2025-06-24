import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

const QUESTIONS = [
  {
    id: 1,
    text: 'Государство должно активно регулировать экономику',
    axis: 'x' // economic left-right
  },
  {
    id: 2,
    text: 'Свободный рынок лучше всего решает экономические проблемы',
    axis: 'x'
  },
  {
    id: 3,
    text: 'Налоги на богатых должны быть выше',
    axis: 'x'
  },
  {
    id: 4,
    text: 'Традиционные ценности важнее прогрессивных изменений',
    axis: 'y' // social conservative-liberal
  },
  {
    id: 5,
    text: 'Иммиграция приносит больше пользы, чем вреда',
    axis: 'y'
  },
  {
    id: 6,
    text: 'Правительство должно защищать права меньшинств',
    axis: 'y'
  },
];

export default function QuizScreen({ navigation }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(0));
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      try {
        // Вычисляем координаты
        const xQuestions = QUESTIONS.filter(q => q.axis === 'x');
        const yQuestions = QUESTIONS.filter(q => q.axis === 'y');
        
        const xAnswers = xQuestions.map((q, i) => {
          const questionIndex = QUESTIONS.indexOf(q);
          return answers[questionIndex];
        });
        
        const yAnswers = yQuestions.map((q, i) => {
          const questionIndex = QUESTIONS.indexOf(q);
          return answers[questionIndex];
        });
        
        // Для вопросов 2 инвертируем (свободный рынок vs регулирование)
        const adjustedXAnswers = xAnswers.map((answer, i) => {
          return i === 1 ? -answer : answer; // инвертируем второй вопрос
        });
        
        const x = adjustedXAnswers.reduce((a, b) => a + b, 0) / adjustedXAnswers.length;
        const y = yAnswers.reduce((a, b) => a + b, 0) / yAnswers.length;
        
        console.log('Calculated bias:', { x, y });
        
        await AsyncStorage.setItem('bias', JSON.stringify({ x, y }));
        navigation.replace('Feed');
      } catch (error) {
        console.error('Error saving bias:', error);
        alert('Ошибка при сохранении результатов');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const setAnswer = (val) => {
    const arr = [...answers];
    arr[step] = val;
    setAnswers(arr);
  };

  const getSliderValue = (value) => {
    if (value < -0.6) return 'Полностью не согласен';
    if (value < -0.2) return 'Не согласен';
    if (value < 0.2) return 'Нейтрально';
    if (value < 0.6) return 'Согласен';
    return 'Полностью согласен';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Вопрос {step + 1} из {QUESTIONS.length}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((step + 1) / QUESTIONS.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          {QUESTIONS[step].text}
        </Text>
        
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={-1}
            maximumValue={1}
            step={0.1}
            value={answers[step]}
            onValueChange={setAnswer}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E0E0E0"
            thumbStyle={styles.thumb}
          />
          
          <Text style={styles.valueText}>
            {getSliderValue(answers[step])}
          </Text>
        </View>

        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>Не согласен</Text>
          <Text style={styles.scaleLabel}>Согласен</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title={step < QUESTIONS.length - 1 ? 'Далее' : 'Завершить'} 
          onPress={handleNext}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 40,
  },
  progress: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
    lineHeight: 28,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  valueText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 10,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#999',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  thumb: {
    backgroundColor: '#007AFF',
  },
});
