import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, increment, getDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MISSIONS_LIST = [
    {
        id: 'transactions',
        title: 'Adicionar 3 Transações',
        desc: 'Registre seus gastos e ganhos de hoje.',
        points: 50,
        icon: 'wallet',
        target: 3,
        actionLabel: 'Registrar',
        targetScreen: 'AddTransaction',
    },
    {
        id: 'create_challenge',
        title: 'Criar um Desafio ou Meta',
        desc: 'Inicie um novo desafio de poupança.',
        points: 200,
        icon: 'rocket',
        target: 1,
        actionLabel: 'Criar Desafio',
        targetScreen: 'AddChallenges',
    },
    {
        id: 'complete_lesson',
        title: 'Completar 1 Lição',
        desc: 'Aprenda sobre educação financeira na trilha.',
        points: 100,
        icon: 'book',
        target: 1,
        actionLabel: 'Estudar',
        targetScreen: 'Home',
    },
    {
        id: 'check_analytics',
        title: 'Analisar seu Gráfico',
        desc: 'Visualize o gráfico de análise financeira hoje.',
        points: 30,
        icon: 'pie-chart',
        target: 1,
        actionLabel: 'Ver Gráficos',
        targetScreen: 'Analytics',
    },
    {
        id: 'check_reminders',
        title: 'Verificar Lembretes',
        desc: 'Consulte seus pagamentos pendentes.',
        points: 20,
        icon: 'notifications',
        target: 1,
        actionLabel: 'Ver Contas',
        targetScreen: 'Payments',
    }
];

const MissionsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [claimedMissions, setClaimedMissions] = useState([]);
    const [progress, setProgress] = useState({
        transactions: 0,
        create_challenge: 0,
        complete_lesson: 0,
        check_analytics: 0,
        check_reminders: 0
    });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        const uid = auth.currentUser.uid;
        const todayStr = new Date().toISOString().split('T')[0];
        
        try {
            // 1. Carregar dados do usuário (XP e Missões Resgatadas)
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            let claimed = [];
            if (userSnap.exists()) {
                const userData = userSnap.data();
                claimed = userData.claimedMissions || [];
                setClaimedMissions(claimed);
            }

            // 2. Buscar transações criadas hoje
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Filtramos cliente-side para evitar a necessidade de índice composto no Firestore
            const transQuery = query(
                collection(db, 'transactions'),
                where('userId', '==', uid)
            );
            const transSnap = await getDocs(transQuery);
            const transCount = transSnap.docs.filter(doc => {
                const d = doc.data();
                if (d.isDeleted === true || d.isDeleted === 'true' || d.deletedAt != null) return false;
                
                const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt ? new Date(d.createdAt) : null;
                return createdAt && createdAt >= todayStart;
            }).length;

            // 3. Buscar desafios criados hoje
            const challengeQuery = query(
                collection(db, 'user_challenges'),
                where('userId', '==', uid)
            );
            const challengeSnap = await getDocs(challengeQuery);
            const challengeCount = challengeSnap.docs.filter(doc => {
                const d = doc.data();
                const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt ? new Date(d.createdAt) : null;
                return createdAt && createdAt >= todayStart;
            }).length;

            // 4. Buscar lições concluídas hoje
            let lessonCompleted = 0;
            const trailProgressRef = doc(db, 'users', uid, 'gamification', 'trailProgress');
            const trailSnap = await getDoc(trailProgressRef);
            if (trailSnap.exists()) {
                const trailData = trailSnap.data();
                const updatedAt = trailData.updatedAt;
                const updatedDate = updatedAt ? updatedAt.split('T')[0] : '';
                if (updatedDate === todayStr && trailData.completedUnitIds?.length > 0) {
                    lessonCompleted = 1;
                }
            }

            // 5. Buscar visualização dos gráficos hoje (AsyncStorage)
            const analyticsVisitedDate = await AsyncStorage.getItem('@analytics_visited_today');
            const checkAnalyticsCount = analyticsVisitedDate === todayStr ? 1 : 0;

            // 6. Buscar verificação dos lembretes hoje (AsyncStorage)
            const paymentsCheckedDate = await AsyncStorage.getItem('@payments_checked_today');
            const checkRemindersCount = paymentsCheckedDate === todayStr ? 1 : 0;

            setProgress({
                transactions: transCount,
                create_challenge: challengeCount,
                complete_lesson: lessonCompleted,
                check_analytics: checkAnalyticsCount,
                check_reminders: checkRemindersCount
            });

        } catch (error) {
            console.error("Erro ao carregar dados das missões: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        loadData();
        return unsubscribe;
    }, [navigation]);

    const claimMission = async (missionId, points) => {
        if (!auth.currentUser) return;
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                xp: increment(points),
                xpDiario: increment(points),
                xpMensal: increment(points),
                claimedMissions: arrayUnion(missionId)
            });
            
            Alert.alert("Parabéns! 🎉", `Você concluiu a missão e resgatou +${points} XP!`);
            setClaimedMissions(prev => [...prev, missionId]);
        } catch (error) {
            console.error("Erro ao resgatar pontos da missão: ", error);
            Alert.alert("Erro", "Não foi possível resgatar seus pontos. Tente novamente.");
        }
    };

    const handleGoToMission = (targetScreen) => {
        if (targetScreen === 'Home') {
            navigation.navigate('Progress');
        } else if (targetScreen === 'AddTransaction') {
            navigation.navigate('Wallet', { screen: 'AddTransaction' });
        } else if (targetScreen === 'AddChallenges') {
            navigation.navigate('Wallet', { screen: 'AddChallenges' });
        } else if (targetScreen === 'Analytics') {
            navigation.navigate('Wallet', { screen: 'AnalyticsScreen' });
        } else if (targetScreen === 'Payments') {
            navigation.navigate('Wallet', { screen: 'Payments' });
        }
    };

    const renderMissionItem = ({ item }) => {
        const currentProgress = progress[item.id] || 0;
        const isCompleted = currentProgress >= item.target;
        const isClaimed = claimedMissions.includes(item.id);
        const percent = Math.min(100, Math.round((currentProgress / item.target) * 100));

        return (
            <View style={[styles.missionCard, isClaimed && styles.missionCardClaimed]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.missionIcon, isCompleted && styles.missionIconCompleted, isClaimed && styles.missionIconClaimed]}>
                        <Ionicons 
                            name={isClaimed ? "checkmark-done" : isCompleted ? "checkmark" : item.icon} 
                            size={24} 
                            color={isClaimed ? '#94A3B8' : isCompleted ? '#FFF' : theme.colors.primary} 
                        />
                    </View>
                    <View style={styles.missionInfo}>
                        <Text style={[styles.missionTitle, isClaimed && styles.missionTitleClaimed]}>{item.title}</Text>
                        <Text style={styles.missionDesc}>{item.desc}</Text>
                    </View>
                    <View style={[styles.pointsBadge, isClaimed && styles.pointsBadgeClaimed]}>
                        <Text style={styles.pointsText}>+{item.points} XP</Text>
                    </View>
                </View>

                {/* Seção de progresso e botões de ação */}
                {!isClaimed ? (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFilled, { width: `${percent}%` }]} />
                        </View>
                        <View style={styles.progressLabelContainer}>
                            <Text style={styles.progressText}>
                                {currentProgress} / {item.target} ({percent}%)
                            </Text>
                            {isCompleted ? (
                                <TouchableOpacity 
                                    style={styles.claimButton} 
                                    onPress={() => claimMission(item.id, item.points)}
                                >
                                    <Text style={styles.claimButtonText}>Resgatar</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => handleGoToMission(item.targetScreen)}
                                >
                                    <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
                                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={styles.claimedFooter}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.claimedFooterText}>Missão concluída e XP resgatado</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Missões Diárias</Text>
                <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={MISSIONS_LIST}
                    renderItem={renderMissionItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={() => (
                        <View style={styles.listHeader}>
                            <Text style={styles.subtitle}>Complete as atividades diárias para ganhar XP e subir no ranking!</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    refreshButton: {
        padding: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: theme.fontSizes.xl,
        fontFamily: theme.fonts.title,
        color: theme.colors.textPrimary,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listHeader: {
        marginBottom: theme.spacing.md,
    },
    subtitle: {
        fontSize: theme.fontSizes.md,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    missionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        elevation: 2,
    },
    missionCardClaimed: {
        backgroundColor: '#F8FAFC',
        opacity: 0.8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    missionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    missionIconCompleted: {
        backgroundColor: '#10B981',
    },
    missionIconClaimed: {
        backgroundColor: '#E2E8F0',
    },
    missionInfo: {
        flex: 1,
    },
    missionTitle: {
        fontSize: theme.fontSizes.md,
        fontFamily: theme.fonts.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
        fontWeight: 'bold',
    },
    missionTitleClaimed: {
        color: '#64748B',
        textDecorationLine: 'none',
    },
    missionDesc: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
    },
    pointsBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pointsBadgeClaimed: {
        backgroundColor: '#94A3B8',
    },
    pointsText: {
        color: '#FFFFFF',
        fontFamily: theme.fonts.bold,
        fontSize: 11,
        fontWeight: 'bold',
    },
    progressContainer: {
        marginTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: theme.spacing.md,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFilled: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 3,
    },
    progressLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.fonts.medium,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    actionButtonText: {
        fontSize: 12,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    claimButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    claimButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.fonts.bold,
        fontSize: 12,
        fontWeight: 'bold',
    },
    claimedFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: theme.spacing.sm,
    },
    claimedFooterText: {
        fontSize: 12,
        color: '#64748B',
        fontFamily: theme.fonts.medium,
    }
});

export default MissionsScreen;