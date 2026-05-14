import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, PanResponder, Animated } from 'react-native';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import OnboardingHeader from '../../components/common/OnboardingHeader';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc, increment, setDoc, getDoc, arrayUnion } from 'firebase/firestore';

export default function LessonScreen({ route, navigation }) {
    const { lessonData } = route.params;
    const licoes = lessonData.licoes || [];
    
    const [currentPage, setCurrentPage] = useState(0);
    const [earnedXP, setEarnedXP] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [answeredOptionIndex, setAnsweredOptionIndex] = useState(null);
    const [dragClassifications, setDragClassifications] = useState({});

    const totalPages = licoes.length;

    const handleAnswerAndNext = async (opcao, index) => {
        if (answeredOptionIndex !== null) return; // Prevent double tapping

        setAnsweredOptionIndex(index);
        
        // Compute XP
        let xpGained = 0;
        if (opcao.pontos) xpGained = opcao.pontos;
        else if (opcao.correta) xpGained = 20;
        else if (opcao.correta === false) xpGained = 5;
        else xpGained = 10;

        // Firebase Background Logic (Subtract 1 heart)
        if (auth.currentUser) {
            const uid = auth.currentUser.uid;
            try {
                const energyRef = doc(db, 'users', uid, 'gamification', 'energy');
                const energySnap = await getDoc(energyRef);
                if (energySnap.exists() && energySnap.data().hearts > 0) {
                    await updateDoc(energyRef, {
                        hearts: increment(-1)
                    });
                }
            } catch (e) {
                console.log("Error updating energy:", e);
            }
        }

        setTimeout(() => {
            handleNext(xpGained);
            setAnsweredOptionIndex(null);
        }, 1200);
    };

    const handleNext = async (xp = 0) => {
        const newXP = earnedXP + (xp || 0);
        setEarnedXP(newXP);
        
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
        } else {
            setIsFinished(true);
            // Firebase Logic on Finish (Add XP & Streak)
            if (auth.currentUser) {
                const uid = auth.currentUser.uid;
                try {
                    // Update XP / Coins
                    const economyRef = doc(db, 'users', uid, 'gamification', 'economy');
                    const economySnap = await getDoc(economyRef);
                    if (economySnap.exists()) {
                        await updateDoc(economyRef, {
                            coins: increment(newXP) // We're using coins to store XP/Points for now based on HomeScreen setup
                        });
                    } else {
                        await setDoc(economyRef, { coins: newXP, lastUpdated: new Date().toISOString() });
                    }

                    // Update Streak
                    const streakRef = doc(db, 'users', uid, 'gamification', 'streak');
                    const streakSnap = await getDoc(streakRef);
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (streakSnap.exists()) {
                        const data = streakSnap.data();
                        if (data.lastActive !== todayStr) {
                            await updateDoc(streakRef, {
                                currentStreak: increment(1),
                                lastActive: todayStr
                            });
                        }
                    } else {
                        await setDoc(streakRef, {
                            currentStreak: 1,
                            lastActive: todayStr
                        });
                    }

                    // Mark this unit as completed for trail progression.
                    if (lessonData?.id) {
                        const trailProgressRef = doc(db, 'users', uid, 'gamification', 'trailProgress');
                        const trailProgressSnap = await getDoc(trailProgressRef);

                        if (trailProgressSnap.exists()) {
                            await updateDoc(trailProgressRef, {
                                completedUnitIds: arrayUnion(lessonData.id),
                                updatedAt: new Date().toISOString()
                            });
                        } else {
                            await setDoc(trailProgressRef, {
                                completedUnitIds: [lessonData.id],
                                updatedAt: new Date().toISOString()
                            });
                        }
                    }
                } catch (err) {
                    console.log("Error finishing lesson gamification:", err);
                }
            }
        }
    };

    const handleClose = () => {
        navigation.goBack();
    };

    if (!lessonData) {
        return (
            <View style={styles.container}>
                <Text>Erro ao carregar os dados da lição.</Text>
                <Button onPress={() => navigation.goBack()} title="Voltar" type="primary" />
            </View>
        );
    }

    if (isFinished) {
        return (
            <View style={styles.container}>
                <View style={styles.contentCenter}>
                    <LottieView
                        autoPlay
                        loop={true}
                        style={{ width: 250, height: 250, alignSelf: 'center' }}
                        source={require('../../assets/lottie/screen-Trophy.json')}
                    />
                    <Text style={styles.summaryTitle}>Parabéns!</Text>
                    <Text style={styles.summaryText}>Você concluiu a unidade "{lessonData.titulo}".</Text>
                    
                    <View style={styles.xpCard}>
                        <Text style={styles.xpCardTitle}>XP Ganho</Text>
                        <Text style={styles.xpCardValue}>+{earnedXP} XP</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Button  
                        onPress={handleClose} 
                        title="Finalizar e Voltar" 
                        type='primary'
                    />
                </View>
            </View>
        );
    }

    const renderLicao = () => {
        const licao = licoes[currentPage];
        
        return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {licao.tipo === 'teoria_curta' && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="book" size={40} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Teoria</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                        
                        {licao.pergunta && (
                            <View style={styles.questionBox}>
                                <Ionicons name="chatbubble-ellipses" size={24} color={theme.colors.info || '#2196F3'} />
                                <Text style={styles.questionText}>{licao.pergunta}</Text>
                            </View>
                        )}
                    </View>
                )}

                {(licao.tipo === 'escolha_multipla' || licao.tipo === 'desafio_escolha' || licao.tipo === 'calculo_gamificado') && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="git-network" size={40} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Desafio</Text>
                        {licao.contexto && <Text style={styles.sectionText}>{licao.contexto}</Text>}
                        {licao.texto && <Text style={styles.sectionText}>{licao.texto}</Text>}
                        {licao.pergunta && <Text style={styles.questionTextLarge}>{licao.pergunta}</Text>}
                        
                        <View style={styles.optionsContainer}>
                            {licao.opcoes?.map((opcao, i) => {
                                const isSelected = answeredOptionIndex === i;
                                const isCorrect = opcao.correta !== false; // if it's explicitly false it's wrong, else treat as correct for visual
                                
                                return (
                                    <TouchableOpacity 
                                        key={i} 
                                        style={[
                                            styles.optionButton,
                                            isSelected && isCorrect && { borderColor: theme.colors.success, backgroundColor: '#E8F5E9' },
                                            isSelected && !isCorrect && { borderColor: theme.colors.error || '#F44336', backgroundColor: '#FFEBEE' }
                                        ]} 
                                        onPress={() => handleAnswerAndNext(opcao, i)}
                                        disabled={answeredOptionIndex !== null}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            isSelected && isCorrect && { color: theme.colors.success },
                                            isSelected && !isCorrect && { color: theme.colors.error || '#F44336' }
                                        ]}>{opcao.texto}</Text>
                                        {opcao.pontos !== undefined && (
                                            <Text style={styles.pointsText}>{opcao.pontos > 0 ? `+${opcao.pontos}` : opcao.pontos} XP</Text>
                                        )}
                                        {isSelected && isCorrect && <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />}
                                        {isSelected && !isCorrect && <Ionicons name="close-circle" size={24} color={theme.colors.error || '#F44336'} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {licao.tipo === 'pratica_real' && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="rocket" size={40} color={theme.colors.success} />
                        </View>
                        <Text style={styles.sectionTitle}>Ação Prática</Text>
                        <Text style={styles.sectionText}>{licao.tarefa}</Text>
                        {licao.recompensa_xp && (
                            <View style={styles.rewardBadge}>
                                <Ionicons name="star" size={16} color="#FFF" />
                                <Text style={styles.rewardText}>+{licao.recompensa_xp} XP</Text>
                            </View>
                        )}
                    </View>
                )}

                {licao.tipo === 'reflexao_honesta' && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="eye" size={40} color={theme.colors.warning || '#FF9800'} />
                        </View>
                        <Text style={styles.sectionTitle}>Reflexão</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                        {licao.pergunta && <Text style={styles.questionTextLarge}>{licao.pergunta}</Text>}
                    </View>
                )}

                {licao.tipo === 'arrastar_classificar' && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="hand-left" size={40} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Classificar</Text>
                        <Text style={styles.sectionText}>{licao.pergunta}</Text>
                        
                        <View style={styles.dragContainer}>
                            {licao.categorias?.map((categoria, catIndex) => (
                                <View key={categoria} style={styles.dragColumn}>
                                    <Text style={styles.categoryTitle}>
                                        {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                                    </Text>
                                    
                                    <View style={styles.dropZone}>
                                        {licao.itens?.filter(item => dragClassifications[item.id] === categoria).map(item => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.draggedItem}
                                                onLongPress={() => handleDragClassify(item.id, null)}
                                            >
                                                <Text style={styles.draggedItemText}>{item.texto}</Text>
                                                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                        
                        <View style={styles.availableItemsSection}>
                            <Text style={styles.availableItemsTitle}>Disponíveis:</Text>
                            <View style={styles.availableItemsGrid}>
                                {licao.itens?.filter(item => !dragClassifications[item.id]).map(item => (
                                    <View key={item.id} style={styles.availableItemContainer}>
                                        <View style={styles.availableItem}>
                                            <Text style={styles.availableItemText}>{item.texto}</Text>
                                        </View>
                                        <View style={styles.itemButtons}>
                                            {licao.categorias?.map(categoria => (
                                                <TouchableOpacity
                                                    key={`${item.id}-${categoria}`}
                                                    style={[styles.miniButton, { backgroundColor: categoria === 'ativo' || categoria === 'passiva' ? '#4CAF50' : '#FF9800' }]}
                                                    onPress={() => handleDragClassify(item.id, categoria)}
                                                >
                                                    <Text style={styles.miniButtonText}>{categoria.substring(0, 3)}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {licao.tipo === 'compromisso_final' && (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="medal" size={40} color="#FFC800" />
                        </View>
                        <Text style={styles.sectionTitle}>Compromisso Final</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    const isOptionType = () => {
        const tipo = licoes[currentPage]?.tipo;
        return (tipo === 'escolha_multipla' || tipo === 'desafio_escolha' || tipo === 'calculo_gamificado');
    };

    const isDragType = () => {
        const tipo = licoes[currentPage]?.tipo;
        return tipo === 'arrastar_classificar';
    };

    const handleDragClassify = (itemId, categoria) => {
        setDragClassifications(prev => ({
            ...prev,
            [itemId]: categoria
        }));
    };

    const checkDragAnswers = () => {
        const licao = licoes[currentPage];
        if (!licao.itens) return 0;

        let correct = 0;
        licao.itens.forEach(item => {
            if (dragClassifications[item.id] === item.categoria) {
                correct++;
            }
        });

        const totalItems = licao.itens.length;
        const percentage = (correct / totalItems) * 100;
        
        // Award XP based on percentage correct
        if (percentage === 100) return licao.recompensa_xp || 150;
        if (percentage >= 80) return Math.floor((licao.recompensa_xp || 150) * 0.8);
        if (percentage >= 60) return Math.floor((licao.recompensa_xp || 150) * 0.6);
        return Math.floor((licao.recompensa_xp || 150) * 0.4);
    };

    const handleCompleteDrag = async () => {
        const xpGained = checkDragAnswers();
        
        // Subtract 1 heart
        if (auth.currentUser) {
            const uid = auth.currentUser.uid;
            try {
                const energyRef = doc(db, 'users', uid, 'gamification', 'energy');
                const energySnap = await getDoc(energyRef);
                if (energySnap.exists() && energySnap.data().hearts > 0) {
                    await updateDoc(energyRef, {
                        hearts: increment(-1)
                    });
                }
            } catch (e) {
                console.log("Error updating energy:", e);
            }
        }

        setTimeout(() => {
            handleNext(xpGained);
            setDragClassifications({});
        }, 1200);
    };

    return (
        <View style={styles.container}>
            <OnboardingHeader 
                currentStep={currentPage + 1} 
                totalSteps={totalPages} 
                onBack={() => {
                    if (currentPage > 0) {
                        setCurrentPage(prev => prev - 1);
                    } else {
                        handleClose();
                    }
                }} 
            />
            
            <View style={styles.content}>
                {renderLicao()}
            </View>

            {/* O footer só é mostrado (botão de continuar) se não for uma lição do tipo "escolha multipla" onde o usuário aperta a opção. */}
            {!isOptionType() && !isDragType() && (
                <View style={styles.footer}>
                    <Button  
                        onPress={() => {
                            const licao = licoes[currentPage];
                            let xp = 0;
                            if (licao?.tipo === 'pratica_real') xp = licao.recompensa_xp || 20;
                            else if (licao?.tipo === 'reflexao_honesta') xp = 5;
                            else if (licao?.tipo === 'compromisso_final') xp = 10;
                            handleNext(xp);
                        }} 
                        title={licoes[currentPage]?.acao || "Continuar"}
                        type='primary'
                    />
                </View>
            )}

            {isDragType() && (
                <View style={styles.footer}>
                    <Button  
                        onPress={handleCompleteDrag}
                        title="Confirmar Classificações"
                        type='primary'
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: 60,
    },
    contentCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
    },
    content: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingBottom: 40,
        paddingTop: 20,
    },
    footer: {
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
    },
    card: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${theme.colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    sectionText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    questionBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        marginTop: 10,
    },
    questionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
    },
    questionTextLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        marginVertical: 20,
    },
    optionsContainer: {
        width: '100%',
        gap: 12,
        marginTop: 10,
    },
    optionButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
    },
    optionText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
        flex: 1,
    },
    pointsText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.success,
        marginLeft: 8,
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        marginTop: 10,
    },
    rewardText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    summaryTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    summaryText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    xpCard: {
        backgroundColor: '#FFF9C4',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 200,
        borderWidth: 2,
        borderColor: '#FFD54F',
    },
    xpCardTitle: {
        fontSize: 16,
        color: '#F57F17',
        fontWeight: '600',
        marginBottom: 8,
    },
    xpCardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F57F17',
    },
    dragContainer: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 20,
        marginBottom: 20,
    },
    dragColumn: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 12,
        minHeight: 250,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    dropZone: {
        flex: 1,
        gap: 8,
    },
    draggedItem: {
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    draggedItemText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        flex: 1,
    },
    availableItemsSection: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: '#E5E7EB',
    },
    availableItemsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
    },
    availableItemsGrid: {
        gap: 12,
    },
    availableItemContainer: {
        marginBottom: 8,
    },
    availableItem: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    availableItemText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    itemButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    miniButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    miniButtonText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    }
});