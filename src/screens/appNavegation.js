import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import MainStackNavigator from '../navigation/MainStackNavigator';
import AuthStackNavigator from '../navigation/AuthStackNavigator';
import SplashScreen from './splash/SplashScreen';
import { auth } from '../services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export default function AppNavigation() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("AppNavigation: estado de autenticação mudou. User:", user ? user.email : "null");
            if (user) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        });

        return unsubscribe;
    }, []);

    if (isLoading) {
        return <SplashScreen onFinish={() => setIsLoading(false)} />;
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainStackNavigator /> : <AuthStackNavigator />}
            <StatusBar style="auto" />
        </NavigationContainer>
    );
}
