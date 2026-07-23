import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Platform, 
  Animated, 
  Easing, 
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Alert,
  TextInput
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import FloatingActionButton from '../../components/finance/FloatingActionButton';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, updateDoc, increment, writeBatch, getDocs } from 'firebase/firestore';
import { useCurrency } from '../../hooks/useCurrency';

const AnimatedSparklesButton = ({ onPress }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity style={styles.gradientButtonContainer} activeOpacity={0.8} onPress={onPress}>
      <Animated.View style={[styles.gradientBackground, { transform: [{ rotate }] }]}>
        <Svg height="120" width="120" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3b82f6" stopOpacity="1" />
              <Stop offset="0.4" stopColor="#60a5fa" stopOpacity="1" />
              <Stop offset="0.6" stopColor="#93c5fd" stopOpacity="1" />
              <Stop offset="1" stopColor="#3b82f6" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#grad)" />
        </Svg>
      </Animated.View>
      <View style={styles.innerButton}>
        <Ionicons name="sparkles" size={20} color="#3b82f6" />
      </View>
    </TouchableOpacity>
  );
};

const FinanceScreen = () => {
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { formatCurrency, currencySymbol } = useCurrency();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [showBalance, setShowBalance] = useState(true);
  const [userPlan, setUserPlan] = useState('Grátis');
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [userChallenges, setUserChallenges] = useState([]);
  
  const [allTransactions, setAllTransactions] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [activeAccount, setActiveAccount] = useState('Pessoal'); 
  const [userAccounts, setUserAccounts] = useState(['Pessoal', 'PJ']);
  const [isAccountMenuVisible, setIsAccountMenuVisible] = useState(false);

  // Estados para o prompt de Input Customizado (Cross-platform modal)
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState(null);

  // Estados para confirmação de exclusão de carteira com checkbox
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const showPrompt = (title, initialVal, callback) => {
      setPromptTitle(title);
      setPromptValue(initialVal);
      setPromptCallback(() => callback);
      setIsPromptVisible(true);
  };

  const handleRenameAccount = async (oldName, newName) => {
      if (!newName || !newName.trim()) return;
      const trimmedNew = newName.trim();
      if (trimmedNew.toLowerCase() === oldName.toLowerCase()) return;
      
      const updatedAccounts = userAccounts.map(acc => acc === oldName ? trimmedNew : acc);
      setUserAccounts(updatedAccounts);
      
      if (activeAccount === oldName) {
          setActiveAccount(trimmedNew);
      }
      
      try {
          const userRef = doc(db, "users", user?.uid);
          await updateDoc(userRef, {
              accounts: updatedAccounts
          });
          
          // Atualiza as transações vinculadas a essa conta em segundo plano
          const updateTrans = async () => {
              try {
                  const q = query(
                      collection(db, "transactions"),
                      where("userId", "==", user.uid),
                      where("accountType", "==", oldName.toLowerCase())
                  );
                  const snap = await getDocs(q);
                  const batch = writeBatch(db);
                  snap.docs.forEach(docSnap => {
                      batch.update(docSnap.ref, { accountType: trimmedNew.toLowerCase() });
                  });
                  await batch.commit();
              } catch (e) {
                  console.error("Erro ao atualizar transações da conta renomeada:", e);
              }
          };
          updateTrans();
      } catch (error) {
          console.error("Erro ao salvar conta renomeada:", error);
      }
  };

  const triggerDeleteAccount = (accName) => {
      if (userAccounts.length <= 1) {
          Alert.alert("Ops!", "Você precisa manter pelo menos uma conta ativa.");
          return;
      }
      setAccountToDelete(accName);
      setDeleteConfirmChecked(false);
      setIsDeleteModalVisible(true);
  };

  const executeDeleteAccount = async () => {
      if (!deleteConfirmChecked || !accountToDelete) return;
      
      const accName = accountToDelete;
      const updatedAccounts = userAccounts.filter(acc => acc !== accName);
      setUserAccounts(updatedAccounts);
      
      if (activeAccount === accName) {
          setActiveAccount(updatedAccounts[0]);
      }
      
      setIsDeleteModalVisible(false);
      
      try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
              accounts: updatedAccounts
          });
          
          // Excluir todas as transações associadas a esta carteira
          const deleteAssociatedTransactions = async () => {
              try {
                  const q = query(
                      collection(db, "transactions"),
                      where("userId", "==", user.uid),
                      where("accountType", "==", accName.toLowerCase())
                  );
                  const snap = await getDocs(q);
                  const batch = writeBatch(db);
                  snap.docs.forEach(docSnap => {
                      batch.delete(docSnap.ref);
                  });
                  await batch.commit();
                  console.log(`Excluídas ${snap.docs.length} transações associadas à conta ${accName}`);
              } catch (e) {
                  console.error("Erro ao excluir transações da carteira:", e);
              }
          };
          deleteAssociatedTransactions();
          
      } catch (error) {
          console.error("Erro ao excluir carteira:", error);
      }
  };

  const handleAddAccount = async (name) => {
      if (!name || !name.trim()) return;
      const trimmedName = name.trim();
      
      if (userAccounts.some(acc => acc.toLowerCase() === trimmedName.toLowerCase())) {
          Alert.alert("Ops!", "Já existe uma carteira com este nome.");
          return;
      }
      
      const updatedAccounts = [...userAccounts, trimmedName];
      setUserAccounts(updatedAccounts);
      
      try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
              accounts: updatedAccounts
          });
      } catch (error) {
          console.error("Erro ao adicionar nova conta:", error);
      }
  };

  // Efeito de filtragem de transações com base na conta ativa
  useEffect(() => {
    const filtered = allTransactions.filter(t => {
      const tAcc = (t.accountType || 'Pessoal').toLowerCase();
      const activeAcc = (activeAccount || 'Pessoal').toLowerCase();
      return tAcc === activeAcc;
    });

    setTransactions(filtered.slice(0, 10));

    // Cálculo do saldo com base nas transações filtradas da conta ativa
    let total = 0;
    filtered.forEach(t => {
      if (t.type === 'income') total += t.amount;
      else total -= t.amount;
    });
    setTotalBalance(total);
  }, [allTransactions, activeAccount]);

  // Efeito de filtragem de desafios com base na conta ativa
  useEffect(() => {
    const filtered = allChallenges.filter(c => {
      const cAcc = (c.accountType || 'Pessoal').toLowerCase();
      const activeAcc = (activeAccount || 'Pessoal').toLowerCase();
      return cAcc === activeAcc;
    });
    setUserChallenges(filtered);
  }, [allChallenges, activeAccount]);

  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [collapsedChallenges, setCollapsedChallenges] = useState({});
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [isEmptyCollapsed, setIsEmptyCollapsed] = useState(false);
  const [isBankingModalVisible, setIsBankingModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isChallengeModalVisible, setIsChallengeModalVisible] = useState(false);
  const [challengeAmount, setChallengeAmount] = useState('');
  const [challengeOp, setChallengeOp] = useState('add');
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

  const toggleChallenge = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedChallenges(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isAllCollapsed;
    setIsAllCollapsed(newState);
    
    const newStates = {};
    userChallenges.forEach(c => {
      newStates[c.id] = newState;
    });
    setCollapsedChallenges(newStates);
  };

  const toggleEmpty = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEmptyCollapsed(!isEmptyCollapsed);
  };

  const handleUpdateChallengeValue = async () => {
    if (!selectedChallenge || !challengeAmount || isSubmittingChallenge) return;
    const value = parseFloat(challengeAmount.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    setIsSubmittingChallenge(true);
    try {
      const challengeRef = doc(db, "user_challenges", selectedChallenge.id);
      const finalValue = challengeOp === 'add' ? value : -value;
      await updateDoc(challengeRef, {
        currentAmount: increment(finalValue)
      });
      setChallengeAmount('');
      setIsChallengeModalVisible(false);
      setSelectedChallenge(null);
    } catch (error) {
      console.error("Error updating challenge:", error);
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.plan) setUserPlan(data.plan);
        if (data.xp !== undefined) setUserXP(data.xp);
        if (data.level !== undefined) setUserLevel(data.level);
        if (data.accounts && Array.isArray(data.accounts)) {
          setUserAccounts(data.accounts);
        } else {
          setUserAccounts(['Pessoal', 'PJ']);
        }
      }
    });

    // Busca de transações em tempo real
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid)
    );

    const unsubTransactions = onSnapshot(q, (snapshot) => {
      let transList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(item => !(item?.isDeleted === true || item?.isDeleted === 'true' || item?.deletedAt != null));

      // Ordenação local (descendente por data)
      transList.sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
      });

      setAllTransactions(transList);
    }, (error) => {
      console.error("Erro nas transações:", error);
    });

    // Busca de desafios iniciados
    const qChallenges = query(
      collection(db, "user_challenges"),
      where("userId", "==", user.uid),
      where("status", "==", "active")
    );

    const unsubChallenges = onSnapshot(qChallenges, (snapshot) => {
      const challengeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllChallenges(challengeList);
      setLoadingChallenges(false);
    }, (error) => {
      console.error("Erro nos desafios:", error);
      setLoadingChallenges(false);
    });

    return () => {
      unsubProfile();
      unsubTransactions();
      unsubChallenges();
    };
  }, [user]);

  const maskCurrency = (value) => showBalance ? formatCurrency(value) : `${currencySymbol} ••••`;

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIconContainer, { borderColor: item.categoryColor || '#EEE' }]}>
        <MaterialCommunityIcons 
          name={item.categoryIcon || 'cash'} 
          size={24} 
          color={item.categoryColor || theme.colors.textPrimary} 
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{item.description}</Text>
        <Text style={styles.transactionSubtitle}>
          {item.date ? new Date(item.date.seconds * 1000).toLocaleDateString('pt-BR') : 'Recent'}
        </Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? '#FF5252' : '#4CAF50' }]}>
          {showBalance ? (item.type === 'expense' ? '-' : '+') : ''}{showBalance ? formatCurrency(item.amount) : `${currencySymbol} ••••`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={styles.nameLevelRow}>
              <Text style={styles.greetingHeader} numberOfLines={1}>
                {getGreeting()}, {user?.displayName || 'Usuário Finan'}
              </Text>
            </View>
            <View style={styles.planAndXP}>
              <TouchableOpacity 
                style={styles.accountSwitcher}
                onPress={() => setIsAccountMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.accountText}>
                  Conta <Text style={[styles.accountHighlight, { color: userPlan === 'Premium' ? '#3b82f6' : '#64748B' }]}>{activeAccount}</Text>
                </Text>
                <Ionicons name="chevron-down" size={14} color={userPlan === 'Premium' ? '#3b82f6' : '#94A3B8'} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              <View style={styles.xpDivider} />
              <View style={styles.xpContainer}>
                <Text style={styles.xpText}>Lvl {userLevel} • {userXP} XP</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <AnimatedSparklesButton 
              onPress={() => navigation.navigate('AiChat', {
                userProfile: {
                  displayName: user?.displayName || 'Usuário Finan',
                  email: user?.email,
                  level: userLevel,
                  xp: userXP,
                  plan: userPlan
                },
                financialData: {
                  totalBalance,
                  transactions: transactions.map(t => ({
                    description: t.description,
                    amount: t.amount,
                    type: t.type,
                    category: t.categoryName || t.category || '',
                    date: t.date ? new Date(t.date.seconds * 1000).toLocaleDateString('pt-BR') : null
                  })),
                  challenges: userChallenges.map(c => ({
                    title: c.title,
                    targetAmount: c.targetAmount,
                    currentAmount: c.currentAmount,
                    status: c.status
                  }))
                }
              })} 
            />
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Seu saldo</Text>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>
              {showBalance ? formatCurrency(totalBalance) : `${currencySymbol} ••••••••`}
            </Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionButtonItem} onPress={() => navigation.navigate('AnalyticsScreen', { activeAccount })}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="pie-chart" size={22} color="#0ea5e9" />
              </View>
              <Text style={styles.actionButtonLabel}>Análises</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.actionButtonItem} onPress={() => navigation.navigate('Payments')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="calendar" size={22} color="#e23e3e" />
              </View>
              <Text style={styles.actionButtonLabel}>Pagamentos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButtonItem} onPress={() => navigation.navigate('Transactions')}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FAF5FF' }]}>
                <Ionicons name="receipt" size={22} color="#a855f7" />
              </View>
              <Text style={styles.actionButtonLabel}>Transações</Text>
            </TouchableOpacity>
          </View>
        </View>

          {/* Desafios Iniciados Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Desafios Iniciados</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerToggleIcon} 
            onPress={userChallenges.length > 0 ? toggleAll : toggleEmpty}
          >
            <Ionicons 
              name={
                (userChallenges.length > 0 ? isAllCollapsed : isEmptyCollapsed)
                  ? 'chevron-down-circle-outline' 
                  : 'chevron-up-circle-outline'
              } 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.iniciadosList}>
          {loadingChallenges ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : userChallenges.length > 0 ? (
            <>
              {userChallenges.map(item => {
                const isCollapsed = collapsedChallenges[item.id];
                const isChinese = item.templateId === 'desafio-chines';
                const is52Weeks = item.templateId === '52-semanas';
                const isSlotBased = isChinese || is52Weeks;
                const slots = item.slots || [];
                const pickedSlots = slots.filter(s => s.picked).length;
                const totalSlots = slots.length;

                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.iniciadoCard, isCollapsed && { paddingBottom: 16 }]} 
                    activeOpacity={0.7} 
                    onPress={() => toggleChallenge(item.id)}
                    onLongPress={() => {
                      if (isSlotBased) {
                        navigation.navigate('AddChallenges');
                      } else {
                        setSelectedChallenge(item);
                        setIsChallengeModalVisible(true);
                      }
                    }}
                  >
                  <View style={[styles.iniciadoIconBox, { backgroundColor: (item.color || '#EEE') + '15' }]}>
                    {item.iconType === 'Ionicons' ? (
                      <Ionicons name={item.iconName || 'rocket-outline'} size={24} color={item.color || '#000'} />
                    ) : (
                      <MaterialCommunityIcons name={item.iconName || 'rocket'} size={24} color={item.color || '#000'} />
                    )}
                  </View>
                  <View style={styles.iniciadoMain}>
                    <View style={[styles.iniciadoHeaderRow, isCollapsed && { marginBottom: 0 }]}>
                      <Text style={styles.iniciadoTitleText}>{item.title}</Text>
                      <TouchableOpacity 
                        style={styles.minimizeButton} 
                        onPress={() => toggleChallenge(item.id)}
                      >
                        <Ionicons 
                          name={isCollapsed ? "chevron-down" : "chevron-up"} 
                          size={18} 
                          color="#CBD5E1" 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    {!isCollapsed && (
                      isSlotBased ? (
                        <>
                          {/* Slot progress bar */}
                          <View style={styles.progressBarBg}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { 
                                  width: `${Math.min((pickedSlots / Math.max(totalSlots, 1)) * 100, 100)}%`,
                                  backgroundColor: item.color || theme.colors.primary
                                }
                              ]} 
                            />
                          </View>
                          <View style={styles.iniciadoFooterRow}>
                            <Text style={styles.percentText}>
                              {isChinese
                                ? `${pickedSlots}/${totalSlots} envelopes`
                                : `Semana ${pickedSlots} de ${totalSlots}`}
                            </Text>
                            <Text style={[styles.amountText, { color: item.color || '#22C55E' }]}>
                              {maskCurrency(item.currentAmount || 0)}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          {/* Amount progress bar */}
                          <View style={styles.progressBarBg}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { 
                                  width: `${Math.min(((item.currentAmount || 0) / (item.goalAmount || 1)) * 100, 100)}%`,
                                  backgroundColor: item.color || theme.colors.primary
                                }
                              ]} 
                            />
                          </View>
                          <View style={styles.iniciadoFooterRow}>
                            <Text style={styles.percentText}>
                              {Math.round(((item.currentAmount || 0) / (item.goalAmount || 1)) * 100)}% completo
                            </Text>
                            <Text style={[styles.amountText, { color: item.color || '#22C55E' }]}>
                              {maskCurrency(item.currentAmount || 0)}
                            </Text>
                          </View>
                        </>
                      )
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity 
              style={styles.addMoreChallengesCard}
              activeOpacity={0.6}
              onPress={() => navigation.navigate('AddChallenges')}
            >
              <View style={styles.addMoreIconBox}>
                <Ionicons name="add" size={24} color="#94A3B8" />
              </View>
              <Text style={styles.addMoreText}>Criar um novo desafio</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.emptyStateContainer, isEmptyCollapsed && { paddingVertical: 12 }]}>
              {isEmptyCollapsed ? (
                <TouchableOpacity 
                  style={styles.collapsedEmptyRow} 
                  onPress={toggleEmpty}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trophy-outline" size={18} color="#CBD5E1" />
                  <Text style={styles.collapsedEmptyText}>Gerencie seus desafios aqui...</Text>
                  <Ionicons name="chevron-down" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.emptyIconCircle}>
                      <Ionicons name="trophy-outline" size={32} color="#CBD5E1" />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhum desafio ativo</Text>
                  <Text style={styles.emptyDesc}>Comece um desafio para acompanhar suas economias de forma divertida!</Text>
                  <TouchableOpacity 
                      style={styles.emptyButton}
                      onPress={() => navigation.navigate('AddChallenges')}
                  >
                      <Text style={styles.emptyButtonText}>Escolher Desafio</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.verTodos}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsList}>
          {transactions.length > 0 ? (
            transactions.map(item => (
              <View key={item.id}>
                {renderTransaction({ item })}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
          )}
        </View>
      </ScrollView>
      
      <Modal
        visible={isBankingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsBankingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackgroundDismiss} 
            activeOpacity={1} 
            onPress={() => setIsBankingModalVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.bankLogosRow}>
              <View style={[styles.bankCircle, { zIndex: 1 }]}>
                <Image source={require('../../assets/images/nu.png')} style={styles.bankImage} />
              </View>
              <View style={[styles.bankCircle, { zIndex: 2, marginLeft: -15, borderWidth: 2, borderColor: '#262626' }]}>
                <Image source={require('../../assets/images/itau.png')} style={styles.bankImage} />
              </View>
              <View style={[styles.bankCircle, { zIndex: 3, marginLeft: -15, borderWidth: 2, borderColor: '#262626' }]}>
                <Image source={require('../../assets/images/inter.png')} style={styles.bankImage} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Vincular seu Banco!</Text>
            <Text style={styles.modalSubtitle}>
              Vincule sua conta do Finan com sua conta do banco para ter mais praticidade através do open banking.
            </Text>

            <TouchableOpacity 
              style={styles.modalPrimaryButton} 
              onPress={() => {
                setIsBankingModalVisible(false);
                setTimeout(() => {
                  Alert.alert('Indisponível', 'Esta funcionalidade estará disponível em versões futuras do Finan!');
                }, 500);
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>Vincular agora</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSecondaryButton} 
              onPress={() => setIsBankingModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isChallengeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsChallengeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <TouchableOpacity 
                style={styles.modalBackgroundDismiss} 
                activeOpacity={1} 
                onPress={() => setIsChallengeModalVisible(false)} 
            />
            <View style={styles.challengeModalContent}>
                <View style={styles.modalHeaderClose}>
                    <Text style={styles.modalTitleDetail}>Ajustar Valores</Text>
                    <TouchableOpacity onPress={() => setIsChallengeModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                
                {selectedChallenge && (
                    <View style={styles.challengeDetailBody}>
                        <View style={styles.challengeInfoRow}>
                            <View style={[styles.challengeIconCircle, { backgroundColor: '#333' }]}>
                                {selectedChallenge.iconType === 'Ionicons' ? (
                                    <Ionicons name={selectedChallenge.iconName || 'rocket-outline'} size={32} color={selectedChallenge.color || '#3b82f6'} />
                                ) : (
                                    <MaterialCommunityIcons name={selectedChallenge.iconName || 'rocket'} size={32} color={selectedChallenge.color || '#3b82f6'} />
                                )}
                            </View>
                            <View>
                                <Text style={styles.challengeDetailTitle}>{selectedChallenge.title}</Text>
                                <Text style={styles.challengeDetailGoal}>Meta: {formatCurrency(selectedChallenge.goalAmount)}</Text>
                            </View>
                        </View>

                        <View style={styles.opToggleContainer}>
                            <TouchableOpacity 
                                style={[styles.opToggleButton, challengeOp === 'add' && styles.opToggleActiveAdd]}
                                onPress={() => setChallengeOp('add')}
                            >
                                <Ionicons name="add-circle" size={18} color={challengeOp === 'add' ? '#FFF' : '#94A3B8'} />
                                <Text style={[styles.opToggleText, challengeOp === 'add' && styles.opToggleTextActive]}>Adicionar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.opToggleButton, challengeOp === 'subtract' && styles.opToggleActiveSub]}
                                onPress={() => setChallengeOp('subtract')}
                            >
                                <Ionicons name="remove-circle" size={18} color={challengeOp === 'subtract' ? '#FFF' : '#94A3B8'} />
                                <Text style={[styles.opToggleText, challengeOp === 'subtract' && styles.opToggleTextActive]}>Retirar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.challengeInputWrapper}>
                          <Text style={styles.challengeCurrency}>{currencySymbol}</Text>
                            <TextInput
                                style={styles.challengeInput}
                                placeholder="0,00"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={challengeAmount}
                                onChangeText={setChallengeAmount}
                            />
                        </View>

                        <TouchableOpacity 
                            style={[
                                styles.challengeConfirmBtn, 
                                { backgroundColor: challengeOp === 'add' ? (selectedChallenge.color || '#3b82f6') : '#EF4444' }
                            ]}
                            onPress={handleUpdateChallengeValue}
                            disabled={isSubmittingChallenge}
                        >
                            {isSubmittingChallenge ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.challengeConfirmBtnText}>
                                    {challengeOp === 'add' ? 'Confirmar Aporte' : 'Confirmar Retirada'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Conta */}
      <Modal
        visible={isAccountMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAccountMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackgroundDismiss} 
            activeOpacity={1} 
            onPress={() => setIsAccountMenuVisible(false)} 
          />
          <View style={styles.accountMenuContent}>
            <Text style={styles.accountMenuTitle}>Selecionar Conta</Text>
            
            <ScrollView style={{ width: '100%', maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {userAccounts.map((accName) => {
                const isActive = activeAccount === accName;
                const iconName = accName === 'PJ' ? 'briefcase' : 'wallet';
                
                return (
                  <View key={accName} style={[styles.accountMenuItem, isActive && styles.accountMenuItemActive]}>
                    <TouchableOpacity 
                      style={styles.accountMenuItemMainClickable}
                      onPress={() => {
                        setActiveAccount(accName);
                        setIsAccountMenuVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.accountMenuIconCircle, { backgroundColor: isActive ? '#3b82f615' : '#F1F5F9' }]}>
                        <Ionicons name={iconName} size={18} color={isActive ? '#3b82f6' : '#64748B'} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.accountMenuName, isActive && styles.accountMenuNameActive]} numberOfLines={1}>{accName}</Text>
                        <Text style={styles.accountMenuDesc} numberOfLines={1}>Visualizar saldo e transações</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.accountMenuItemActions}>
                      <TouchableOpacity 
                        style={styles.accountActionIntegratedBtn}
                        onPress={() => {
                          showPrompt("Renomear Carteira", accName, (newName) => {
                            handleRenameAccount(accName, newName);
                          });
                        }}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#64748B" />
                      </TouchableOpacity>
                      
                      {userAccounts.length > 1 && (
                        <TouchableOpacity 
                          style={styles.accountActionIntegratedBtn}
                          onPress={() => triggerDeleteAccount(accName)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {userPlan === 'Premium' && (
              <TouchableOpacity 
                style={styles.addAccountBtn}
                onPress={() => {
                  showPrompt("Nova Carteira", "", (newName) => {
                    handleAddAccount(newName);
                  });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.addAccountBtnText}>Adicionar Nova Carteira</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.openFinanceBtn}
              onPress={() => {
                setIsAccountMenuVisible(false);
                setTimeout(() => {
                  setIsBankingModalVisible(true);
                }, 300);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.openFinanceIconCircle}>
                <Ionicons name="swap-horizontal" size={20} color="#FFF" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.openFinanceBtnText}>Sincronizar Open Finance</Text>
                <Text style={styles.openFinanceDesc}>Conecte suas contas bancárias automaticamente</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.accountMenuCloseBtn}
              onPress={() => setIsAccountMenuVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.accountMenuCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Input Prompt Customizado (Cross-platform) */}
      <Modal
        visible={isPromptVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPromptVisible(false)}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptContent}>
            <Text style={styles.promptTitle}>{promptTitle}</Text>
            <TextInput
              style={styles.promptInput}
              value={promptValue}
              onChangeText={setPromptValue}
              autoFocus
              placeholder="Digite o nome..."
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.promptButtonsRow}>
              <TouchableOpacity 
                style={[styles.promptBtn, styles.promptCancelBtn]} 
                onPress={() => setIsPromptVisible(false)}
              >
                <Text style={styles.promptCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.promptBtn, styles.promptSaveBtn]} 
                onPress={() => {
                  if (promptCallback) promptCallback(promptValue);
                  setIsPromptVisible(false);
                }}
              >
                <Text style={styles.promptSaveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Customizado de Confirmação de Exclusão */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptContent}>
            <View style={styles.deleteHeaderRow}>
              <Ionicons name="warning" size={22} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.deleteModalTitle}>Excluir Carteira</Text>
            </View>
            
            <Text style={styles.deleteModalWarning}>
              Você tem certeza de que deseja excluir permanentemente a carteira <Text style={{ fontWeight: 'bold' }}>"{accountToDelete}"</Text>? Esta ação é irreversível.
            </Text>
            
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setDeleteConfirmChecked(!deleteConfirmChecked)}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={deleteConfirmChecked ? "checkbox" : "square-outline"} 
                size={20} 
                color={deleteConfirmChecked ? "#EF4444" : "#64748B"} 
                style={{ marginRight: 10, marginTop: 2 }}
              />
              <Text style={styles.checkboxLabel}>
                Confirmo que desejo excluir permanentemente todas as transações vinculadas a esta carteira.
              </Text>
            </TouchableOpacity>

            <View style={styles.promptButtonsRow}>
              <TouchableOpacity 
                style={[styles.promptBtn, styles.promptCancelBtn]} 
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.promptCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.promptBtn, 
                  styles.promptSaveBtn, 
                  { backgroundColor: deleteConfirmChecked ? '#EF4444' : '#E2E8F0' }
                ]} 
                onPress={executeDeleteAccount}
                disabled={!deleteConfirmChecked}
              >
                <Text style={[
                  styles.promptSaveBtnText, 
                  { color: deleteConfirmChecked ? '#FFF' : '#94A3B8' }
                ]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingActionButton activeAccount={activeAccount} isPremium={userPlan === 'Premium'} />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingHeader: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    color: '#000',
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planAndXP: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  xpDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#DDD',
    marginHorizontal: 8,
  },
  xpContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xpText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  planLabel: {
    fontSize: 14,
    color: '#777',
  },
  planType: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  gradientButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  gradientWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    width: 90, 
    height: 90,
  },
  innerButton: {
    width: 40, 
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  balanceLabel: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 8,
  },
  balanceValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  actionButtonItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    color: '#000',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAddIcon: {
    padding: 2,
  },
  headerToggleIcon: {
    padding: 6,
    backgroundColor: '#3b82f615',
    borderRadius: 12,
  },
  addCardText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Inciados Styles
  iniciadosList: {
    marginBottom: 20,
  },
  iniciadoCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iniciadoIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iniciadoMain: {
    flex: 1,
  },
  iniciadoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  minimizeButton: {
    padding: 4,
  },
  iniciadoTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  iniciadoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  collapsedEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  collapsedEmptyText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyIconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#F8F9FA',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#334155',
      marginBottom: 8,
  },
  emptyDesc: {
      fontSize: 13,
      color: '#64748B',
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 18,
  },
  emptyButton: {
      backgroundColor: '#3b82f6',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 15,
  },
  emptyButtonText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 14,
  },
  verTodos: {
    fontSize: 14,
    color: '#AAA',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
    fontSize: 14,
  },
  transactionsList: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#AAA',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  bonusBadge: {
    backgroundColor: '#60a5fa',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  bonusText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  // Modal Open Banking Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackgroundDismiss: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    backgroundColor: '#262626',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  bankLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  bankCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  bankImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  modalPrimaryButton: {
    backgroundColor: '#4A90E2',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSecondaryButton: {
    paddingVertical: 10,
  },
  modalSecondaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addMoreChallengesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(235, 240, 245, 0.4)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginHorizontal: 4,
  },
  addMoreIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addMoreText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  challengeModalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeaderClose: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleDetail: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  challengeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 25,
  },
  challengeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  challengeDetailGoal: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  opToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2D2D2D',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  opToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  opToggleActiveAdd: {
    backgroundColor: '#3b82f6',
  },
  opToggleActiveSub: {
    backgroundColor: '#EF4444',
  },
  opToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  opToggleTextActive: {
    color: '#FFF',
  },
  challengeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 20,
  },
  challengeCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 10,
  },
  challengeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  challengeConfirmBtn: {
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeConfirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  accountSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  accountText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  accountHighlight: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  accountMenuContent: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  accountMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  accountMenuItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#F8FAFC',
  },
  accountMenuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountMenuName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  accountMenuNameActive: {
    color: '#3b82f6',
  },
  accountMenuDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  accountMenuCloseBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F1F5F9',
  },
  accountMenuCloseBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  openFinanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#3b82f630',
    backgroundColor: '#3b82f608',
  },
  openFinanceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  openFinanceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3b82f6',
  },
  openFinanceDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  accountMenuItemMainClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountMenuItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingLeft: 8,
    gap: 6,
  },
  accountActionIntegratedBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3b82f660',
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  addAccountBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  promptInput: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#1E293B',
    fontSize: 15,
    marginBottom: 20,
  },
  promptButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  promptBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  promptSaveBtn: {
    backgroundColor: '#3b82f6',
  },
  promptCancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  promptSaveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#991B1B',
    lineHeight: 18,
  },
});

export default FinanceScreen;
