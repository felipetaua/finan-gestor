import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LessonModal({ visible, onClose, lessonData }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [earnedXP, setEarnedXP] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (visible) {
            setCurrentPage(0);
            setEarnedXP(0);
            setIsFinished(false);
        }
    }, [visible]);

    if (!lessonData) return null;

    const licoes = lessonData.licoes || [];
    const totalPages = licoes.length;

    const handleNext = (xp = 0) => {
        setEarnedXP(prev => prev + (xp || 0));
        
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const renderSummary = () => {
        return (
            <View style={styles.summaryContainer}>
                <LottieView
                    autoPlay
                    loop={true}
                    style={{ width: 150, height: 150, alignSelf: 'center' }}
                    source={require('../../assets/lottie/screen-Trophy.json')}
                />
                <Text style={styles.summaryTitle}>Parabéns!</Text>
                <Text style={styles.summaryText}>Você concluiu a unidade "{lessonData.titulo}".</Text>
                
                <View style={styles.xpCard}>
                    <Text style={styles.xpCardTitle}>XP Ganho</Text>
                    <Text style={styles.xpCardValue}>+{earnedXP} XP</Text>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                    <Text style={styles.actionButtonText}>Finalizar e Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderLicao = () => {
        const licao = licoes[currentPage];
        const pagesLeft = totalPages - currentPage - 1;
        
        return (
            <View style={styles.section}>
                <Text style={styles.counterText}>
                    Página {currentPage + 1} de {totalPages} {pagesLeft > 0 ? `(${pagesLeft} restantes)` : '(Última)'}
                </Text>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${((currentPage + 1) / totalPages) * 100}%` }]} />
                </View>

                {licao.tipo === 'teoria_curta' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="book" size={24} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Teoria</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                        {licao.pergunta && (
                            <View style={styles.questionBox}>
                                <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.info || '#2196F3'} />
                                <Text style={styles.questionText}>{licao.pergunta}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.continueButton} onPress={() => handleNext(0)}>
                            <Text style={styles.continueButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </>
                )}

                {(licao.tipo === 'escolha_multipla' || licao.tipo === 'desafio_escolha' || licao.tipo === 'calculo_gamificado') && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="git-network" size={24} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Desafio</Text>
                        {licao.contexto && <Text style={styles.sectionText}>{licao.contexto}</Text>}
                        {licao.texto && <Text style={styles.sectionText}>{licao.texto}</Text>}
                        {licao.pergunta && <Text style={styles.questionTextLarge}>{licao.pergunta}</Text>}
                        
                        <View style={styles.optionsContainer}>
                            {licao.opcoes?.map((opcao, i) => (
                                <TouchableOpacity 
                                    key={i} 
                                    style={styles.optionButton} 
                                    onPress={() => handleNext(opcao.pontos || 10)}
                                >
                                    <Text style={styles.optionText}>{opcao.texto}</Text>
                                    {opcao.pontos !== undefined && (
                                        <Text style={styles.pointsText}>{opcao.pontos > 0 ? `+${opcao.pontos}` : opcao.pontos} XP</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {licao.tipo === 'pratica_real' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="rocket" size={24} color={theme.colors.success} />
                        </View>
                        <Text style={styles.sectionTitle}>Ação Prática</Text>
                        <Text style={styles.sectionText}>{licao.tarefa}</Text>
                        {licao.recompensa_xp && (
                            <View style={styles.rewardBadge}>
                                <Ionicons name="star" size={16} color="#FFF" />
                                <Text style={styles.rewardText}>+{licao.recompensa_xp} XP</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.continueButton} onPress={() => handleNext(licao.recompensa_xp || 20)}>
                            <Text style={styles.continueButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </>
                )}

                {licao.tipo === 'reflexao_honesta' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="eye" size={24} color={theme.colors.warning || '#FF9800'} />
                        </View>
                        <Text style={styles.sectionTitle}>Reflexão</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                        {licao.pergunta && <Text style={styles.questionTextLarge}>{licao.pergunta}</Text>}
                        {licao.campo_texto && (
                            <View style={styles.fakeInput}>
                                <Text style={styles.fakeInputText}>Eu concordo plenamente...</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.continueButton} onPress={() => handleNext(5)}>
                            <Text style={styles.continueButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </>
                )}

                {licao.tipo === 'compromisso_final' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="medal" size={24} color="#FFC800" />
                        </View>
                        <Text style={styles.sectionTitle}>Compromisso Final</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleNext(10)}>
                            <Text style={styles.actionButtonText}>{licao.acao}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.modalContent}
                >
                    <View style={styles.dragHandle} />
                    
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.subtitle}>Unidade da Trilha</Text>
                            <Text style={styles.title}>{lessonData.titulo}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        {isFinished ? renderSummary() : renderLicao()}
                    </ScrollView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        height: '85%',
        paddingTop: theme.spacing.xl,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
            }
        })
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#DDD',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    closeButton: {
        padding: 4,
    },
    scrollArea: {
        padding: 20,
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    counterText: {
        fontSize: 13,
        color: '#999',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4A90E2',
        borderRadius: 3,
    },
    sectionHeader: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#000',
    },
    sectionText: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
        marginBottom: 15,
        textAlign: 'center',
    },
    questionTextLarge: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginVertical: 10,
    },
    questionBox: {
        flexDirection: 'row',
        backgroundColor: '#E8F0FE',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    questionText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 10,
        flex: 1,
        lineHeight: 22,
    },
    optionsContainer: {
        marginTop: 15,
        gap: 12,
    },
    optionButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#FAFAFA',
    },
    optionText: {
        fontSize: 16,
        color: '#000',
        flex: 1,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#FFC800',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginVertical: 15,
        gap: 5,
    },
    rewardText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    fakeInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 15,
        height: 100,
        marginVertical: 15,
        backgroundColor: '#FAFAFA',
    },
    fakeInputText: {
        color: '#999',
        fontSize: 15,
    },
    continueButton: {
        backgroundColor: '#4A90E2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
    },
    continueButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionButton: {
        backgroundColor: '#4A90E2',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40,
    },
    summaryTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 20,
        marginBottom: 10,
    },
    summaryText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    xpCard: {
        backgroundColor: '#FFF8E1',
        borderWidth: 2,
        borderColor: '#FFC800',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        width: '100%',
        marginBottom: 30,
    },
    xpCardTitle: {
        fontSize: 16,
        color: '#B28C00',
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    xpCardValue: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFC800',
    }
});