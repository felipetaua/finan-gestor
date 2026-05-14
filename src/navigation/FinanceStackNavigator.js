import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FinanceScreen from '../screens/finance/FinanceScreen';
import AnalyticsScreen from '../screens/finance/AnalyticsScreen';
import AddTransactionScreen from '../screens/finance/AddTransactionScreen';
import AiAddTransactionScreen from '../screens/finance/AiAddTransactionScreen';
import TransactionsScreen from '../screens/finance/TransactionsScreen';
import AddChallengesScreen from '../screens/finance/AddChallengesScreen';
import BannerDetailScreen from '../screens/finance/BannerDetailScreen';
import PaymentsScreen from '../screens/finance/PaymentsScreen';

const Stack = createStackNavigator();

const FinanceStackNavigator = () => {
    return (
        <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
        >
        <Stack.Screen name="FinanceHome" component={FinanceScreen} />
        <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Stack.Screen 
            name="AiAddTransaction" 
            component={AiAddTransactionScreen} 
            options={{
                presentation: 'transparentModal',
                cardStyleInterpolator: ({ current: { progress } }) => ({
                    cardStyle: {
                        opacity: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                        }),
                    },
                    overlayStyle: {
                        opacity: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.5],
                        }),
                    },
                }),
            }}
        />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
        <Stack.Screen name="AddChallenges" component={AddChallengesScreen} />
        <Stack.Screen name="BannerDetail" component={BannerDetailScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
        </Stack.Navigator>
    );
};

export default FinanceStackNavigator;
