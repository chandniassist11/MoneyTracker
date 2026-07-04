import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { store } from './src/store/store';
import { initDbThunk } from './src/store/financeSlice';
import { useAppDispatch } from './src/hooks/useRedux';
import { COLORS } from './src/theme/theme';

import DashboardScreen from './src/screens/DashboardScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import TransactionEntryScreen from './src/screens/TransactionEntryScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab Navigator ────────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 56 : 70,
          paddingBottom: Platform.OS === 'web' ? 8 : 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['home', 'home-outline'],
            Accounts: ['wallet', 'wallet-outline'],
            Transactions: ['receipt', 'receipt-outline'],
            Budgets: ['pie-chart', 'pie-chart-outline'],
            Analytics: ['bar-chart', 'bar-chart-outline'],
          };
          const [activeIcon, inactiveIcon] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? activeIcon : inactiveIcon) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack (includes modal screens) ─────────────────────────────────────
function RootNavigator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initDbThunk());
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.bg } }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="TransactionEntry"
        component={TransactionEntryScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: COLORS.bg },
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
