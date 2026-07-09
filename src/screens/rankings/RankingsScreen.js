import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { theme } from '../../theme/theme';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    
    // Conexões Sociais
    const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
    const [userDetailModalVisible, setUserDetailModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCurrentUserFollowing(data.following || []);
            }
        });
        return () => unsubscribe();
    }, []);

    const openUserDetailModal = (targetUser) => {
        setSelectedUser(targetUser);
        setUserDetailModalVisible(true);
    };

    const handleFollowUser = async (targetUser) => {
        if (!auth.currentUser) return;
        const myRef = doc(db, 'users', auth.currentUser.uid);
        const targetRef = doc(db, 'users', targetUser.id);
        
        try {
            await updateDoc(myRef, {
                following: arrayUnion(targetUser.id)
            });
            await updateDoc(targetRef, {
                followers: arrayUnion(auth.currentUser.uid)
            });
        } catch (e) {
            console.error("Erro ao seguir usuário:", e);
            Alert.alert("Erro", "Não foi possível seguir o usuário.");
        }
    };

    const handleUnfollowUser = async (targetUserId, targetUserName = 'este usuário') => {
        if (!auth.currentUser) return;

        Alert.alert(
            "Deixar de seguir",
            `Tem certeza que deseja parar de seguir ${targetUserName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sim, parar de seguir", 
                    style: "destructive",
                    onPress: async () => {
                        const myRef = doc(db, 'users', auth.currentUser.uid);
                        const targetRef = doc(db, 'users', targetUserId);
                        
                        try {
                            await updateDoc(myRef, {
                                following: arrayRemove(targetUserId)
                            });
                            await updateDoc(targetRef, {
                                followers: arrayRemove(auth.currentUser.uid)
                            });
                            
                            setUserDetailModalVisible(false);
                        } catch (e) {
                            console.error("Erro ao parar de seguir usuário:", e);
                            Alert.alert("Erro", "Não foi possível realizar a ação.");
                        }
                    }
                }
            ]
        );
    };

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
            <TouchableOpacity 
                style={[styles.topUserItem, isFirst && styles.firstPlaceItem]}
                onPress={() => openUserDetailModal(user)}
                activeOpacity={0.8}
            >
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
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item, index }) => {
        const rank = index + 4;
        const isCurrentUser = item.id === auth.currentUser?.uid;

        return (
            <TouchableOpacity 
                style={[styles.listItem, isCurrentUser && styles.currentUserItem]}
                onPress={() => openUserDetailModal(item)}
                activeOpacity={0.8}
            >
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
            </TouchableOpacity>
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

            {/* Modal de Detalhes do Usuário */}
            <Modal
                visible={userDetailModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setUserDetailModalVisible(false)}
            >
                <View style={styles.friendDetailOverlay}>
                    <View style={styles.friendDetailContainer}>
                        <TouchableOpacity 
                            style={styles.closeFriendDetailButton} 
                            onPress={() => setUserDetailModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#666666" />
                        </TouchableOpacity>

                        <View style={styles.friendDetailAvatarCircle}>
                            {selectedUser?.photoURL ? (
                                <Image source={{ uri: selectedUser.photoURL }} style={styles.friendDetailAvatarImage} />
                            ) : (
                                <View style={[styles.friendDetailAvatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={styles.friendDetailAvatarInitial}>{selectedUser?.name?.charAt(0) || 'U'}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.friendDetailName}>{selectedUser?.name || 'Usuário'}</Text>
                        <Text style={styles.friendDetailHandle}>@{selectedUser?.id ? selectedUser.id.substring(0, 6).toUpperCase() : 'XXXXXX'}</Text>

                        <View style={styles.friendDetailStatsRow}>
                            <View style={styles.friendDetailStatItem}>
                                <Text style={styles.friendDetailStatValue}>{selectedUser?.level || 1}</Text>
                                <Text style={styles.friendDetailStatLabel}>Nível</Text>
                            </View>
                            <View style={styles.friendDetailStatDivider} />
                            <View style={styles.friendDetailStatItem}>
                                <Text style={styles.friendDetailStatValue}>{selectedUser?.xp || 0}</Text>
                                <Text style={styles.friendDetailStatLabel}>XP Total</Text>
                            </View>
                        </View>

                        {selectedUser?.id !== auth.currentUser?.uid && (
                            currentUserFollowing.includes(selectedUser?.id) ? (
                                <TouchableOpacity 
                                    style={styles.unfollowActionButton}
                                    onPress={() => handleUnfollowUser(selectedUser?.id, selectedUser?.name)}
                                >
                                    <Ionicons name="person-remove" size={18} color="#EF4444" />
                                    <Text style={styles.unfollowActionText}>Parar de Seguir</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.followActionButton}
                                    onPress={() => handleFollowUser(selectedUser)}
                                >
                                    <Ionicons name="person-add" size={18} color="#10B981" />
                                    <Text style={styles.followActionText}>Seguir</Text>
                                </TouchableOpacity>
                            )
                        )}
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
    },
    friendDetailOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    friendDetailContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    closeFriendDetailButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    friendDetailAvatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#E2E8F0',
    },
    friendDetailAvatarImage: {
        width: '100%',
        height: '100%',
    },
    friendDetailAvatarInitial: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    friendDetailName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 2,
    },
    friendDetailHandle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
    },
    friendDetailStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
        width: '100%',
        marginBottom: 20,
    },
    friendDetailStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    friendDetailStatDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#E2E8F0',
    },
    friendDetailStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    friendDetailStatLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    unfollowActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#EF4444',
    },
    unfollowActionText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: 'bold',
    },
    followActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#10B981',
    },
    followActionText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: 'bold',
    }
});

export default RankingsScreen;
