import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { auth, db } from '../../services/firebaseConfig';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useCurrency } from '../../hooks/useCurrency';

const FILTERS = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'paid', label: 'Pagas' },
];

const PaymentsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const user = auth.currentUser;
    const { formatCurrency } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [items, setItems] = useState([]);
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'value'
    const [hidePaidAuto, setHidePaidAuto] = useState(false);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);

    useEffect(() => {
        const markVisited = async () => {
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                await AsyncStorage.setItem('@payments_checked_today', todayStr);
            } catch (e) {
                console.error("Erro ao salvar visita aos pagamentos:", e);
            }
        };
        markVisited();
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const remindedExpenses = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((item) => !(item?.isDeleted === true || item?.isDeleted === 'true' || item?.deletedAt != null))
                    .filter((item) => item.type === 'expense' && item.paymentReminder === true)
                    .sort((a, b) => {
                        if (!!a.paymentPaid !== !!b.paymentPaid) return a.paymentPaid ? 1 : -1;
                        return (b.date?.seconds || 0) - (a.date?.seconds || 0);
                    });

                setItems(remindedExpenses);
                setLoading(false);
            },
            () => setLoading(false)
        );

        return unsub;
    }, [user]);

    const visibleItems = useMemo(() => {
        if (filter === 'all') return items;
        if (filter === 'paid') return items.filter((item) => !!item.paymentPaid);
        return items.filter((item) => !item.paymentPaid);
    }, [items, filter]);

    const finalItems = useMemo(() => {
        let base = visibleItems;

        if (hidePaidAuto) {
            base = base.filter((item) => !item.paymentPaid);
        }

        const sorted = [...base].sort((a, b) => {
            if (sortBy === 'value') {
                return (b.amount || 0) - (a.amount || 0);
            }
            return (b.date?.seconds || 0) - (a.date?.seconds || 0);
        });

        return sorted;
    }, [visibleItems, hidePaidAuto, sortBy]);

    const totalPending = useMemo(() => {
        return items
            .filter((item) => !item.paymentPaid)
            .reduce((acc, item) => acc + (item.amount || 0), 0);
    }, [items]);

    const countPaid = useMemo(() => items.filter((item) => !!item.paymentPaid).length, [items]);

    const togglePaid = async (item) => {
        try {
            await updateDoc(doc(db, 'transactions', item.id), {
                paymentPaid: !item.paymentPaid,
            });
        } catch (error) {
            Alert.alert('Erro', 'Nao foi possivel atualizar o pagamento.');
        }
    };

    const handleMarkAllPaid = () => {
        const pendingItems = items.filter((item) => !item.paymentPaid);

        if (pendingItems.length === 0) {
            Alert.alert('Tudo certo', 'Nao ha itens pendentes para marcar como pago.');
            return;
        }

        Alert.alert(
            'Marcar todas como pagas',
            `Deseja marcar ${pendingItems.length} conta(s) como paga(s)?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await Promise.all(
                                pendingItems.map((item) =>
                                    updateDoc(doc(db, 'transactions', item.id), { paymentPaid: true })
                                )
                            );
                            setIsOptionsVisible(false);
                        } catch (error) {
                            Alert.alert('Erro', 'Nao foi possivel marcar todas como pagas.');
                        }
                    },
                },
            ]
        );
    };

    const handleResetFilters = () => {
        setFilter('pending');
        setSortBy('date');
        setHidePaidAuto(false);
        setIsOptionsVisible(false);
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.seconds) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} >
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Pagamentos</Text>
                <TouchableOpacity onPress={() => setIsOptionsVisible(true)} style={styles.backButton} >
                    <Ionicons name="settings-outline" size={22} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total pendente</Text>
                    <Text style={[styles.summaryValue, { color: '#EE5253' }]}>{formatCurrency(totalPending)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Ja pagas</Text>
                    <Text style={[styles.summaryValue, { color: '#10AC84' }]}>{countPaid}</Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#000" />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                    {finalItems.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={52} color="#E5E7EB" />
                            <Text style={styles.emptyText}>Nenhum lembrete de pagamento.</Text>
                            <Text style={styles.emptyHint}>Ao criar uma despesa, marque "Lembrar pagamento".</Text>
                        </View>
                    ) : (
                        finalItems.map((item) => (
                            <View key={item.id} style={styles.card}>
                                <View style={[styles.cardIcon, { backgroundColor: (item.categoryColor || '#CBD5E1') + '20' }]}>
                                    <MaterialCommunityIcons
                                        name={item.categoryIcon || 'cash'}
                                        size={22}
                                        color={item.categoryColor || '#64748B'}
                                    />
                                </View>

                                <View style={styles.cardContent}>
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardName} numberOfLines={1}>{item.description || 'Despesa'}</Text>
                                        <Text style={[styles.cardAmount, item.paymentPaid && styles.cardAmountPaid]}>
                                            {formatCurrency(item.amount || 0)}
                                        </Text>
                                    </View>
                                    <Text style={styles.cardMeta}>
                                        {item.category || 'Categoria'} • {formatDate(item.date)}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.checkBtn, item.paymentPaid && styles.checkBtnActive]}
                                    onPress={() => togglePaid(item)}
                                >
                                    <Ionicons
                                        name={item.paymentPaid ? 'checkmark' : 'checkmark-outline'}
                                        size={18}
                                        color={item.paymentPaid ? '#FFF' : '#CBD5E1'}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal
                visible={isOptionsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsOptionsVisible(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.modalOverlay}
                    onPress={() => setIsOptionsVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Opcoes de Pagamentos</Text>

                        <Text style={styles.modalSectionTitle}>Ordenar por</Text>
                        <View style={styles.modalOptionRow}>
                            <TouchableOpacity
                                style={[styles.modalChip, sortBy === 'date' && styles.modalChipActive]}
                                onPress={() => setSortBy('date')}
                            >
                                <Text style={[styles.modalChipText, sortBy === 'date' && styles.modalChipTextActive]}>Data</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalChip, sortBy === 'value' && styles.modalChipActive]}
                                onPress={() => setSortBy('value')}
                            >
                                <Text style={[styles.modalChipText, sortBy === 'value' && styles.modalChipTextActive]}>Valor</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSectionTitle}>Filtros rapidos</Text>
                        <TouchableOpacity style={styles.modalActionButton} onPress={() => setFilter('pending')}>
                            <Text style={styles.modalActionText}>Mostrar so pendentes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalActionButton}
                            onPress={() => setHidePaidAuto((prev) => !prev)}
                        >
                            <Text style={styles.modalActionText}>
                                {hidePaidAuto ? 'Nao ocultar pagas automaticamente' : 'Ocultar pagas automaticamente'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalActionButton} onPress={handleMarkAllPaid}>
                            <Text style={styles.modalActionText}>Marcar todas como pagas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalActionButton, styles.modalActionDanger]} onPress={handleResetFilters}>
                            <Text style={styles.modalActionDangerText}>Resetar filtros</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
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
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: theme.fonts.title,
        fontSize: 22,
        color: '#0F172A',
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        paddingBottom: 12,
    },
    filterTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    filterTabActive: {
        backgroundColor: '#0F172A',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterTextActive: {
        color: '#FFF',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 4,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        marginRight: 8,
    },
    cardAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EE5253',
    },
    cardAmountPaid: {
        color: '#10AC84',
    },
    cardMeta: {
        fontSize: 12,
        color: '#94A3B8',
    },
    checkBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBtnActive: {
        backgroundColor: '#10AC84',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        gap: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#9CA3AF',
    },
    emptyHint: {
        fontSize: 13,
        color: '#94A3B8',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 28,
        gap: 10,
    },
    modalHandle: {
        alignSelf: 'center',
        width: 42,
        height: 4,
        borderRadius: 8,
        backgroundColor: '#D1D5DB',
        marginBottom: 6,
    },
    modalTitle: {
        fontFamily: theme.fonts.title,
        fontSize: 20,
        color: '#0F172A',
        marginBottom: 4,
    },
    modalSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 4,
    },
    modalOptionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    modalChip: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    modalChipActive: {
        backgroundColor: '#0F172A',
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    modalChipTextActive: {
        color: '#FFF',
    },
    modalActionButton: {
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    modalActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    modalActionDanger: {
        backgroundColor: '#FFF1F2',
    },
    modalActionDangerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#BE123C',
    },
});

export default PaymentsScreen;
