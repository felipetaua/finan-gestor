import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LessonModal({ visible, onClose, lessonData }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [earnedXP, setEarnedXP] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [dragClassifications, setDragClassifications] = useState({});
    const [reflectionText, setReflectionText] = useState('');
    const [sequenceSelection, setSequenceSelection] = useState([]);
    const [sequencePool, setSequencePool] = useState([]);
    const [radarSelection, setRadarSelection] = useState([]);
    const [miniGameLocked, setMiniGameLocked] = useState(false);

    useEffect(() => {
        if (visible) {
            setCurrentPage(0);
            setEarnedXP(0);
            setIsFinished(false);
            setDragClassifications({});
            setReflectionText('');
            setSequenceSelection([]);
            setSequencePool([]);
            setRadarSelection([]);
            setMiniGameLocked(false);
        }
    }, [visible]);

    useEffect(() => {
        const currentLesson = licoes[currentPage];
        setDragClassifications({});
        setReflectionText('');
        setSequenceSelection([]);
        setRadarSelection([]);
        setMiniGameLocked(false);

        if (currentLesson?.tipo === 'sequencia_cofre') {
            const nextPool = [...(currentLesson.sequencia || [])].sort(() => Math.random() - 0.5);
            setSequencePool(nextPool);
        } else {
            setSequencePool([]);
        }
    }, [currentPage]);

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

    const handleDragClassify = (itemId, categoria) => {
        if (miniGameLocked) return;

        setDragClassifications((prev) => ({
            ...prev,
            [itemId]: categoria
        }));
    };

    const checkDragAnswers = () => {
        const currentLesson = licoes[currentPage];
        if (!currentLesson?.itens?.length) return 0;

        let correct = 0;
        currentLesson.itens.forEach((item) => {
            if (dragClassifications[item.id] === item.categoria) {
                correct += 1;
            }
        });

        const totalItems = currentLesson.itens.length;
        const percentage = (correct / totalItems) * 100;
        const baseReward = currentLesson.recompensa_xp || 150;

        if (percentage === 100) return baseReward;
        if (percentage >= 80) return Math.floor(baseReward * 0.8);
        if (percentage >= 60) return Math.floor(baseReward * 0.6);
        return Math.floor(baseReward * 0.4);
    };

    const getSequenceXp = () => {
        const currentLesson = licoes[currentPage];
        const expectedIds = currentLesson?.sequencia?.map((item) => item.id) || [];

        if (!expectedIds.length) return currentLesson?.recompensa_xp || 150;

        const matches = expectedIds.reduce((count, expectedId, index) => {
            return count + (sequenceSelection[index] === expectedId ? 1 : 0);
        }, 0);

        if (matches === expectedIds.length) return currentLesson.recompensa_xp || 180;
        return Math.max(30, Math.floor(((currentLesson.recompensa_xp || 180) * matches) / expectedIds.length));
    };

    const getRadarXp = () => {
        const currentLesson = licoes[currentPage];
        const leakIds = (currentLesson?.itens || [])
            .filter((item) => item.eh_vazamento)
            .map((item) => item.id);

        const selectedSet = new Set(radarSelection);
        const hits = leakIds.filter((itemId) => selectedSet.has(itemId)).length;
        const falsePositives = radarSelection.filter((itemId) => !leakIds.includes(itemId)).length;
        const misses = leakIds.length - hits;

        const baseXp = currentLesson?.recompensa_xp || 170;

        if (misses === 0 && falsePositives === 0) return baseXp;

        const penalty = (misses + falsePositives) * 20;
        return Math.max(20, baseXp - penalty);
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
        const sequenceItems = sequencePool.length ? sequencePool : (licao.sequencia || []);
        const expectedLeakIds = (licao.itens || []).filter((item) => item.eh_vazamento).map((item) => item.id);
        
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

                {licao.tipo === 'sequencia_cofre' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="key" size={24} color="#7C3AED" />
                        </View>
                        <Text style={styles.sectionTitle}>Cofre Neon</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>

                        <View style={styles.sequenceTrack}>
                            {(licao.sequencia || []).map((item, index) => {
                                const selectedId = sequenceSelection[index];
                                const selectedItem = (licao.sequencia || []).find((sequenceItem) => sequenceItem.id === selectedId);

                                return (
                                    <View key={item.id} style={styles.sequenceSlot}>
                                        <Text style={styles.sequenceSlotIndex}>{index + 1}</Text>
                                        <Text style={styles.sequenceSlotText} numberOfLines={2}>
                                            {selectedItem ? selectedItem.texto : 'Segredo travado'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.sequencePool}>
                            {sequenceItems.map((item) => {
                                const selectedIndex = sequenceSelection.indexOf(item.id);
                                const isSelected = selectedIndex !== -1;

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.sequenceChip, isSelected && styles.sequenceChipSelected]}
                                        onPress={() => {
                                            if (miniGameLocked) return;

                                            setSequenceSelection((prev) => {
                                                if (prev.includes(item.id)) {
                                                    return prev.filter((selectedId) => selectedId !== item.id);
                                                }

                                                if (prev.length >= (licao.sequencia || []).length) {
                                                    return prev;
                                                }

                                                return [...prev, item.id];
                                            });
                                        }}
                                        disabled={miniGameLocked}
                                    >
                                        <Text style={[styles.sequenceChipText, isSelected && styles.sequenceChipTextSelected]}>
                                            {isSelected ? `${selectedIndex + 1}. ${item.texto}` : item.texto}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.helperText}>Monte a ordem correta para travar o vazamento financeiro.</Text>

                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => {
                                if (miniGameLocked || sequenceSelection.length !== (licao.sequencia || []).length) return;

                                setMiniGameLocked(true);
                                handleNext(getSequenceXp());
                            }}
                        >
                            <Text style={styles.continueButtonText}>
                                {sequenceSelection.length === (licao.sequencia || []).length ? 'Travar Cofre' : 'Complete a sequência'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {licao.tipo === 'radar_vazamento' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="radio" size={24} color="#DB2777" />
                        </View>
                        <Text style={styles.sectionTitle}>Radar do Vazamento</Text>
                        <Text style={styles.sectionText}>{licao.texto}</Text>

                        <View style={styles.radarGrid}>
                            {(licao.itens || []).map((item) => {
                                const isSelected = radarSelection.includes(item.id);
                                const isLeak = expectedLeakIds.includes(item.id);

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.radarItem,
                                            isSelected && styles.radarItemSelected,
                                            isSelected && isLeak && styles.radarItemLeak,
                                            isSelected && !isLeak && styles.radarItemSafe,
                                        ]}
                                        onPress={() => {
                                            if (miniGameLocked) return;

                                            setRadarSelection((prev) => {
                                                if (prev.includes(item.id)) {
                                                    return prev.filter((selectedId) => selectedId !== item.id);
                                                }

                                                return [...prev, item.id];
                                            });
                                        }}
                                        disabled={miniGameLocked}
                                    >
                                        <Text style={styles.radarItemText}>{item.texto}</Text>
                                        <Ionicons
                                            name={isSelected ? 'scan' : 'ellipse-outline'}
                                            size={18}
                                            color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.helperText}>Marque os itens que drenam dinheiro sem devolver valor.</Text>

                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => {
                                if (miniGameLocked) return;

                                setMiniGameLocked(true);
                                handleNext(getRadarXp());
                            }}
                        >
                            <Text style={styles.continueButtonText}>Analisar Radar</Text>
                        </TouchableOpacity>
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

                {licao.tipo === 'arrastar_classificar' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="hand-left" size={24} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Classificar</Text>
                        <Text style={styles.sectionText}>{licao.pergunta}</Text>

                        <View style={styles.dragContainer}>
                            {licao.categorias?.map((categoria) => (
                                <View key={categoria} style={styles.dragColumn}>
                                    <Text style={styles.categoryTitle}>
                                        {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                                    </Text>

                                    <View style={styles.dropZone}>
                                        {licao.itens?.filter((item) => dragClassifications[item.id] === categoria).map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.draggedItem}
                                                onPress={() => handleDragClassify(item.id, null)}
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
                                {licao.itens?.filter((item) => !dragClassifications[item.id]).map((item) => (
                                    <View key={item.id} style={styles.availableItemContainer}>
                                        <View style={styles.availableItem}>
                                            <Text style={styles.availableItemText}>{item.texto}</Text>
                                        </View>
                                        <View style={styles.itemButtons}>
                                            {licao.categorias?.map((categoria) => (
                                                <TouchableOpacity
                                                    key={`${item.id}-${categoria}`}
                                                    style={[styles.miniButton, { backgroundColor: '#4A90E2' }]}
                                                    onPress={() => handleDragClassify(item.id, categoria)}
                                                >
                                                    <Text style={styles.miniButtonText}>{categoria.substring(0, 3)}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={() => {
                                    if (miniGameLocked) return;

                                    setMiniGameLocked(true);
                                    handleNext(checkDragAnswers());
                                }}
                            >
                                <Text style={styles.continueButtonText}>Confirmar Classificações</Text>
                            </TouchableOpacity>
                        </View>
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
                            <TextInput
                                value={reflectionText}
                                onChangeText={setReflectionText}
                                placeholder="Escreva sua resposta..."
                                placeholderTextColor="#999"
                                style={styles.realInput}
                                multiline
                            />
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
    sequenceTrack: {
        width: '100%',
        gap: 10,
        marginTop: 10,
        marginBottom: 16,
    },
    sequenceSlot: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#F5F3FF',
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    sequenceSlotIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#7C3AED',
        color: '#FFFFFF',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontWeight: 'bold',
    },
    sequenceSlotText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    sequencePool: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    sequenceChip: {
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sequenceChipSelected: {
        backgroundColor: '#7C3AED',
        borderColor: '#7C3AED',
    },
    sequenceChipText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    sequenceChipTextSelected: {
        color: '#FFFFFF',
    },
    helperText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },
    radarGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    radarItem: {
        width: '48%',
        minHeight: 96,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: 14,
        justifyContent: 'space-between',
    },
    radarItemSelected: {
        borderColor: '#DB2777',
    },
    radarItemLeak: {
        backgroundColor: '#DB2777',
    },
    radarItemSafe: {
        backgroundColor: '#0F766E',
    },
    radarItemText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
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
    realInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 15,
        minHeight: 100,
        marginVertical: 15,
        backgroundColor: '#FAFAFA',
        color: '#000',
        textAlignVertical: 'top',
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
    dragContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 18,
    },
    dragColumn: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 12,
        minHeight: 200,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
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
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    draggedItemText: {
        fontSize: 13,
        color: '#000',
        fontWeight: '500',
        flex: 1,
    },
    availableItemsSection: {
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 2,
        borderTopColor: '#E5E7EB',
    },
    availableItemsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
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
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    availableItemText: {
        fontSize: 14,
        color: '#000',
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