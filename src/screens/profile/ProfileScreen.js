import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    Modal,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { auth, db } from '../../services/firebaseConfig';
import { 
    doc, 
    onSnapshot, 
    updateDoc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    limit, 
    arrayUnion, 
    arrayRemove 
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
    const user = auth.currentUser;

    const [userXP, setUserXP] = useState(0);
    const [userLevel, setUserLevel] = useState(1);
    const [streakDays, setStreakDays] = useState(0);
    const [completedUnitsCount, setCompletedUnitsCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followingIds, setFollowingIds] = useState([]);
    const [followingUsers, setFollowingUsers] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(false);

    // Modais de Controle
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [allAppUsers, setAllAppUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searching, setSearching] = useState(false);

    const [friendDetailModalVisible, setFriendDetailModalVisible] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);

    useEffect(() => {
        if (!user) return;
        
        // 1. Escuta em tempo real dos dados do usuário
        const userRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.xp !== undefined) setUserXP(data.xp);
                if (data.level !== undefined) setUserLevel(data.level);
                
                const followers = data.followers || [];
                const following = data.following || [];
                setFollowersCount(followers.length);
                setFollowingCount(following.length);
                setFollowingIds(following);
            }
        });

        // 2. Escuta de Streak (Ofensiva)
        const streakRef = doc(db, 'users', user.uid, 'gamification', 'streak');
        const unsubStreak = onSnapshot(streakRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStreakDays(data.currentStreak || 0);
            }
        });

        // 3. Escuta de Trail Progress (Lições/Unidades completas)
        const trailProgressRef = doc(db, 'users', user.uid, 'gamification', 'trailProgress');
        const unsubTrail = onSnapshot(trailProgressRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const ids = data.completedUnitIds || [];
                setCompletedUnitsCount(ids.length);
            }
        });

        return () => {
            unsubscribe();
            unsubStreak();
            unsubTrail();
        };
    }, [user]);

    // Busca detalhes dos amigos seguidos sempre que a lista de IDs mudar
    const fetchFollowingDetails = async () => {
        if (followingIds.length === 0) {
            setFollowingUsers([]);
            return;
        }
        setLoadingFriends(true);
        try {
            const list = [];
            for (const id of followingIds) {
                const uRef = doc(db, 'users', id);
                const snap = await getDoc(uRef);
                if (snap.exists()) {
                    list.push({ id, ...snap.data() });
                }
            }
            setFollowingUsers(list);
        } catch (e) {
            console.error("Erro ao carregar detalhes dos amigos:", e);
        } finally {
            setLoadingFriends(false);
        }
    };

    useEffect(() => {
        fetchFollowingDetails();
    }, [followingIds]);

    const creationDate = user?.metadata?.creationTime 
        ? new Date(user.metadata.creationTime) 
        : new Date();
    
    const formattedDate = creationDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    const userShortCode = user?.uid ? user.uid.substring(0, 6).toUpperCase() : 'XXXXXX';

    const copyFriendCode = async () => {
        try {
            await Clipboard.setStringAsync(userShortCode);
            Alert.alert("Código Copiado!", "Seu código de amigo foi copiado para a área de transferência!");
        } catch (e) {
            console.error("Erro ao copiar código:", e);
            Alert.alert("Erro", "Não foi possível copiar o código.");
        }
    };

    // Abrir modal de busca de amigos
    const openSearchModal = async () => {
        setSearchModalVisible(true);
        setSearching(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, limit(100));
            const snap = await getDocs(q);
            const list = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.id !== user.uid); // Excluir eu mesmo
            setAllAppUsers(list);
            setFilteredUsers(list);
        } catch (e) {
            console.error("Erro ao carregar usuários para busca:", e);
        } finally {
            setSearching(false);
        }
    };

    // Filtragem local conforme digitação
    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredUsers(allAppUsers);
        } else {
            const searchLower = searchText.toLowerCase();
            const filtered = allAppUsers.filter(u => {
                const nameMatch = u.name?.toLowerCase().includes(searchLower);
                const emailMatch = u.email?.toLowerCase().includes(searchLower);
                const code = u.id.substring(0, 6).toUpperCase();
                const codeMatch = code.includes(searchLower.toUpperCase());
                return nameMatch || emailMatch || codeMatch;
            });
            setFilteredUsers(filtered);
        }
    }, [searchText, allAppUsers]);

    // Seguir Usuário
    const handleFollowUser = async (targetUser) => {
        if (!user) return;
        const myRef = doc(db, 'users', user.uid);
        const targetRef = doc(db, 'users', targetUser.id);
        
        try {
            await updateDoc(myRef, {
                following: arrayUnion(targetUser.id)
            });
            await updateDoc(targetRef, {
                followers: arrayUnion(user.uid)
            });
        } catch (e) {
            console.error("Erro ao seguir usuário:", e);
            Alert.alert("Erro", "Não foi possível seguir o usuário.");
        }
    };

    // Parar de Seguir Usuário
    const handleUnfollowUser = async (targetUserId, targetUserName = 'este usuário') => {
        if (!user) return;

        Alert.alert(
            "Deixar de seguir",
            `Tem certeza que deseja parar de seguir ${targetUserName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sim, parar de seguir", 
                    style: "destructive",
                    onPress: async () => {
                        const myRef = doc(db, 'users', user.uid);
                        const targetRef = doc(db, 'users', targetUserId);
                        
                        try {
                            await updateDoc(myRef, {
                                following: arrayRemove(targetUserId)
                            });
                            await updateDoc(targetRef, {
                                followers: arrayRemove(user.uid)
                            });
                            
                            setFriendDetailModalVisible(false);
                        } catch (e) {
                            console.error("Erro ao parar de seguir usuário:", e);
                            Alert.alert("Erro", "Não foi possível realizar a ação.");
                        }
                    }
                }
            ]
        );
    };

    const openFriendDetailModal = (friend) => {
        setSelectedFriend(friend);
        setFriendDetailModalVisible(true);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Section with Character */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.settingsButton} 
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Ionicons name="settings-outline" size={28} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    
                    <View style={styles.characterContainer}>
                        <Image 
                            source={require('../../assets/images/fin.png')}
                            style={styles.characterImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Profile Information */}
                <View style={styles.content}>
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>{user?.displayName || 'Usuário Finan'}</Text>
                        <TouchableOpacity onPress={copyFriendCode} activeOpacity={0.7} style={styles.handleContainer}>
                            <Text style={styles.handle}>
                                @{userShortCode} <Ionicons name="copy-outline" size={13} color="#666666" /> • Criado em {formattedDate}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Summary */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{completedUnitsCount}</Text>
                            <Text style={styles.statLabel}>Trilhas</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{followersCount}</Text>
                            <Text style={styles.statLabel}>Seguidores</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{followingCount}</Text>
                            <Text style={styles.statLabel}>Seguindo</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.conviteButton} onPress={openSearchModal}>
                            <Ionicons name="person-add" size={20} color={theme.colors.primary} />
                            <Text style={styles.conviteText}>Adicionar Amigos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.shareButton} 
                            onPress={() => Alert.alert("Código de Amigo", `Envie seu código de amigo para seus contatos:\n\n${userShortCode}`)}
                        >
                            <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Overview Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Overview</Text>
                    </View>

                    <View style={styles.overviewGrid}>
                        <View style={styles.overviewCard}>
                            <View style={styles.cardTopRow}>
                                <MaterialCommunityIcons name="fire" size={24} color="#F97316" />
                                <Text style={styles.cardValue}>{streakDays}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Dia streak</Text>
                        </View>

                        <View style={styles.overviewCard}>
                            <View style={styles.cardTopRow}>
                                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FACC15" />
                                <Text style={styles.cardValue}>{userXP}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Total XP</Text>
                        </View>

                        <View style={styles.overviewCard}>
                            <View style={styles.cardTopRow}>
                                <MaterialCommunityIcons name="trophy" size={24} color="#F59E0B" />
                                <Text style={styles.cardValue}>Gold</Text>
                            </View>
                            <Text style={styles.cardLabel}>League</Text>
                        </View>

                        <View style={styles.overviewCard}>
                            <View style={styles.cardTopRow}>
                                <MaterialCommunityIcons name="folder-outline" size={24} color="#3B82F6" />
                                <Text style={styles.cardValue}>{completedUnitsCount}</Text>
                            </View>
                            <Text style={styles.cardLabel}>Lições completas</Text>
                        </View>
                    </View>

                    {/* Friend Streaks Section */}
                    <View style={styles.friendStreaksCard}>
                        <Text style={styles.friendStreaksTitle}>Amigos</Text>
                        
                        {loadingFriends ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <View style={styles.friendsRow}>
                                {/* Renderizar amigos seguidos (máximo 4 avatares) */}
                                {followingUsers.slice(0, 4).map((friend) => (
                                    <TouchableOpacity 
                                        key={friend.id} 
                                        style={styles.friendItem}
                                        onPress={() => openFriendDetailModal(friend)}
                                    >
                                        <View style={styles.avatarWrapper}>
                                            <View style={[styles.avatarCircle, { backgroundColor: '#DBEAFE' }]}>
                                                {friend.photoURL ? (
                                                    <Image 
                                                        source={{ uri: friend.photoURL }} 
                                                        style={styles.friendAvatarImage}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.friendAvatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                                        <Text style={styles.avatarInitial}>{friend.name?.charAt(0) || 'U'}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.activeStreakBadge}>
                                                <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FACC15" />
                                            </View>
                                        </View>
                                        <Text style={styles.friendMiniName} numberOfLines={1}>
                                            {friend.name?.split(' ')[0] || 'Amigo'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Preencher com slots vazios até 4 para convite */}
                                {Array.from({ length: Math.max(0, 4 - followingUsers.length) }).map((_, index) => (
                                    <TouchableOpacity 
                                        key={`slot-${index}`} 
                                        style={styles.addFriendSlot}
                                        onPress={openSearchModal}
                                    >
                                        <Ionicons name="add" size={28} color="#CCCCCC" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal de Busca de Amigos */}
            <Modal
                visible={searchModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setSearchModalVisible(false)}
            >
                <SafeAreaView style={styles.modalSafeArea}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity 
                            onPress={() => setSearchModalVisible(false)} 
                            style={styles.modalBackButton}
                        >
                            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.modalHeaderTitle}>Procurar Amigos</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.searchBarContainer}>
                        <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Buscar por nome ou código..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={styles.searchInput}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    {searching ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.searchListContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={() => (
                                <View style={styles.emptySearchContainer}>
                                    <LottieView
                                        source={require('../../assets/lottie/access_denied.json')}
                                        autoPlay
                                        loop
                                        style={styles.emptySearchLottie}
                                    />
                                    <Text style={styles.emptySearchText}>Nenhum usuário encontrado</Text>
                                </View>
                            )}
                            renderItem={({ item }) => {
                                const isFollowing = followingIds.includes(item.id);
                                const itemShortCode = item.id.substring(0, 6).toUpperCase();
                                
                                return (
                                    <View style={styles.userSearchCard}>
                                        <View style={styles.userSearchAvatarCircle}>
                                            {item.photoURL ? (
                                                <Image source={{ uri: item.photoURL }} style={styles.userSearchAvatarImage} />
                                            ) : (
                                                <View style={[styles.userSearchAvatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={styles.avatarInitial}>{item.name?.charAt(0) || 'U'}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.userSearchInfo}>
                                            <Text style={styles.userSearchName} numberOfLines={1}>{item.name || 'Usuário'}</Text>
                                            <Text style={styles.userSearchHandle}>@{itemShortCode} • Lvl {item.level || 1}</Text>
                                        </View>
                                        {isFollowing ? (
                                            <TouchableOpacity 
                                                style={styles.unfollowSearchButton}
                                                onPress={() => handleUnfollowUser(item.id, item.name)}
                                            >
                                                <Text style={styles.unfollowSearchButtonText}>Seguindo</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity 
                                                style={styles.followSearchButton}
                                                onPress={() => handleFollowUser(item)}
                                            >
                                                <Text style={styles.followSearchButtonText}>Seguir</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            }}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Modal de Detalhes do Amigo */}
            <Modal
                visible={friendDetailModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setFriendDetailModalVisible(false)}
            >
                <View style={styles.friendDetailOverlay}>
                    <View style={styles.friendDetailContainer}>
                        <TouchableOpacity 
                            style={styles.closeFriendDetailButton} 
                            onPress={() => setFriendDetailModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#666666" />
                        </TouchableOpacity>

                        <View style={styles.friendDetailAvatarCircle}>
                            {selectedFriend?.photoURL ? (
                                <Image source={{ uri: selectedFriend.photoURL }} style={styles.friendDetailAvatarImage} />
                            ) : (
                                <View style={[styles.friendDetailAvatarImage, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={styles.friendDetailAvatarInitial}>{selectedFriend?.name?.charAt(0) || 'U'}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.friendDetailName}>{selectedFriend?.name || 'Amigo'}</Text>
                        <Text style={styles.friendDetailHandle}>@{selectedFriend?.id.substring(0, 6).toUpperCase()}</Text>

                        <View style={styles.friendDetailStatsRow}>
                            <View style={styles.friendDetailStatItem}>
                                <Text style={styles.friendDetailStatValue}>{selectedFriend?.level || 1}</Text>
                                <Text style={styles.friendDetailStatLabel}>Nível</Text>
                            </View>
                            <View style={styles.friendDetailStatDivider} />
                            <View style={styles.friendDetailStatItem}>
                                <Text style={styles.friendDetailStatValue}>{selectedFriend?.xp || 0}</Text>
                                <Text style={styles.friendDetailStatLabel}>XP Total</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.unfollowActionButton}
                            onPress={() => handleUnfollowUser(selectedFriend?.id, selectedFriend?.name)}
                        >
                            <Ionicons name="person-remove" size={18} color="#EF4444" />
                            <Text style={styles.unfollowActionText}>Parar de Seguir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
    },
    header: {
        height: 220,
        backgroundColor: '#63E6BE',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 0,
    },
    settingsButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 5, 
    },
    characterContainer: {
        width: 180,
        height: 180,
        marginBottom: -10,
    },
    characterImage: {
        width: '100%',
        height: '100%',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    profileInfo: {
        marginBottom: 20,
    },
    name: {
        fontFamily: theme.fonts.title,
        fontSize: 28,
        color: '#333333',
        marginBottom: 4,
    },
    handle: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    handleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E5E7EB',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    statLabel: {
        fontSize: 14,
        color: '#999999',
        marginTop: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 35,
    },
    conviteButton: {
        flex: 1,
        flexDirection: 'row',
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    conviteText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    shareButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: theme.fonts.title,
        fontSize: 24,
        color: '#333333',
    },
    overviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    overviewCard: {
        width: (width - 55) / 2,
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginBottom: 15,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginLeft: 8,
    },
    cardLabel: {
        fontSize: 14,
        color: '#999999',
        fontWeight: '500',
        marginLeft: 32, 
    },
    friendStreaksCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        padding: 16,
        marginTop: 10,
        marginBottom: 30,
    },
    friendStreaksTitle: {
        fontFamily: theme.fonts.title,
        fontSize: 24,
        color: '#333333',
        marginBottom: 16,
    },
    friendsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 16,
    },
    friendItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    friendAvatarImage: {
        width: '100%',
        height: '100%',
    },
    activeStreakBadge: {
        position: 'absolute',
        bottom: -4,
        right: 0,
        backgroundColor: '#FFFFFF',
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#CCCCCC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addFriendSlot: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#CCCCCC',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendMiniName: {
        fontSize: 11,
        color: '#666666',
        marginTop: 4,
        textAlign: 'center',
        width: 60,
    },
    avatarInitial: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalSafeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalBackButton: {
        padding: 4,
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginVertical: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchListContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    emptySearchContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptySearchLottie: {
        width: 150,
        height: 150,
    },
    emptySearchText: {
        fontSize: 15,
        color: '#64748B',
        marginTop: 8,
    },
    userSearchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        marginBottom: 12,
    },
    userSearchAvatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#E2E8F0',
    },
    userSearchAvatarImage: {
        width: '100%',
        height: '100%',
    },
    userSearchInfo: {
        flex: 1,
    },
    userSearchName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    userSearchHandle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    followSearchButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    followSearchButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    unfollowSearchButton: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    unfollowSearchButtonText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: 'bold',
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
    }
});

export default ProfileScreen;
