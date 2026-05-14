import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './BottomTabNavigator';
import LessonScreen from '../screens/home/LessonScreen';

const Stack = createStackNavigator();

const MainStackNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={BottomTabNavigator} />
            <Stack.Screen name="Lesson" component={LessonScreen} />
        </Stack.Navigator>
    );
};

export default MainStackNavigator;