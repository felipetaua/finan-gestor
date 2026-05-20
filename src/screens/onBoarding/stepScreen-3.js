import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import SelectableOption from '../../components/common/SelectableOption';
import OnboardingHeader from '../../components/common/OnboardingHeader';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function StepScreen3({ navigation }) {
    const { updateOnboardingData } = useOnboarding();
    const [selectedOption, setSelectedOption] = useState(null);

    const options = [
        { id: '1', icon: require('../../assets/icons/family.png'), title: 'Amigos/Família' },
        { id: '2', icon: require('../../assets/icons/social.png'), title: 'Redes Sociais' },
        { id: '3', icon: require('../../assets/icons/tiktok.png'), title: 'Vídeos curtos do TikTok' },
        { id: '4', icon: require('../../assets/icons/youtube.png'), title: 'Vídeos do Youtube' },
        { id: '5', icon: require('../../assets/icons/google.png'), title: 'Pesquisa no Google' }, 
        { id: '6', icon: require('../../assets/icons/newsletter.png'), title: 'Newsletter, Blogs e Sites'}
    ];

    const handleContinue = () => {
        const selected = options.find(opt => opt.id === selectedOption);
        // Salvamos apenas o título ou ID para evitar erro de serialização no Firebase com o ícone (require)
        updateOnboardingData('step3', { id: selected.id, title: selected.title });
        navigation.navigate('StepScreen4');
    };

    return (
        <View style={styles.container}>
            <OnboardingHeader 
                currentStep={3} 
                totalSteps={5} 
                onBack={() => navigation.goBack()} 
            />
            <Image 
                source={require('../../assets/images/fin-3.png')}
                style={styles.imageScreen}
            />
            
            <View style={styles.content}>
                <Text style={styles.title}>Como conheceu o Finan?</Text>
                
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {options.map((item) => (
                        <SelectableOption 
                            key={item.id}
                            title={item.title}
                            icon={item.icon}
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
    }
});
