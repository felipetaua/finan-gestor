import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import OnboardingHeader from '../../components/common/OnboardingHeader';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function StepScreen1({ navigation }) {
    const { updateOnboardingData } = useOnboarding();

    const handleContinue = () => {
        updateOnboardingData('step1', { viewed: true });
        navigation.navigate('StepScreen2');
    };

    return (
        <View style={styles.container}>
            <OnboardingHeader 
                currentStep={1} 
                totalSteps={5} 
                onBack={() => navigation.goBack()} 
            />
            <View style={styles.content}>
                <Image 
                    source={require('../../assets/images/fin.png')}
                    style={styles.imageScreen}
                />
                <Text>Olá eu sou le o Fin! - StepScreen1</Text>
            </View>
            <View style={styles.footer}>
                <Button  
                    onPress={handleContinue} 
                    title="Continuar" 
                    type='primary'
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        
        paddingTop: 60,
    },
    content: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
    },
    imageScreen: {
        width: 170, 
        height: "45%",
        resizeMode: 'contain',
    },
    footer: {
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
    }
});
