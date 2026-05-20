import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, ScrollView} from 'react-native';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import SelectableOption from '../../components/common/SelectableOption';
import OnboardingHeader from '../../components/common/OnboardingHeader';
import { useOnboarding } from '../../hooks/useOnboarding';


export default function StepScreen4({ navigation }) {
    const { updateOnboardingData } = useOnboarding();
    const [selectedOption, setSelectedOption] = useState(null);
    
    const options = [
        { id: '1', title: '5 min / dia', frequency: 'Leve' },
        { id: '2', title: '10 min / dia', frequency: 'Consistente'},
        { id: '3', title: '15 min / dia' , frequency: 'Focado'},
        { id: '4', title: '30 min / dia', frequency: 'Aprofundado'},
    ];

    const handleContinue = () => {
        const selected = options.find(opt => opt.id === selectedOption);
        updateOnboardingData('step4', selected);
        navigation.navigate('StepScreen5');
    };

    return (
        <View style={styles.container}>
            <OnboardingHeader 
                currentStep={4} 
                totalSteps={5} 
                onBack={() => navigation.goBack()} 
            />
            <Image 
                source={require('../../assets/images/fin-3.png')}
                style={styles.imageScreen}
            />
            
            <View style={styles.content}>
                <Text style={styles.title}>Quanto tempo você quer dedicar?</Text>
                
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {options.map((item) => (
                        <SelectableOption 
                            key={item.id}
                            title={item.title}
                            frequency={item.frequency}
                            isSelected={selectedOption === item.id}
                            onPress={() => setSelectedOption(item.id)}
                        />
                    ))}
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <Button  
                    onPress={handleContinue} 
                    title="Continuar" 
                    type='primary'
                    disabled={!selectedOption}
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
    imageScreen: {
        width: 170, 
        height: 120,
        alignSelf: 'center',
        resizeMode: 'contain',
        marginBottom: 20,
    },
    content: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 18,
    },
    title: {
        fontSize: theme.fontSizes.xl,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    footer: {
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingHorizontal: 18,
    }
});
