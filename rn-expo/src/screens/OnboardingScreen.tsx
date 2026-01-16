import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const slides: OnboardingItem[] = [
  {
    id: '1',
    title: 'Welcome to BR31 Finance',
    description: 'Your complete offline finance system – secure, private, and yours forever.',
    icon: 'wallet',
    color: '#4F46E5', // Indigo
  },
  {
    id: '2',
    title: 'Your Data Stays With You',
    description: 'No cloud, No internet, No tracking.\nAll your data stays safely on your device.',
    icon: 'shield-checkmark',
    color: '#8B5CF6', // Purple
  },
  {
    id: '3',
    title: 'Track Finances & Generate Reports',
    description: 'Analyze expenses, export data, and manage your finances on mobile & desktop.',
    icon: 'stats-chart',
    color: '#10B981', // Emerald
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.imageContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={100} color={item.color} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 3 }}>
        <FlatList
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={32}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      <View style={styles.footer}>
        {/* Paginator */}
        <View style={styles.paginator}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i.toString()}
                style={[
                  styles.dot,
                  { 
                    width: dotWidth, 
                    opacity,
                    backgroundColor: slides[i].color 
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Next/Get Started Button */}
        <TouchableOpacity 
            style={[
                styles.button, 
                { backgroundColor: slides[currentIndex].color }
            ]} 
            onPress={scrollTo}
            activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
        
        {/* Skip Button (only on first 2 slides) */}
        {currentIndex < slides.length - 1 && (
             <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
                 <Text style={styles.skipText}>Skip</Text>
             </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  footer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40, // More padding for bottom
    width: '100%',
    alignItems: 'center',
  },
  paginator: {
    flexDirection: 'row',
    height: 64,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 8,
  },
  button: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
      padding: 10,
  },
  skipText: {
      color: '#999',
      fontSize: 14,
  }
});
