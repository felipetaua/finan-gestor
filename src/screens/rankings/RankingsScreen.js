import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { theme } from '../../theme/theme';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const RankingsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Todos'); // 'Diário', 'Mensal', 'Todos'
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [dailyPointsWon, setDailyPointsWon] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const checkFirstAccess = async () => {
            if (!auth.currentUser) return;
            const hasAccessed = await AsyncStorage.getItem(`@rankings_accessed_${auth.currentUser.uid}`);
            if (!hasAccessed) {
                setShowWelcomeModal(true);
            }
        };
        checkFirstAccess();
    }, []);

    // Verificação de Resets ao carregar a tela (Dia / Mês)
    useEffect(() => {
        const checkResets = async () => {
            if (!auth.currentUser) return;
            const userRef = doc(db, 'users', auth.currentUser.uid);
            
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const todayStr = new Date().toISOString().split('T')[0];
                    const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
                    
                    let updates = {};
                    let shouldShowModal = false;
                    let earnedToday = userData.xpDiario || 0;

                    // Inicialização se os campos estiverem ausentes
                    if (userData.xpDiario === undefined) updates.xpDiario = 0;
                    if (userData.xpMensal === undefined) updates.xpMensal = 0;
                    if (userData.lastResetDiario === undefined) updates.lastResetDiario = todayStr;
                    if (userData.lastResetMensal === undefined) updates.lastResetMensal = currentMonthStr;

                    // Reset Diário (se a data salva for anterior a hoje e o usuário tiver XP acumulado)
                    if (userData.lastResetDiario && userData.lastResetDiario !== todayStr) {
                        if (earnedToday > 0) {
                            setDailyPointsWon(earnedToday);
                            shouldShowModal = true;
                        }
                        updates.xpDiario = 0;
                        updates.lastResetDiario = todayStr;
                    }

                    // Reset Mensal
                    if (userData.lastResetMensal && userData.lastResetMensal !== currentMonthStr) {
                        updates.xpMensal = 0;
                        updates.lastResetMensal = currentMonthStr;
                    }

                    // Atualizar Firestore se houver mudanças
                    if (Object.keys(updates).length > 0) {
                        await updateDoc(userRef, updates);
                    }

                    if (shouldShowModal) {
                        setShowRewardModal(true);
                    }
                }
            } catch (error) {
                console.error("Erro ao verificar resets: ", error);
            }
        };
        checkResets();
    }, []);

    // Cronômetro Regressivo para a Meia-Noite
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0); // Próxima meia-noite

            const diffMs = midnight.getTime() - now.getTime();
            
            if (diffMs <= 1000) {
                // Chegou na meia-noite, aciona o reset em tempo real
                triggerDailyReset();
            } else {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

                const pad = (n) => n < 10 ? `0${n}` : n;
                setTimeRemaining(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
            }
        };

        const triggerDailyReset = async () => {
            if (!auth.currentUser) return;
            const userRef = doc(db, 'users', auth.currentUser.uid);
            
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const earnedToday = userData.xpDiario || 0;
                    
                    if (earnedToday > 0) {
                        setDailyPointsWon(earnedToday);
                        setShowRewardModal(true);
                    }

                    const todayStr = new Date().toISOString().split('T')[0];
                    await updateDoc(userRef, {
                        xpDiario: 0,
                        lastResetDiario: todayStr
                    });
                }
            } catch (error) {
                console.error("Erro no reset diário em tempo real: ", error);
            }
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, []);

    // Consulta reativa baseada no filtro selecionado
    useEffect(() => {
        setLoading(true);
        const usersRef = collection(db, 'users');
        
        let orderByField = 'xp';
        if (filter === 'Diário') orderByField = 'xpDiario';
        else if (filter === 'Mensal') orderByField = 'xpMensal';
        
        const q = query(usersRef, orderBy(orderByField, 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log(`Users fetched for ${filter}: `, usersData.length);
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar usuários: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    const topThree = users.slice(0, 3);
    const remainingUsers = users.slice(3);

    const currentUserIndex = users.findIndex(u => u.id === auth.currentUser?.uid);
    const currentUserRankDisplay = currentUserIndex >= 0 ? `#${currentUserIndex + 1}` : '-';

    const renderTopUser = (user, rank) => {
        if (!user) return <View style={styles.topUserPlaceholder} />;

        const isFirst = rank === 1;
        const size = isFirst ? 90 : 70;
        const avatarColor = rank === 1 ? '#FFB300' : rank === 2 ? '#B0BEC5' : '#8D6E63'; // Ouro, Prata, Bronze (cores suaves)
        
        return (
            <View style={[styles.topUserItem, isFirst && styles.firstPlaceItem]}>
                {isFirst && <Ionicons name="trophy" size={28} color="#FFD700" style={styles.crown} />}
                <View style={[styles.avatarContainer, { width: size, height: size, borderColor: avatarColor }]}>
                    {user.photoURL ? (
                        <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                ) : (
                        <View style={[styles.avatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={styles.avatarInitial}>{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</Text>
                        </View>
                    )}
                    <View style={[styles.rankBadge, { backgroundColor: avatarColor }]}>
                        <Text style={styles.rankBadgeText}>{rank}</Text>
                    </View>
                </View>
                <Text style={styles.topUserName} numberOfLines={1}>{user.name || 'Usuário'}</Text>
                <Text style={styles.topUserPoints}>
                    {(filter === 'Diário' ? user.xpDiario : filter === 'Mensal' ? user.xpMensal : user.xp) || 0} pts
                </Text>
            </View>
        );
    };

    const renderItem = ({ item, index }) => {
        const rank = index + 4;
        const isCurrentUser = item.id === auth.currentUser?.uid;

        return (
            <View style={[styles.listItem, isCurrentUser && styles.currentUserItem]}>
                <Text style={styles.listRank}>{rank}</Text>
                <View style={styles.listAvatar}>
                    {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.listAvatarImage} />
                    ) : (
                        <View style={[styles.listAvatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={styles.listAvatarInitial}>{item.name?.charAt(0) || item.email?.charAt(0) || 'U'}</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.listName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
                    {item.name || 'Usuário'} {isCurrentUser ? '(Você)' : ''}
                </Text>
                <Text style={[styles.listPoints, isCurrentUser && styles.currentUserPoints]}>
                    {(filter === 'Diário' ? item.xpDiario : filter === 'Mensal' ? item.xpMensal : item.xp) || 0} pts
                </Text>
            </View>
        );
    };

    const handleParticipate = async () => {
        if (auth.currentUser) {
            await AsyncStorage.setItem(`@rankings_accessed_${auth.currentUser.uid}`, 'true');
        }
        setShowWelcomeModal(false);
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerRankContainer}>
                    <Text style={styles.headerRankText}>{currentUserRankDisplay}</Text>
                </View>
                <Text style={styles.headerTitle}>Classificação</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Missions')} style={styles.missionsButton}>
                    <Ionicons name="calendar-outline" size={28} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {timeRemaining ? (
                <View style={styles.timerBanner}>
                    <Ionicons name="stopwatch" size={18} color="#D97706" />
                    <Text style={styles.timerText}>
                        Reseta em: <Text style={styles.timerCountdown}>{timeRemaining}</Text>
                    </Text>
                </View>
            ) : null}

            <View style={styles.filterContainer}>
                {['Diário', 'Mensal', 'Todos'].map(f => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={styles.podiumContainer}>
                        {renderTopUser(topThree[1], 2)}
                        {renderTopUser(topThree[0], 1)}
                        {renderTopUser(topThree[2], 3)}
                    </View>

                    <View style={styles.listHeader}>
                        <Text style={styles.listHeadText}>Posição</Text>
                        <Text style={[styles.listHeadText, { flex: 1, marginLeft: theme.spacing.xl }]}>Jogador</Text>
                        <Text style={styles.listHeadText}>Pontos</Text>
                    </View>

                    <FlatList
                        data={remainingUsers}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            )}

            {/* Modal de Boas-vindas */}
            <Modal
                visible={showWelcomeModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {}}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LottieView
                            source={require('../../assets/lottie/splash-rocket-person.json')}
                            autoPlay
                            loop
                            style={styles.modalAlertLottie}
                        />
                        <Text style={styles.modalTitle}>Bem-vindo ao Ranking!</Text>
                        <Text style={styles.modalSubtitle}>
                            Ganhe XP realizando missões, registre suas finanças e dispute as melhores posições para provar quem manda bem no dinheiro!
                        </Text>
                        
                        <TouchableOpacity style={styles.participateButton} onPress={handleParticipate}>
                            <Text style={styles.participateButtonText}>Quero Participar!</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Premiação Diária (Fim do Cronômetro) */}
            <Modal
                visible={showRewardModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowRewardModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LottieView
                            source={require('../../assets/lottie/screen-Trophy.json')}
                            autoPlay
                            loop
                            style={styles.modalAlertLottie}
                        />
                        <Text style={styles.modalTitle}>Fim do Dia! 🕒</Text>
                        <Text style={styles.modalSubtitle}>
                            Parabéns! O cronômetro diário terminou e você acumulou:
                        </Text>
                        
                        <View style={styles.rewardXPBadge}>
                            <Text style={styles.rewardXPText}>+{dailyPointsWon} XP</Text>
                        </View>

                        <Text style={styles.modalDetailsText}>
                            Seus pontos diários foram reiniciados para o novo dia. Continue participando das missões para subir no ranking!
                        </Text>
                        
                        <TouchableOpacity style={styles.participateButton} onPress={() => setShowRewardModal(false)}>
                            <Text style={styles.participateButtonText}>Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F7FA', // Usando um tom claro amigável
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    headerTitle: {
        fontSize: theme.fontSizes.xl,
        fontFamily: theme.fonts.title,
        color: theme.colors.textPrimary,
    },
    headerRankContainer: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.radius.md,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRankText: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        fontSize: theme.fontSizes.md,
    },
    missionsButton: {
        padding: theme.spacing.xs,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        marginHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.full,
        padding: 4,
        marginBottom: theme.spacing.lg,
    },
    filterButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.radius.full,
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
        boxShadow: '0px 2px 4px rgba(47, 107, 255, 0.2)', // Ajustado para web/novo react-native
        elevation: 3,
    },
    filterText: {
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSizes.sm,
    },
    filterTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    podiumContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
        height: 180,
        marginBottom: theme.spacing.xl,
    },
    topUserItem: {
        alignItems: 'center',
        marginHorizontal: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        width: 90,
    },
    firstPlaceItem: {
        zIndex: 10,
        paddingBottom: 0,
    },
    crown: {
        position: 'absolute',
        top: -30,
        zIndex: 2,
    },
    avatarContainer: {
        borderRadius: 100,
        borderWidth: 3,
        marginBottom: theme.spacing.sm,
        position: 'relative',
        backgroundColor: '#fff',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    rankBadge: {
        position: 'absolute',
        bottom: -10,
        alignSelf: 'center',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    rankBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    topUserName: {
        fontFamily: theme.fonts.bold,
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    topUserPoints: {
        fontFamily: theme.fonts.medium,
        fontSize: 12,
        color: '#F59E0B', 
        fontWeight: 'bold',
    },
    topUserPlaceholder: {
        width: 90,
        marginHorizontal: theme.spacing.sm,
    },
    listHeader: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        marginHorizontal: theme.spacing.lg,
        backgroundColor: '#E2E8F0',
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing.md,
    },
    listHeadText: {
        fontFamily: theme.fonts.medium,
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing.sm,
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
        elevation: 2,
    },
    currentUserItem: {
        backgroundColor: '#EEF2FF',
        borderColor: theme.colors.primary,
        borderWidth: 1,
    },
    listRank: {
        width: 30,
        fontFamily: theme.fonts.bold,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSizes.md,
    },
    listAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: theme.spacing.md,
        backgroundColor: '#fff',
    },
    listAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    listAvatarInitial: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listName: {
        flex: 1,
        fontFamily: theme.fonts.medium,
        color: theme.colors.textPrimary,
        fontSize: theme.fontSizes.sm,
    },
    currentUserName: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
    },
    listPoints: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.textPrimary,
        fontSize: theme.fontSizes.sm,
    },
    currentUserPoints: {
        color: theme.colors.primary,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: theme.radius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.15)',
        elevation: 5,
        borderRadius: theme.radius.lg,
    },
    modalAlertLottie: {
        width: 150,
        height: 150,
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: theme.fontSizes.xl,
        fontFamily: theme.fonts.title,
        color: theme.colors.primary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: theme.fontSizes.md,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        lineHeight: 22,
    },
    participateButton: {
        width: '100%',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
    },
    participateButtonText: {
        color: '#FFF',
        fontFamily: theme.fonts.bold,
        fontSize: theme.fontSizes.md,
    },
    timerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        gap: 8,
    },
    timerText: {
        fontFamily: theme.fonts.medium,
        fontSize: theme.fontSizes.sm,
        color: '#B45309',
    },
    timerCountdown: {
        fontFamily: theme.fonts.bold,
        fontWeight: 'bold',
        color: '#D97706',
    },
    rewardXPBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.full,
        marginVertical: theme.spacing.md,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    rewardXPText: {
        color: '#FFFFFF',
        fontFamily: theme.fonts.bold,
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalDetailsText: {
        fontSize: theme.fontSizes.sm,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
    }
});

export default RankingsScreen;
