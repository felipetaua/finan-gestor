import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { theme } from '../../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingModal = ({ visible, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const lottieRef = useRef(null);

    const steps = [
        {
            title: "Vidas, Moedas & Ofensiva",
            animation: require('../../assets/lottie/streak.json'),
            content: (
                <View style={styles.contentBlock}>
                    <View style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}><MaterialCommunityIcons name="heart" size={24} color="#FF4B4B" /></Text>
                        <View style={styles.bulletTextContainer}>
                            <Text style={styles.bulletTitle}>Vidas (Energia)</Text>
                            <Text style={styles.bulletDesc}>Você tem 6 vidas no total. Respostas erradas consomem vidas, mas elas se regeneram a cada 30 minutos!</Text>
                        </View>
                    </View>
                    <View style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}><MaterialCommunityIcons name="diamond" size={24} color="#1CB0F6" /></Text>
                        <View style={styles.bulletTextContainer}>
                            <Text style={styles.bulletTitle}>Moedas de Ouro</Text>
                            <Text style={styles.bulletDesc}>Acumule moedas completando atividades e use-as para comprar itens especiais no app!</Text>
                        </View>
                    </View>
                    <View style={styles.bulletRow}>
                        <Text style={styles.bulletEmoji}><MaterialCommunityIcons name="fire" size={24} color="#E5E5E5" /></Text>
                        <View style={styles.bulletTextContainer}>
                            <Text style={styles.bulletTitle}>Ofensiva diária</Text>
                            <Text style={styles.bulletDesc}>Faça pelo menos uma lição por dia para manter sua ofensiva acesa e subir de ranking!</Text>
                        </View>
                    </View>
                </View>
            )
        },
        {
            title: "A Trilha de Aprendizado",
            animation: require('../../assets/lottie/screen-Trophy.json'),
            content: (
                <View style={styles.contentBlock}>
                    <Text style={styles.mainParagraph}>
                        Sua trilha funciona de <Text style={styles.boldText}>baixo para cima</Text>!
                    </Text>
                    <Text style={styles.secondaryParagraph}>
                        Começando da base, cada atividade concluída abre caminho para os níveis superiores. Conclua seções para consolidar sua educação financeira e acumular recompensas especiais!
                    </Text>
                </View>
            )
        },
        {
            title: "Cosméticos Especiais",
            animation: require('../../assets/lottie/Gift premium animation.json'),
            content: (
                <View style={styles.contentBlock}>
                    <Text style={styles.mainParagraph}>
                        Desbloqueie Recompensas Únicas!            
                    </Text>
                    <Text style={styles.secondaryParagraph}>
                        Use as moedas que economizou para adquirir avatares exclusivos, títulos honorários e cosméticos personalizados na loja. Deixe seu perfil com a sua cara e destaque-se nas ligas!
                    </Text>
                </View>
            )
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose && onClose();
        }
    };

    const handleSkip = () => {
        onClose && onClose();
    };

    const activeStep = steps[currentStep];

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Header: Indicador de Progresso */}
                    <View style={styles.indicatorContainer}>
                        {steps.map((_, index) => (
                            <View 
                                key={`dot-${index}`} 
                                style={[
                                    styles.dot, 
                                    index === currentStep ? styles.dotActive : styles.dotInactive
                                ]} 
                            />
                        ))}
                    </View>

                    {/* Animação central */}
                    <View style={styles.animationWrapper}>
                        <LottieView
                            ref={lottieRef}
                            autoPlay
                            loop={true}
                            style={styles.lottie}
                            source={activeStep.animation}
                        />
                    </View>

                    {/* Título */}
                    <Text style={styles.title}>{activeStep.title}</Text>

                    {/* Conteúdo Dinâmico */}
                    <View style={styles.contentWrapper}>
                        {activeStep.content}
                    </View>

                    {/* Rodapé: Botões de Ação */}
                    <View style={styles.footer}>
                        <Pressable 
                            style={styles.nextButton}
                            onPress={handleNext}
                        >
                            <Text style={styles.nextButtonText}>
                                {currentStep === steps.length - 1 ? "Começar Jornada!" : "Avançar"}
                            </Text>
                        </Pressable>
                        
                        {currentStep < steps.length - 1 && (
                            <Pressable 
                                style={styles.skipButton}
                                onPress={handleSkip}
                            >
                                <Text style={styles.skipButtonText}>Pular tutorial</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: screenWidth * 0.9,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 10px 30px rgba(0,0,0,0.15)',
            }
        })
    },
    indicatorContainer: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 16,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 18,
        backgroundColor: '#1CB0F6',
    },
    dotInactive: {
        width: 6,
        backgroundColor: '#E2E8F0',
    },
    animationWrapper: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: theme.fonts.bold,
    },
    contentWrapper: {
        width: '100%',
        minHeight: 180,
        justifyContent: 'center',
    },
    contentBlock: {
        width: '100%',
        gap: 12,
    },
    bulletRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    bulletEmoji: {
        fontSize: 22,
        marginTop: 1,
    },
    bulletTextContainer: {
        flex: 1,
    },
    bulletTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    bulletDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    mainParagraph: {
        fontSize: 16,
        color: '#334155',
        textAlign: 'center',
        lineHeight: 22,
        marginHorizontal: 12,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#1CB0F6',
    },
    secondaryParagraph: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginHorizontal: 12,
    },
    footer: {
        width: '100%',
        marginTop: 24,
        gap: 12,
        alignItems: 'center',
    },
    nextButton: {
        width: '100%',
        backgroundColor: '#1CB0F6',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: 'rgba(0, 0, 0, 0.18)',
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    skipButton: {
        paddingVertical: 4,
    },
    skipButtonText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600',
    }
});

export default OnboardingModal;
