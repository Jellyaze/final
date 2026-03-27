import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../app/context/AuthContext';
import RootNavigator from '../app/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App crashed on launch</Text>
          <Text style={styles.errorMessage}>{String(this.state.error.message || this.state.error)}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ErrorBoundary>
            <RootNavigator />
            <StatusBar style="auto" />
          </ErrorBoundary>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
  },
});
