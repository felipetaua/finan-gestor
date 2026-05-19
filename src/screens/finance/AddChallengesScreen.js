import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Image, 
    FlatList, 
    Dimensions, 
    Modal, 
    Platform,
    ActivityIndicator,
    TextInput,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, increment, getDocs, deleteDoc } from 'firebase/firestore';
import { useCurrency } from '../../hooks/useCurrency';

const { width } = Dimensions.get('window');

const BANNERS = [
    {
        id: '1',
        title: 'Desafios Financeiros',
        subtitle: 'Tem dificuldades para guardar dinheiro? Experimente esses desafios.',
        color: '#84C9FB',
        image: require('../../assets/images/banner-fin-1.png'),
        detail: {
            heading: 'Por que fazer desafios financeiros?',
            body: [
                {
                    type: 'paragraph',
                    text: 'Guardar dinheiro é uma das habilidades mais importantes para a saúde financeira, mas manter a consistência é o maior obstáculo para a maioria das pessoas.',
                },
                {
                    type: 'tip',
                    label: 'Dica',
                    text: 'Comece pequeno. Qualquer valor salvo hoje é melhor do que zero amanhã.',
                },
                {
                    type: 'paragraph',
                    text: 'Os desafios transformam a poupança em um jogo: você define uma meta, acompanha o progresso e sente a satisfação de cada conquista. Estudos mostram que metas concretas e acompanhamento visual aumentam em até 3× a taxa de sucesso na poupança.',
                },
                {
                    type: 'section',
                    title: 'Como escolher seu desafio?',
                    text: 'Prefira desafios com incrementos graduais se você está começando agora. Já os mais experientes podem apostar em metas maiores como o Desafio Chinês ou o clássico 52 Semanas.',
                },
                {
                    type: 'tip',
                    label: 'Sabia que?',
                    text: 'Pessoas que vinculam a poupança a um propósito claro (viagem, emergência, aposentadoria) têm 40% mais chances de completar seus desafios.',
                },
            ],
        },
    },
    {
        id: '2',
        title: 'Novidades do App',
        subtitle: 'Novos desafios mensais chegando para você!',
        color: '#F87171',
        image: require('../../assets/images/banner-fin-2.png'),
        detail: {
            heading: 'O que há de novo?',
            body: [
                {
                    type: 'paragraph',
                    text: 'Estamos sempre evoluindo para tornar sua experiência financeira mais simples, inteligente e motivadora. Confira as últimas novidades do Finan!',
                },
                {
                    type: 'section',
                    title: 'Análise Anual de Gastos',
                    text: 'Agora você pode alternar entre visão mensal e anual nos gráficos de análise, além de filtrar por tipo (Despesas, Renda ou Ambos).',
                },
                {
                    type: 'section',
                    title: 'Múltiplas Moedas',
                    text: 'Configure sua moeda preferida (BRL, USD, EUR ou JPY) nas configurações. Todos os valores do app se adaptam automaticamente.',
                },
                {
                    type: 'tip',
                    label: 'Em breve',
                    text: 'Metas compartilhadas, relatórios em PDF exportáveis e integração com Open Finance estão nos planos!',
                },
            ],
        },
    },
    {
        id: '3',
        title: 'Desafio Chinês',
        subtitle: 'Conheça a melhor forma de guardar dinheiro!',
        color: '#0EA5E9',
        image: require('../../assets/images/banner-fin-3.png'),
        detail: {
            heading: 'Como funciona o Desafio Chinês?',
            body: [
                {
                    type: 'paragraph',
                    text: 'O Desafio Chinês é uma metodologia de poupança baseada em envelopes com valores aleatórios. A ideia é simples: você define uma meta total e o app divide esse valor em envelopes surpresa.',
                },
                {
                    type: 'section',
                    title: 'Por que valores aleatórios?',
                    text: 'A aleatoriedade remove a pressão de guardar valores fixos e mantém o desafio interessante. Você nunca sabe qual envelope vai encontrar, o que cria um elemento de surpresa e engajamento.',
                },
                {
                    type: 'tip',
                    label: 'Dica pro',
                    text: 'Use para metas de curto prazo como viagens ou compras planejadas. A flexibilidade dos valores ajuda a encaixar no orçamento de cada mês.',
                },
                {
                    type: 'section',
                    title: 'Passo a passo',
                    text: '1. Defina o valor total que quer juntar.\n2. O app gera automaticamente os envelopes.\n3. Toda vez que puder, "abra" um envelope e deposite o valor.\n4. Acompanhe o progresso até chegar na meta!',
                },
            ],
        },
    },
];

const BANNER_INTERVAL = width - 40 + 15;
const LOOPED_BANNERS = Array.from({ length: 50 }, (_, li) =>
    BANNERS.map((b, bi) => ({ ...b, _uid: `${li}_${bi}` }))
).flat();
const BANNER_MID = 25 * BANNERS.length;

const CHALLENGE_TEMPLATES = [
    {
        id: 'reserva-emergencia',
        title: 'Reserva de Emergência',
        subtitle: 'Crie sua reserva de emergencia',
        icon: 'alert-circle',
        iconType: 'Ionicons',
        color: '#F87171',
        defaultGoal: 1000,
        explanation: 'Preparado para aqueles momento que as contas apertarem.'
    },
    { 
        id: 'guardando-dinheiro', 
        title: 'Guardando Dinheiro', 
        subtitle: 'Desafios focados em economia.', 
        icon: 'piggy-bank', 
        iconType: 'MaterialCommunityIcons',
        color: '#3b82f6',
        defaultGoal: 1000,
        explanation: 'Focado em economia mensal recorrente para te ajudar a criar consistência.'
    },
    { 
        id: 'desafio-chines', 
        title: 'Desafio Chinês', 
        subtitle: 'Junte dinheiro de forma mais livre.', 
        icon: 'grid-outline', 
        iconType: 'Ionicons',
        color: '#0ea5e9',
        defaultGoal: 2000,
        explanation: 'O Desafio Chinês permite economizar valores crescentes conforme sua capacidade.'
    },
    { 
        id: '52-semanas', 
        title: '52 Semanas', 
        subtitle: 'O clássico para poupar o ano todo.', 
        icon: 'calendar-outline', 
        iconType: 'Ionicons',
        color: '#8b5cf6',
        defaultGoal: 1378,
        explanation: 'Comece com pouco e aumente 1 real a cada semana durante um ano.'
    },
    { 
        id: 'meta-livre', 
        title: 'Meta Livre', 
        subtitle: 'Crie um objetivo personalizado agora.', 
        icon: 'rocket-outline', 
        iconType: 'Ionicons',
        color: '#f59e0b',
        defaultGoal: 0,
        explanation: 'Personalize sua própria meta com o valor e tempo que você desejar.'
    },
];

const AddChallengesScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const user = auth.currentUser;
    const { formatCurrency, currencySymbol, currencyCode } = useCurrency();

    const [startedChallenges, setStartedChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
    const [isTypeSelectionModalVisible, setIsTypeSelectionModalVisible] = useState(false);
    const [selectedChallengeDetail, setSelectedChallengeDetail] = useState(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);

    const bannerRef = useRef(null);
    const bannerIndexRef = useRef(BANNER_MID);
    const intervalRef = useRef(null);
    const pauseTimerRef = useRef(null);

    const startAutoScroll = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            const next = bannerIndexRef.current + 1;
            bannerIndexRef.current = next;
            setActiveBannerIndex(next % BANNERS.length);
            bannerRef.current?.scrollToOffset({ offset: next * BANNER_INTERVAL, animated: true });
        }, 3500);
    };

    const pauseAutoScroll = (resumeAfterMs = 5000) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => startAutoScroll(), resumeAfterMs);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            bannerRef.current?.scrollToOffset({ offset: BANNER_MID * BANNER_INTERVAL, animated: false });
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        startAutoScroll();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        };
    }, []);
    const [amountToAdd, setAmountToAdd] = useState('');
    const [operationType, setOperationType] = useState('add'); // 'add' or 'subtract'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reserva de Emergência
    const [isEmergencyModalVisible, setIsEmergencyModalVisible] = useState(false);
    const [emergencyName, setEmergencyName] = useState('Reserva de Emergência');
    const [emergencyProfile, setEmergencyProfile] = useState('assalariado'); // 'assalariado' | 'empreendedor'
    const [emergencyMonthlyExpense, setEmergencyMonthlyExpense] = useState('');
    const [suggestedExpense, setSuggestedExpense] = useState(null);
    const [suggestionMonths, setSuggestionMonths] = useState(0);
    const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

    // Desafio Chinês
    const [isChineseModalVisible, setIsChineseModalVisible] = useState(false);
    const [chineseGoalInput, setChineseGoalInput] = useState('');
    const [chineseSlotPreview, setChineseSlotPreview] = useState([]);

    // 52 Semanas
    const [is52WeeksModalVisible, setIs52WeeksModalVisible] = useState(false);
    const [weeksName, setWeeksName] = useState('52 Semanas');
    const [weeksStartValue, setWeeksStartValue] = useState('1');

    // Guardando Dinheiro
    const [isSavingsModalVisible, setIsSavingsModalVisible] = useState(false);
    const [savingsName, setSavingsName] = useState('Guardando Dinheiro');
    const [savingsGoalInput, setSavingsGoalInput] = useState('');

    // Edit Challenge
    const [isEditChallengeModalVisible, setIsEditChallengeModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editGoal, setEditGoal] = useState('');

    // Delete Confirm
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [challengeToDelete, setChallengeToDelete] = useState(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Bom dia';
        if (hour >= 12 && hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "user_challenges"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const challenges = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStartedChallenges(challenges);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const startChallenge = async (template, overrides = {}) => {
        setIsTemplateModalVisible(false);
        setIsEmergencyModalVisible(false);
        setIsChineseModalVisible(false);
        setIs52WeeksModalVisible(false);
        setIsSavingsModalVisible(false);
        if (!user) return;
        try {
            await addDoc(collection(db, "user_challenges"), {
                userId: user.uid,
                templateId: template.id,
                currencyCode,
                title: overrides.title !== undefined ? overrides.title : template.title,
                iconName: template.icon,
                iconType: template.iconType,
                color: template.color,
                goalAmount: overrides.goalAmount !== undefined ? overrides.goalAmount : template.defaultGoal,
                currentAmount: 0,
                status: 'active',
                ...(overrides.slots ? { slots: overrides.slots } : {}),
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error starting challenge:", error);
        }
    };

    const handleTemplatePress = (item) => {
        setIsTypeSelectionModalVisible(false);
        setSelectedTemplate(item);
        if (item.id === 'reserva-emergencia') {
            setEmergencyName('Reserva de Emergência');
            setEmergencyProfile('assalariado');
            setEmergencyMonthlyExpense('');
            setSuggestedExpense(null);
            setIsEmergencyModalVisible(true);
            fetchLastMonthExpenses();
        } else if (item.id === 'desafio-chines') {
            setChineseGoalInput('');
            setChineseSlotPreview([]);
            setIsChineseModalVisible(true);
        } else if (item.id === '52-semanas') {
            setWeeksName('52 Semanas');
            setWeeksStartValue('1');
            setIs52WeeksModalVisible(true);
        } else if (item.id === 'guardando-dinheiro') {
            setSavingsName('Guardando Dinheiro');
            setSavingsGoalInput('');
            setIsSavingsModalVisible(true);
        } else {
            setIsTemplateModalVisible(true);
        }
    };

    const handlePickSlot = async (slotIndex) => {
        if (!selectedChallengeDetail || isSubmitting) return;
        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail.id);
        const slots = liveData?.slots || [];
        if (!slots[slotIndex] || slots[slotIndex].picked) return;

        setIsSubmitting(true);
        try {
            const newSlots = slots.map((s, i) =>
                i === slotIndex ? { ...s, picked: true } : s
            );
            const addedValue = slots[slotIndex].value;
            const challengeTitle = liveData?.title || selectedChallengeDetail.title || 'Desafio';
            const challengeColor = liveData?.color || selectedChallengeDetail.color || '#3b82f6';
            await Promise.all([
                updateDoc(doc(db, 'user_challenges', selectedChallengeDetail.id), {
                    slots: newSlots,
                    currentAmount: increment(addedValue),
                }),
                addDoc(collection(db, 'transactions'), {
                    userId: user.uid,
                    type: 'expense',
                    amount: addedValue,
                    currencyCode,
                    description: challengeTitle,
                    category: 'Desafio',
                    categoryIcon: 'piggy-bank',
                    categoryColor: challengeColor,
                    isFixed: false,
                    details: '',
                    date: serverTimestamp(),
                    createdAt: serverTimestamp(),
                }),
            ]);
        } catch (e) {
            console.error('Erro ao marcar slot:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchLastMonthExpenses = async () => {
        if (!user) return;
        setIsFetchingSuggestion(true);
        try {
            const now = new Date();
            // Janelas dos últimos 3 meses
            const MONTHS = 3;
            const windows = Array.from({ length: MONTHS }, (_, i) => {
                const start = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
                const end = new Date(now.getFullYear(), now.getMonth() - i, 0, 23, 59, 59);
                return { start, end };
            });

            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid),
                where('type', '==', 'expense')
            );
            const snapshot = await getDocs(q);

            // Soma por mês
            const totals = windows.map(({ start, end }) => {
                let t = 0;
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (!data.date) return;
                    const d = new Date(data.date.seconds * 1000);
                    if (d >= start && d <= end) t += data.amount || 0;
                });
                return t;
            });

            // Considera apenas mêses que têm pelo menos algum gasto
            const activeTotals = totals.filter(t => t > 0);
            if (activeTotals.length === 0) {
                setSuggestedExpense(null);
                setSuggestionMonths(0);
            } else {
                const avg = activeTotals.reduce((a, b) => a + b, 0) / activeTotals.length;
                setSuggestedExpense(avg);
                setSuggestionMonths(activeTotals.length);
            }
        } catch (e) {
            console.error('Erro ao buscar gastos:', e);
        } finally {
            setIsFetchingSuggestion(false);
        }
    };

    const emergencyGoal = (() => {
        const monthly = parseFloat(emergencyMonthlyExpense.replace(',', '.')) || 0;
        const multiplier = emergencyProfile === 'empreendedor' ? 12 : 6;
        return monthly * multiplier;
    })();

    // Gera 52 semanas: semana N vale startValue + (N-1)
    const generate52WeeksSlots = (startVal) => {
        const start = Math.max(1, Math.round(parseFloat(String(startVal).replace(',', '.')) || 1));
        return Array.from({ length: 52 }, (_, i) => ({
            week: i + 1,
            value: start + i,
            picked: false,
        }));
    };

    const weeks52Goal = (() => {
        const start = parseFloat(String(weeksStartValue).replace(',', '.')) || 1;
        const s = Math.max(1, Math.round(start));
        // soma = 52*s + (0+1+...+51) = 52*s + 1326
        return 52 * s + 1326;
    })();

    // Gera slots aleatórios que somam exatamente ao objetivo
    const generateChineseSlots = (goal) => {
        const TARGET_SLOTS = 40;
        const avg = goal / TARGET_SLOTS;
        // Unidade base arredondada para múltiplo de 5
        const baseUnit = Math.max(5, Math.round(avg / 5) * 5);

        const slots = [];
        let remaining = Math.round(goal * 100) / 100;

        while (remaining > 0) {
            if (remaining <= baseUnit) {
                slots.push(Math.round(remaining * 100) / 100);
                break;
            }
            const min = baseUnit * 0.5;
            const max = Math.min(baseUnit * 1.5, remaining);
            const raw = min + Math.random() * (max - min);
            const rounded = Math.max(5, Math.round(raw / 5) * 5);
            const val = Math.min(rounded, remaining);
            slots.push(Math.round(val * 100) / 100);
            remaining = Math.round((remaining - val) * 100) / 100;
        }

        // Embaralhar
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }

        return slots.map(value => ({ value, picked: false }));
    };

    const handleUpdateChallengeValue = async () => {
        if (!selectedChallengeDetail || !amountToAdd || isSubmitting) return;
        
        const value = parseFloat(amountToAdd.replace(',', '.'));
        if (isNaN(value) || value <= 0) return;

        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail.id);
        const challengeTitle = liveData?.title || selectedChallengeDetail.title || 'Desafio';
        const challengeColor = liveData?.color || selectedChallengeDetail.color || '#3b82f6';
        const isDeposit = operationType === 'add';
        const finalValue = isDeposit ? value : -value;

        setIsSubmitting(true);
        try {
            const challengeRef = doc(db, 'user_challenges', selectedChallengeDetail.id);
            await Promise.all([
                updateDoc(challengeRef, {
                    currentAmount: increment(finalValue)
                }),
                addDoc(collection(db, 'transactions'), {
                    userId: user.uid,
                    type: isDeposit ? 'expense' : 'income',
                    amount: value,
                    currencyCode,
                    description: challengeTitle,
                    category: 'Desafio',
                    categoryIcon: 'piggy-bank',
                    categoryColor: challengeColor,
                    isFixed: false,
                    details: '',
                    date: serverTimestamp(),
                    createdAt: serverTimestamp(),
                }),
            ]);

            setAmountToAdd('');
            setIsDetailModalVisible(false);
            setSelectedChallengeDetail(null);
        } catch (error) {
            console.error('Error updating challenge value:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteChallenge = (challenge) => {
        setChallengeToDelete(challenge);
        setIsDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (!challengeToDelete) return;
        try {
            await deleteDoc(doc(db, 'user_challenges', challengeToDelete.id));
            setIsDeleteConfirmVisible(false);
            setChallengeToDelete(null);
            setIsDetailModalVisible(false);
            setSelectedChallengeDetail(null);
        } catch (e) {
            console.error('Erro ao excluir desafio:', e);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedChallengeDetail || isSubmitting) return;
        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail.id);
        const isChinese = liveData?.templateId === 'desafio-chines';
        const is52Weeks = liveData?.templateId === '52-semanas';
        const isSlotBased = isChinese || is52Weeks;

        const updates = {};
        if (editName.trim()) updates.title = editName.trim();
        if (!isSlotBased) {
            const goal = parseFloat(editGoal.replace(',', '.'));
            if (!isNaN(goal) && goal > 0) updates.goalAmount = goal;
        }
        if (Object.keys(updates).length === 0) {
            setIsEditChallengeModalVisible(false);
            return;
        }
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'user_challenges', selectedChallengeDetail.id), updates);
            setIsEditChallengeModalVisible(false);
        } catch (e) {
            console.error('Erro ao editar desafio:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderBanner = ({ item }) => (
        <TouchableOpacity
            style={[styles.bannerCard, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate('BannerDetail', { banner: item })}
            activeOpacity={0.88}
        >
            <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>{item.title}</Text>
                <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
            </View>
            {item.image ? (
                <Image
                    source={item.image}
                    style={styles.bannerImage}
                    resizeMode="contain"
                />
            ) : (
                <View style={styles.bannerIconContainer}>
                    <MaterialCommunityIcons name={item.icon} size={44} color="#FFF" />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderCategory = ({ item }) => (
        <TouchableOpacity 
            style={styles.categoryCard} 
            activeOpacity={0.7}
            onPress={() => handleTemplatePress(item)}
        >
            <View style={[styles.categoryIconBox, { backgroundColor: item.color + '15' }]}>
                {item.iconType === 'Ionicons' ? (
                    <Ionicons name={item.icon} size={28} color={item.color} />
                ) : (
                    <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                )}
            </View>
            <Text style={styles.categoryTitle}>{item.title}</Text>
            <Text style={styles.categorySubtitle} numberOfLines={2}>{item.subtitle}</Text>
        </TouchableOpacity>
    );

    const renderStartedChallenge = (item) => {
        const progress = Math.min(((item.currentAmount || 0) / (item.goalAmount || 1)) * 100, 100);
        return (
            <TouchableOpacity 
                key={item.id} 
                style={styles.startedChallengeCard}
                activeOpacity={0.7}
                onPress={() => {
                    setSelectedChallengeDetail(item);
                    setIsDetailModalVisible(true);
                }}
            >
                <View style={styles.startedChallengeHeader}>
                    <View style={styles.startedChallengeLeft}>
                        <View style={[styles.startedChallengeIconBox, { backgroundColor: '#F3F4F6' }]}>
                            {item.iconType === 'Ionicons' ? (
                                <Ionicons name={item.iconName} size={24} color={item.color || '#3b82f6'} />
                            ) : (
                                <MaterialCommunityIcons name={item.iconName} size={24} color={item.color || '#3b82f6'} />
                            )}
                        </View>
                        <View>
                            <Text style={styles.startedChallengeTitle}>{item.title}</Text>
                            <Text style={styles.startedChallengePercent}>{Math.round(progress)}% completo</Text>
                        </View>
                    </View>
                    <View style={styles.startedChallengeRight}>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        <Text style={[styles.startedChallengeAmount, { color: item.color || '#22C55E' }]}>
                            {formatCurrency(item.currentAmount || 0)}
                        </Text>
                    </View>
                </View>
                <View style={styles.startedChallengeBarBg}>
                    <View style={[styles.startedChallengeBarFill, { width: `${progress}%`, backgroundColor: item.color || '#3b82f6' }]} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back-outline" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.title}>Desafios</Text>
                <TouchableOpacity 
                    style={styles.headerActionButton}
                    onPress={() => setIsTypeSelectionModalVisible(true)}
                >
                    <Ionicons name="add" size={28} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Horizontal Banner Carousel */}
                <View style={styles.bannerContainer}>
                    <FlatList
                        ref={bannerRef}
                        data={LOOPED_BANNERS}
                        renderItem={renderBanner}
                        keyExtractor={item => item._uid}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={BANNER_INTERVAL}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        contentContainerStyle={styles.bannerList}
                        getItemLayout={(_, index) => ({
                            length: BANNER_INTERVAL,
                            offset: BANNER_INTERVAL * index,
                            index,
                        })}
                        onTouchStart={() => pauseAutoScroll(5000)}
                        onMomentumScrollEnd={(e) => {
                            const rawIndex = Math.round(e.nativeEvent.contentOffset.x / BANNER_INTERVAL);
                            bannerIndexRef.current = rawIndex;
                            setActiveBannerIndex(rawIndex % BANNERS.length);
                            pauseAutoScroll(4000);
                        }}
                    />
                    <View style={styles.pagination}>
                        {BANNERS.map((_, i) => (
                            <View 
                                key={i} 
                                style={[
                                    styles.paginationDot, 
                                    { backgroundColor: i === activeBannerIndex ? '#475569' : '#CBD5E1' }
                                ]} 
                            />
                        ))}
                    </View>
                </View>

                {/* Categories Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Categorias</Text>
                    <TouchableOpacity>
                        <Text style={styles.sectionDetails}>Detalhes</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={CHALLENGE_TEMPLATES}
                    renderItem={renderCategory}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                />

                {/* Started Challenges Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Desafios Iniciados</Text>
                    <TouchableOpacity>
                        <Text style={styles.sectionDetails}>Detalhes</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.startedChallengesContainer}>
                    {loading ? (
                        <ActivityIndicator color={theme.colors.primary} />
                    ) : startedChallenges.length > 0 ? (
                        startedChallenges.map(item => renderStartedChallenge(item))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Você ainda não iniciou nenhum desafio.</Text>
                        </View>
                    )}
                </View>

                {/* Create Challenge Button */}
                <TouchableOpacity 
                    style={styles.createMainButton}
                    onPress={() => setIsTypeSelectionModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={24} color="#FFF" />
                    <Text style={styles.createMainButtonText}>Criar Novo Desafio</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Type Selection Modal */}
            <Modal
                visible={isTypeSelectionModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsTypeSelectionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalDismissOverlay} 
                        activeOpacity={1} 
                        onPress={() => setIsTypeSelectionModalVisible(false)} 
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Escolha o Desafio</Text>
                            <TouchableOpacity onPress={() => setIsTypeSelectionModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.selectionList}>
                            {CHALLENGE_TEMPLATES.map((item) => (
                                <TouchableOpacity 
                                    key={item.id}
                                    style={styles.selectionItem}
                                    onPress={() => handleTemplatePress(item)}
                                >
                                    <View style={[styles.selectionIconBox, { backgroundColor: item.color + '15' }]}>
                                        {item.iconType === 'Ionicons' ? (
                                            <Ionicons name={item.icon} size={24} color={item.color} />
                                        ) : (
                                            <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                                        )}
                                    </View>
                                    <View style={styles.selectionTextContainer}>
                                        <Text style={styles.selectionTitle}>{item.title}</Text>
                                        <Text style={styles.selectionSubtitle}>{item.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Guardando Dinheiro Modal */}
            <Modal
                visible={isSavingsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsSavingsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Guardando Dinheiro</Text>
                            <TouchableOpacity onPress={() => setIsSavingsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.emergencyLabel}>Nome da caixinha</Text>
                        <View style={styles.emergencyNameInput}>
                            <TextInput
                                style={styles.emergencyNameField}
                                value={savingsName}
                                onChangeText={setSavingsName}
                                placeholder="Ex: Viagem, Notebook..."
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        <Text style={[styles.emergencyLabel, { marginTop: 18 }]}>Meta de valor</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0,00"
                                keyboardType="numeric"
                                value={savingsGoalInput}
                                onChangeText={setSavingsGoalInput}
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalStartButton,
                                { backgroundColor: '#3b82f6', marginTop: 24, opacity: !savingsGoalInput || parseFloat(savingsGoalInput.replace(',', '.')) <= 0 ? 0.4 : 1 }
                            ]}
                            disabled={!savingsGoalInput || parseFloat(savingsGoalInput.replace(',', '.')) <= 0}
                            onPress={() => {
                                const template = CHALLENGE_TEMPLATES.find(t => t.id === 'guardando-dinheiro');
                                const goal = parseFloat(savingsGoalInput.replace(',', '.'));
                                startChallenge(template, {
                                    title: savingsName.trim() || 'Guardando Dinheiro',
                                    goalAmount: goal,
                                });
                            }}
                        >
                            <Text style={styles.modalStartButtonText}>Criar Caixinha</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 52 Semanas Modal */}
            <Modal
                visible={is52WeeksModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIs52WeeksModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>52 Semanas</Text>
                            <TouchableOpacity onPress={() => setIs52WeeksModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.emergencyLabel}>Nome do desafio</Text>
                        <View style={styles.emergencyNameInput}>
                            <TextInput
                                style={styles.emergencyNameField}
                                value={weeksName}
                                onChangeText={setWeeksName}
                                placeholder="Ex: 52 Semanas"
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        <Text style={[styles.emergencyLabel, { marginTop: 18 }]}>Valor inicial (semana 1)</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="1,00"
                                keyboardType="numeric"
                                value={weeksStartValue}
                                onChangeText={setWeeksStartValue}
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>
                        <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, marginBottom: 14 }}>
                            Cada semana aumenta {formatCurrency(1)}. Semana 52 = {formatCurrency((Math.max(1, Math.round(parseFloat(String(weeksStartValue).replace(',', '.')) || 1)) + 51))}
                        </Text>

                        <View style={[styles.modalGoalBox, { backgroundColor: '#F5F3FF', borderRadius: 16 }]}>
                            <View>
                                <Text style={styles.modalGoalLabel}>Total ao final</Text>
                                <Text style={{ fontSize: 11, color: '#94A3B8' }}>52 semanas somadas</Text>
                            </View>
                            <Text style={[styles.modalGoalValue, { color: '#8b5cf6', fontSize: 20 }]}>
                                {formatCurrency(weeks52Goal)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalStartButton, { backgroundColor: '#8b5cf6', marginTop: 20 }]}
                            onPress={() => {
                                const template = CHALLENGE_TEMPLATES.find(t => t.id === '52-semanas');
                                const slots = generate52WeeksSlots(weeksStartValue);
                                startChallenge(template, {
                                    title: weeksName.trim() || '52 Semanas',
                                    goalAmount: weeks52Goal,
                                    slots,
                                });
                            }}
                        >
                            <Text style={styles.modalStartButtonText}>Começar Desafio</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Desafio Chinês Modal */}
            <Modal
                visible={isChineseModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsChineseModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Desafio Chinês</Text>
                            <TouchableOpacity onPress={() => setIsChineseModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.emergencyLabel}>Quanto você quer juntar?</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0,00"
                                keyboardType="numeric"
                                value={chineseGoalInput}
                                onChangeText={(v) => {
                                    setChineseGoalInput(v);
                                    const parsed = parseFloat(v.replace(',', '.'));
                                    if (!isNaN(parsed) && parsed > 0) {
                                        setChineseSlotPreview(generateChineseSlots(parsed));
                                    } else {
                                        setChineseSlotPreview([]);
                                    }
                                }}
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        {chineseSlotPreview.length > 0 && (
                            <>
                                <View style={styles.chinesePreviewInfo}>
                                    <MaterialCommunityIcons name="cards-outline" size={18} color="#0ea5e9" />
                                    <Text style={styles.chinesePreviewText}>
                                        {chineseSlotPreview.length} envelopes gerados — valores entre{' '}
                                        <Text style={{ fontWeight: '700', color: '#0ea5e9' }}>
                                            {formatCurrency(Math.min(...chineseSlotPreview.map(s => s.value)))}
                                        </Text>{' '}e{' '}
                                        <Text style={{ fontWeight: '700', color: '#0ea5e9' }}>
                                            {formatCurrency(Math.max(...chineseSlotPreview.map(s => s.value)))}
                                        </Text>
                                    </Text>
                                </View>

                                {/* Preview de alguns envelopes */}
                                <View style={styles.chineseSlotPreviewRow}>
                                    {chineseSlotPreview.slice(0, 6).map((s, i) => (
                                        <View key={i} style={styles.chineseSlotPreviewTile}>
                                            <Text style={styles.chineseSlotPreviewValue}>
                                                {formatCurrency(s.value)}
                                            </Text>
                                        </View>
                                    ))}
                                    {chineseSlotPreview.length > 6 && (
                                        <View style={[styles.chineseSlotPreviewTile, { backgroundColor: '#E0F2FE' }]}>
                                            <Text style={[styles.chineseSlotPreviewValue, { color: '#0ea5e9' }]}>
                                                +{chineseSlotPreview.length - 6}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.chineseRegenerateBtn}
                                    onPress={() => {
                                        const parsed = parseFloat(chineseGoalInput.replace(',', '.'));
                                        if (!isNaN(parsed) && parsed > 0)
                                            setChineseSlotPreview(generateChineseSlots(parsed));
                                    }}
                                >
                                    <MaterialCommunityIcons name="refresh" size={16} color="#0ea5e9" />
                                    <Text style={styles.chineseRegenerateText}>Gerar novos valores</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.modalStartButton,
                                { backgroundColor: '#0ea5e9', marginTop: 20, opacity: chineseSlotPreview.length === 0 ? 0.4 : 1 }
                            ]}
                            disabled={chineseSlotPreview.length === 0}
                            onPress={() => {
                                const template = CHALLENGE_TEMPLATES.find(t => t.id === 'desafio-chines');
                                const goal = parseFloat(chineseGoalInput.replace(',', '.'));
                                startChallenge(template, { goalAmount: goal, slots: chineseSlotPreview });
                            }}
                        >
                            <Text style={styles.modalStartButtonText}>Começar Desafio</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reserva de Emergência Modal */}
            <Modal
                visible={isEmergencyModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsEmergencyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reserva de Emergência</Text>
                            <TouchableOpacity onPress={() => setIsEmergencyModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {/* Nome da caixinha */}
                        <Text style={styles.emergencyLabel}>Nome da caixinha</Text>
                        <View style={styles.emergencyNameInput}>
                            <TextInput
                                style={styles.emergencyNameField}
                                value={emergencyName}
                                onChangeText={setEmergencyName}
                                placeholder="Ex: Reserva de Emergência"
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        {/* Perfil */}
                        <Text style={[styles.emergencyLabel, { marginTop: 18 }]}>Qual é o seu perfil?</Text>
                        <View style={styles.emergencyProfileToggle}>
                            <TouchableOpacity
                                style={[styles.emergencyProfileBtn, emergencyProfile === 'assalariado' && styles.emergencyProfileBtnActive]}
                                onPress={() => setEmergencyProfile('assalariado')}
                            >
                                <MaterialCommunityIcons
                                    name="briefcase-outline"
                                    size={18}
                                    color={emergencyProfile === 'assalariado' ? '#FFF' : '#64748B'}
                                />
                                <Text style={[styles.emergencyProfileText, emergencyProfile === 'assalariado' && styles.emergencyProfileTextActive]}>
                                    Assalariado
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.emergencyProfileBtn, emergencyProfile === 'empreendedor' && styles.emergencyProfileBtnActive]}
                                onPress={() => setEmergencyProfile('empreendedor')}
                            >
                                <MaterialCommunityIcons
                                    name="rocket-launch-outline"
                                    size={18}
                                    color={emergencyProfile === 'empreendedor' ? '#FFF' : '#64748B'}
                                />
                                <Text style={[styles.emergencyProfileText, emergencyProfile === 'empreendedor' && styles.emergencyProfileTextActive]}>
                                    Empreendedor
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Gastos mensais */}
                        <Text style={[styles.emergencyLabel, { marginTop: 18 }]}>Gastos mensais</Text>
                        {isFetchingSuggestion ? (
                            <View style={styles.suggestionRow}>
                                <ActivityIndicator size="small" color="#F87171" />
                                <Text style={styles.suggestionLoadingText}>Analisando seus últimos meses...</Text>
                            </View>
                        ) : suggestedExpense !== null ? (
                            <TouchableOpacity
                                style={styles.suggestionBanner}
                                onPress={() => setEmergencyMonthlyExpense(suggestedExpense.toFixed(2).replace('.', ','))}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#F87171" />
                                <Text style={styles.suggestionText}>
                                    Média dos últimos {suggestionMonths} {suggestionMonths === 1 ? 'mês' : 'meses'}:{' '}
                                    <Text style={styles.suggestionValue}>{formatCurrency(suggestedExpense)}</Text>
                                </Text>
                                <Text style={styles.suggestionUse}>Usar</Text>
                            </TouchableOpacity>
                        ) : null}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0,00"
                                keyboardType="numeric"
                                value={emergencyMonthlyExpense}
                                onChangeText={setEmergencyMonthlyExpense}
                                placeholderTextColor="#CBD5E1"
                            />
                        </View>

                        {/* Meta calculada */}
                        <View style={[styles.modalGoalBox, { marginTop: 18, backgroundColor: '#FFF1F1', borderRadius: 16 }]}>
                            <View>
                                <Text style={styles.modalGoalLabel}>Meta calculada</Text>
                                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                                    {emergencyProfile === 'empreendedor' ? '12 meses de gastos' : '6 meses de gastos'}
                                </Text>
                            </View>
                            <Text style={[styles.modalGoalValue, { color: '#F87171', fontSize: 20 }]}>
                                {formatCurrency(emergencyGoal)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalStartButton, { backgroundColor: '#F87171', marginTop: 20 }]}
                            onPress={() => {
                                const template = CHALLENGE_TEMPLATES.find(t => t.id === 'reserva-emergencia');
                                startChallenge(template, {
                                    title: emergencyName.trim() || 'Reserva de Emergência',
                                    goalAmount: emergencyGoal,
                                });
                            }}
                            disabled={emergencyGoal <= 0}
                        >
                            <Text style={styles.modalStartButtonText}>Criar Reserva</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Template Explanation Modal */}
            <Modal
                visible={isTemplateModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsTemplateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedTemplate?.title}</Text>
                            <TouchableOpacity onPress={() => setIsTemplateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>{selectedTemplate?.explanation}</Text>
                        <View style={styles.modalGoalBox}>
                            <Text style={styles.modalGoalLabel}>Meta Sugerida:</Text>
                            <Text style={styles.modalGoalValue}>{selectedTemplate?.defaultGoal ? formatCurrency(selectedTemplate.defaultGoal) : 'Personalizada'}</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.modalStartButton, { backgroundColor: selectedTemplate?.color || theme.colors.primary }]}
                            onPress={() => startChallenge(selectedTemplate)}
                        >
                            <Text style={styles.modalStartButtonText}>Iniciar Desafio Agora</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Started Challenge Detail Modal */}
            <Modal
                visible={isDetailModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalhes do Desafio</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity
                                    style={styles.detailActionBtn}
                                    onPress={() => {
                                        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail?.id) || selectedChallengeDetail;
                                        const isSlotBased = liveData?.templateId === 'desafio-chines' || liveData?.templateId === '52-semanas';
                                        setEditName(liveData?.title || '');
                                        setEditGoal(isSlotBased ? '' : String(liveData?.goalAmount || ''));
                                        setIsEditChallengeModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="create-outline" size={20} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.detailActionBtn, { backgroundColor: '#FEF2F2' }]}
                                    onPress={() => {
                                        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail?.id) || selectedChallengeDetail;
                                        handleDeleteChallenge(liveData);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {selectedChallengeDetail && (() => {
                            const liveDetail = startedChallenges.find(c => c.id === selectedChallengeDetail.id) || selectedChallengeDetail;
                            const isChinese = liveDetail.templateId === 'desafio-chines';
                            const is52Weeks = liveDetail.templateId === '52-semanas';
                            const slots = liveDetail.slots || [];
                            const pickedCount = slots.filter(s => s.picked).length;
                            const remaining = slots.filter(s => !s.picked).length;

                            if (isChinese) {
                                return (
                                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                                        {/* Cabeçalho */}
                                        <View style={styles.detailCard}>
                                            <View style={[styles.detailIconBox, { backgroundColor: '#E0F2FE' }]}>
                                                <MaterialCommunityIcons name="cards-outline" size={40} color="#0ea5e9" />
                                            </View>
                                            <Text style={styles.detailTitle}>{liveDetail.title}</Text>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Meta:</Text>
                                                <Text style={styles.detailValue}>{formatCurrency(liveDetail.goalAmount)}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Acumulado:</Text>
                                                <Text style={[styles.detailValue, { color: '#0ea5e9' }]}>{formatCurrency(liveDetail.currentAmount || 0)}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Envelopes restantes:</Text>
                                                <Text style={styles.detailValue}>{remaining} / {slots.length}</Text>
                                            </View>
                                        </View>

                                        {/* Grade de envelopes */}
                                        <Text style={[styles.emergencyLabel, { marginHorizontal: 4, marginBottom: 12 }]}>
                                            Toque para marcar um envelope como pago
                                        </Text>
                                        <View style={styles.chineseSlotsGrid}>
                                            {slots.map((slot, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.chineseSlotTile,
                                                        slot.picked && styles.chineseSlotTilePicked,
                                                    ]}
                                                    onPress={() => handlePickSlot(index)}
                                                    disabled={slot.picked || isSubmitting}
                                                    activeOpacity={0.7}
                                                >
                                                    {slot.picked ? (
                                                        <Ionicons name="checkmark" size={18} color="#94A3B8" />
                                                    ) : (
                                                        <Text style={styles.chineseSlotValue}>
                                                            {formatCurrency(slot.value)}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                );
                            }

                            if (is52Weeks) {
                                return (
                                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                                        <View style={styles.detailCard}>
                                            <View style={[styles.detailIconBox, { backgroundColor: '#F5F3FF' }]}>
                                                <Ionicons name="calendar-outline" size={40} color="#8b5cf6" />
                                            </View>
                                            <Text style={styles.detailTitle}>{liveDetail.title}</Text>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Meta total:</Text>
                                                <Text style={styles.detailValue}>{formatCurrency(liveDetail.goalAmount)}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Acumulado:</Text>
                                                <Text style={[styles.detailValue, { color: '#8b5cf6' }]}>{formatCurrency(liveDetail.currentAmount || 0)}</Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Semanas concluídas:</Text>
                                                <Text style={styles.detailValue}>{pickedCount} / {slots.length}</Text>
                                            </View>
                                        </View>

                                        <Text style={[styles.emergencyLabel, { marginHorizontal: 4, marginBottom: 12 }]}>
                                            Toque para marcar a semana como paga
                                        </Text>
                                        <View style={styles.weeksGrid}>
                                            {slots.map((slot, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.weekTile,
                                                        slot.picked && styles.weekTilePicked,
                                                    ]}
                                                    onPress={() => handlePickSlot(index)}
                                                    disabled={slot.picked || isSubmitting}
                                                    activeOpacity={0.7}
                                                >
                                                    {slot.picked ? (
                                                        <Ionicons name="checkmark" size={14} color="#C4B5FD" />
                                                    ) : (
                                                        <>
                                                            <Text style={styles.weekTileNumber}>S{slot.week}</Text>
                                                            <Text style={styles.weekTileValue}>{formatCurrency(slot.value)}</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                );
                            }

                            // UI genérica para outros desafios
                            return (
                                <View>
                                    <View style={styles.detailCard}>
                                        <View style={[styles.detailIconBox, { backgroundColor: liveDetail.color + '15' }]}>
                                            <MaterialCommunityIcons name={liveDetail.iconName} size={40} color={liveDetail.color} />
                                        </View>
                                        <Text style={styles.detailTitle}>{liveDetail.title}</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Meta:</Text>
                                            <Text style={styles.detailValue}>{formatCurrency(liveDetail.goalAmount)}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Acumulado:</Text>
                                            <Text style={styles.detailValue}>{formatCurrency(liveDetail.currentAmount)}</Text>
                                        </View>

                                        <View style={styles.addValueContainer}>
                                            <View style={styles.operationToggle}>
                                                <TouchableOpacity
                                                    style={[styles.opButton, operationType === 'add' && styles.opButtonActive]}
                                                    onPress={() => setOperationType('add')}
                                                >
                                                    <Ionicons name="add-circle" size={20} color={operationType === 'add' ? '#FFF' : '#94A3B8'} />
                                                    <Text style={[styles.opButtonText, operationType === 'add' && styles.opButtonTextActive]}>Adicionar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.opButton, operationType === 'subtract' && styles.opButtonActiveSubtract]}
                                                    onPress={() => setOperationType('subtract')}
                                                >
                                                    <Ionicons name="remove-circle" size={20} color={operationType === 'subtract' ? '#FFF' : '#94A3B8'} />
                                                    <Text style={[styles.opButtonText, operationType === 'subtract' && styles.opButtonTextActive]}>Retirar</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.inputWrapper}>
                                                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                                                <TextInput
                                                    style={styles.amountInput}
                                                    placeholder="0,00"
                                                    keyboardType="numeric"
                                                    value={amountToAdd}
                                                    onChangeText={setAmountToAdd}
                                                    disabled={isSubmitting}
                                                />
                                            </View>
                                            <TouchableOpacity
                                                style={[
                                                    styles.confirmAddButton,
                                                    { backgroundColor: operationType === 'add' ? (liveDetail.color || '#3b82f6') : '#EF4444' }
                                                ]}
                                                onPress={handleUpdateChallengeValue}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <ActivityIndicator color="#FFF" />
                                                ) : (
                                                    <Text style={styles.confirmAddButtonText}>
                                                        {operationType === 'add' ? 'Confirmar Aporte' : 'Confirmar Retirada'}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })()}
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setIsDetailModalVisible(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Fechar</Text>
                        </TouchableOpacity>

                        {/* Delete inline confirmation overlay */}
                        {isDeleteConfirmVisible && (
                            <View style={styles.deleteOverlay}>
                                <View style={styles.deleteCard}>
                                    <View style={styles.deleteIconCircle}>
                                        <Ionicons name="trash-outline" size={32} color="#EF4444" />
                                    </View>
                                    <Text style={styles.deleteTitle}>Excluir Desafio</Text>
                                    <Text style={styles.deleteMessage}>
                                        Tem certeza que deseja excluir{' '}
                                        <Text style={{ fontWeight: '700', color: '#0F172A' }}>"{challengeToDelete?.title}"</Text>?
                                        {' '}Todo o progresso será perdido e essa ação não pode ser desfeita.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.deleteConfirmBtn}
                                        onPress={confirmDelete}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#FFF" />
                                        <Text style={styles.deleteConfirmBtnText}>Sim, excluir</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteCancelBtn}
                                        onPress={() => setIsDeleteConfirmVisible(false)}
                                    >
                                        <Text style={styles.deleteCancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Edit inline overlay */}
                        {isEditChallengeModalVisible && (
                            <View style={styles.deleteOverlay}>
                                <View style={[styles.deleteCard, { alignItems: 'stretch' }]}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Editar Desafio</Text>
                                        <TouchableOpacity onPress={() => setIsEditChallengeModalVisible(false)}>
                                            <Ionicons name="close" size={24} color="#000" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.emergencyLabel}>Nome do desafio</Text>
                                    <View style={styles.emergencyNameInput}>
                                        <TextInput
                                            style={styles.emergencyNameField}
                                            value={editName}
                                            onChangeText={setEditName}
                                            placeholder="Nome do desafio"
                                            placeholderTextColor="#CBD5E1"
                                        />
                                    </View>

                                    {(() => {
                                        const liveData = startedChallenges.find(c => c.id === selectedChallengeDetail?.id);
                                        const isSlotBased = liveData?.templateId === 'desafio-chines' || liveData?.templateId === '52-semanas';
                                        if (isSlotBased) return null;
                                        return (
                                            <>
                                                <Text style={[styles.emergencyLabel, { marginTop: 18 }]}>Meta de valor</Text>
                                                <View style={styles.inputWrapper}>
                                                    <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                                                    <TextInput
                                                        style={styles.amountInput}
                                                        placeholder="0,00"
                                                        keyboardType="numeric"
                                                        value={editGoal}
                                                        onChangeText={setEditGoal}
                                                        placeholderTextColor="#CBD5E1"
                                                    />
                                                </View>
                                            </>
                                        );
                                    })()}

                                    <TouchableOpacity
                                        style={[styles.modalStartButton, { backgroundColor: '#3b82f6', marginTop: 24 }]}
                                        onPress={handleSaveEdit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <Text style={styles.modalStartButtonText}>Salvar Alterações</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        color: '#0F172A',
        flex: 1,
        textAlign: 'center',
        fontFamily: theme.fonts.title,
    },
    headerActionButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    greetingSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
    },
    nameText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
    },
    headerExtraIcon: {
        flexDirection: 'row',
        gap: 12,
    },
    sparklesButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planRow: {
        flexDirection: 'row',
        marginTop: 2,
    },
    planLabel: {
        fontSize: 16,
        color: '#94A3B8',
    },
    planText: {
        fontSize: 16,
        color: '#0EA5E9',
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    bannerContainer: {
        marginVertical: 4,
    },
    bannerList: {
        paddingHorizontal: 20,
        paddingBottom: 5,
    },
    bannerCard: {
        width: width - 40,
        height: 110,
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: 15,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
        marginBottom: 6,
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#000',
        opacity: 0.8,
        fontWeight: '600',
        lineHeight: 17,
    },
    bannerIconContainer: {
        marginLeft: 10,
    },
    bannerImage: {
        width: 90,
        height: 90,
        marginLeft: 10,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 25,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: theme.fonts.title,
        color: '#0F172A',
    },
    sectionDetails: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    categoriesList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 15,
    },
    categoryCard: {
        width: 160,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
    categoryIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    categoryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        lineHeight: 14,
    },
    startedChallengesContainer: {
        paddingHorizontal: 20,
        gap: 12,
    },
    startedChallengeCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    startedChallengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    startedChallengeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    startedChallengeIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startedChallengeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    startedChallengePercent: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    startedChallengeRight: {
        alignItems: 'flex-end',
    },
    startedChallengeAmount: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
    },
    startedChallengeBarBg: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    startedChallengeBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    createMainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        marginHorizontal: 20,
        marginTop: 30,
        padding: 16,
        borderRadius: 20,
        gap: 8,
    },
    createMainButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDismissOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
    },
    selectionList: {
        marginTop: 10,
    },
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    selectionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    selectionTextContainer: {
        flex: 1,
    },
    selectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    selectionSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalDesc: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24,
        marginBottom: 25,
    },
    modalGoalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 25,
    },
    modalGoalLabel: {
        fontSize: 16,
        color: '#64748B',
    },
    modalGoalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalStartButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalStartButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    detailCard: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    detailIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    detailTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    detailLabel: {
        fontSize: 16,
        color: '#64748B',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    addValueContainer: {
        width: '100%',
        marginTop: 25,
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 24,
    },
    operationToggle: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    opButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    opButtonActive: {
        backgroundColor: '#3b82f6',
    },
    opButtonActiveSubtract: {
        backgroundColor: '#EF4444',
    },
    opButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    opButtonTextActive: {
        color: '#FFF',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 15,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        marginRight: 5,
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    confirmAddButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmAddButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalCloseButton: {
        marginTop: 20,
        padding: 16,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
    detailActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 28,
        padding: 24,
        zIndex: 100,
    },
    deleteCard: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        padding: 28,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    deleteIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 10,
        textAlign: 'center',
    },
    deleteMessage: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    deleteConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#EF4444',
        borderRadius: 16,
        height: 52,
        width: '100%',
        marginBottom: 10,
    },
    deleteConfirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteCancelBtn: {
        height: 44,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteCancelBtnText: {
        color: '#64748B',
        fontSize: 15,
        fontWeight: '600',
    },
    emergencyLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emergencyNameInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        height: 52,
    },
    emergencyNameField: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    emergencyProfileToggle: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    emergencyProfileBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 5,
    },
    emergencyProfileBtnActive: {
        backgroundColor: '#F87171',
    },
    emergencyProfileText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    emergencyProfileTextActive: {
        color: '#FFF',
    },
    emergencyProfileMultiplier: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    suggestionLoadingText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    suggestionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    suggestionText: {
        flex: 1,
        fontSize: 13,
        color: '#64748B',
    },
    suggestionValue: {
        fontWeight: '700',
        color: '#F87171',
    },
    suggestionUse: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F87171',
    },
    // Desafio Chinês
    chinesePreviewInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E0F2FE',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 14,
        marginBottom: 10,
    },
    chinesePreviewText: {
        flex: 1,
        fontSize: 13,
        color: '#0369A1',
        lineHeight: 18,
    },
    chineseSlotPreviewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    chineseSlotPreviewTile: {
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    chineseSlotPreviewValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0369A1',
    },
    chineseRegenerateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 2,
        marginBottom: 4,
    },
    chineseRegenerateText: {
        fontSize: 13,
        color: '#0ea5e9',
        fontWeight: '600',
    },
    chineseSlotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingBottom: 20,
    },
    chineseSlotTile: {
        width: '30%',
        aspectRatio: 1.8,
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
    },
    chineseSlotTilePicked: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
    },
    chineseSlotValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0369A1',
    },
    weeksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
        paddingBottom: 20,
    },
    weekTile: {
        width: '22%',
        aspectRatio: 1.4,
        backgroundColor: '#F5F3FF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#DDD6FE',
    },
    weekTilePicked: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
    },
    weekTileNumber: {
        fontSize: 10,
        fontWeight: '600',
        color: '#7C3AED',
        marginBottom: 2,
    },
    weekTileValue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#5B21B6',
    },
});

export default AddChallengesScreen;
