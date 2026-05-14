import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useCurrency } from '../../context/CurrencyContext';

const TransactionsScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const user = auth.currentUser;
    const { formatCurrency, currencySymbol } = useCurrency();
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = mais recente primeiro, 'asc' = mais antigo primeiro

    // Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // Modal state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ type: null, ids: [] });
    const [isDeleting, setIsDeleting] = useState(false);

    const isTransactionDeleted = (item) => {
        return item?.isDeleted === true || item?.isDeleted === 'true' || item?.deletedAt != null;
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) 
            ? prev.filter(i => i !== id) 
            : [...prev, id]
        );
    };

    const deleteTransactionById = async (id) => {
        const transRef = doc(db, "transactions", id);

        try {

            await updateDoc(transRef, {
                isDeleted: true,
                deletedAt: serverTimestamp(),
            });
        } catch (softDeleteError) {
            await deleteDoc(transRef);
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setDeleteTarget({ type: 'bulk', ids: [...selectedIds] });
        setConfirmDeleteVisible(true);
    };

    const handleEditPress = (item) => {
        setSelectedTransaction(item);
        setEditAmount(item.amount.toString());
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!selectedTransaction) return;
        try {
            const transRef = doc(db, "transactions", selectedTransaction.id);
            await updateDoc(transRef, {
                amount: parseFloat(editAmount.replace(',', '.'))
            });
            setEditModalVisible(false);
        } catch (error) {
            console.error("Error updating transaction:", error);
            Alert.alert("Erro", "Não foi possível atualizar a transação.");
        }
    };

    const handleDelete = () => {
        if (!selectedTransaction) return;
        setDeleteTarget({ type: 'single', ids: [selectedTransaction.id] });
        setConfirmDeleteVisible(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget.ids.length || isDeleting) return;

        try {
            setIsDeleting(true);
            await Promise.all(deleteTarget.ids.map((id) => deleteTransactionById(id)));

            // Remove localmente para feedback imediato, sem esperar snapshot.
            setTransactions((prevSections) =>
                prevSections
                    .map((section) => ({
                        ...section,
                        data: section.data.filter((item) => !deleteTarget.ids.includes(item.id)),
                    }))
                    .filter((section) => section.data.length > 0)
            );

            if (deleteTarget.type === 'bulk') {
                setSelectedIds([]);
                setIsSelectionMode(false);
            } else if (selectedTransaction && deleteTarget.ids.includes(selectedTransaction.id)) {
                setSelectedTransaction(null);
            }

            setEditModalVisible(false);
            setConfirmDeleteVisible(false);
            setDeleteTarget({ type: null, ids: [] });
        } catch (error) {
            console.error('Error deleting transaction(s):', error);
            Alert.alert('Erro', `Não foi possível excluir. ${error?.message || ''}`.trim());
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let transList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(item => !isTransactionDeleted(item));

            // Group by date
            const grouped = transList.reduce((acc, obj) => {
                const date = obj.date ? new Date(obj.date.seconds * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'Recent';
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(obj);
                return acc;
            }, {});

            const sections = Object.keys(grouped).map(date => ({
                title: date,
                data: grouped[date].sort((a,b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
            })).sort((a, b) => {
                return 0; 
            });

            setTransactions(sections);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredTransactions = transactions.filter(section => {
        const filteredData = section.data.filter(item => 
            item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filteredData.length > 0;
    }).map(section => ({
        ...section,
        data: section.data.filter(item => 
            item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => {
            const timeA = a.date?.seconds || 0;
            const timeB = b.date?.seconds || 0;
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        })
    })).sort((a, b) => {
        const timeA = a.data[0]?.date?.seconds || 0;
        const timeB = b.data[0]?.date?.seconds || 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    const renderTransactionItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);

        return (
            <TouchableOpacity 
                style={[
                    styles.transactionCard, 
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: '#F0F7FF' }
                ]}
                onPress={() => isSelectionMode ? toggleSelection(item.id) : handleEditPress(item)}
                onLongPress={() => isSelectionMode ? null : handleEditPress(item)}
                activeOpacity={0.7}
            >
                {isSelectionMode && (
                    <View style={styles.selectionIndicator}>
                        <Ionicons 
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                            size={20} 
                            color={isSelected ? theme.colors.primary : "#CCC"} 
                        />
                    </View>
                )}
                <View style={[styles.iconContainer, { backgroundColor: (item.categoryColor || '#EEE') + '15' }]}>
                    <MaterialCommunityIcons 
                        name={item.categoryIcon || 'cash'} 
                        size={24} 
                        color={item.categoryColor || theme.colors.textPrimary} 
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <View style={styles.row}>
                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
                        <View style={styles.amountEditRow}>
                            <Text style={[styles.amount, { color: item.type === 'expense' ? '#FF5252' : '#4CAF50' }]}>
                                {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.subText} numberOfLines={1}>{item.category || 'Outros'}</Text>
                        <Text style={styles.dateText}>
                            {item.date ? new Date(item.date.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <View>
                        <Text style={styles.headerTitle}>Transações</Text>
                        <Text style={styles.accountInfo}>Conta Finan</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {isSelectionMode ? (
                        <>
                            <TouchableOpacity 
                                style={[styles.editHeaderButton, { backgroundColor: '#FFEEF0' }, selectedIds.length === 0 && { opacity: 0.5 }]} 
                                onPress={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FF5252" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editHeaderButton} onPress={() => {
                                setIsSelectionMode(false);
                                setSelectedIds([]);
                            }}>
                                <Text style={styles.editHeaderText}>Cancelar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.editHeaderButton} onPress={() => setIsSelectionMode(true)}>
                            <Text style={styles.editHeaderText}>Editar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInner}>
                    <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Pesquisar transações..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />
                </View>
            </View>

            {/* Filter Toggle */}
            <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Data</Text>
                <TouchableOpacity onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} style={styles.filterIconBtn}>
                    <MaterialCommunityIcons 
                        name={sortOrder === 'desc' ? "sort-calendar-descending" : "sort-calendar-ascending"} 
                        size={22} 
                        color="#666" 
                    />
                </TouchableOpacity>
            </View>

            {/* Transaction List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : filteredTransactions.length > 0 ? (
                <SectionList
                    sections={filteredTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransactionItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
                </View>
            )}

            {/* Modal de Edição */}
            <Modal
                visible={editModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setEditModalVisible(false)}
                >
                    <View 
                        style={styles.modalContainer}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalIndicator} />
                        <Text style={styles.modalTitle}>Editar Transação</Text>
                        
                        {selectedTransaction && (
                            <View style={styles.modalTransactionHeader}>
                                <View style={[styles.modalIconBox, { backgroundColor: (selectedTransaction.categoryColor || '#EEE') + '15' }]}>
                                    <MaterialCommunityIcons 
                                        name={selectedTransaction.categoryIcon || 'cash'} 
                                        size={24} 
                                        color={selectedTransaction.categoryColor || theme.colors.textPrimary} 
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTransactionName}>{selectedTransaction.description}</Text>
                                    <Text style={styles.modalTransactionSub}>{selectedTransaction.category || 'Outros'}</Text>
                                </View>
                            </View>
                        )}
                        
                        <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Valor ({currencySymbol})</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editAmount}
                                onChangeText={setEditAmount}
                                keyboardType="numeric"
                                placeholder="0,00"
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDelete]} onPress={handleDelete}>
                                <Ionicons name="trash-outline" size={20} color="#FF5252" />
                            </TouchableOpacity>
                            
                            <View style={styles.modalRightActions}>
                                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                                    <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={styles.modalBtnSave} onPress={handleUpdate}>
                                    <Text style={styles.modalBtnTextSave}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={confirmDeleteVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setConfirmDeleteVisible(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>Tem certeza que quer apagar?</Text>
                        <Text style={styles.confirmText}>
                            {deleteTarget.type === 'bulk'
                                ? `Isso vai apagar ${deleteTarget.ids.length} transações.`
                                : 'Essa transação será removida da sua lista.'}
                        </Text>

                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setConfirmDeleteVisible(false)}
                                disabled={isDeleting}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.confirmDeleteText}>Confirmar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
        paddingTop: 15,
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 15,
    },
    flagIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#002664',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        color: '#000',
        fontFamily: theme.fonts.title,
    },
    accountInfo: {
        fontSize: 12,
        color: '#666',
    },
    calendarButton: {
        padding: 5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editHeaderButton: {
        marginRight: 10,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    bulkDeleteButton: {
        marginRight: 15,
        padding: 5,
    },
    searchContainer: {
        backgroundColor: '#FFF',
        marginHorizontal: 15,
        marginTop: 25,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        height: 44,
        justifyContent: 'center',
    },
    searchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        padding: 0,
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    filterLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'bold',
        marginRight: 8,
    },
    filterIconBtn: {
        padding: 4,
    },
    amountEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniEditButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    sectionHeader: {
        fontSize: 14,
        color: '#999',
        marginHorizontal: 15,
        marginTop: 20,
        marginBottom: 8,
    },
    listContent: {
        paddingBottom: 20,
    },
    transactionCard: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginHorizontal: 15,
        marginVertical: 4,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
            web: {
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
            },
        }),
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    selectionIndicator: {
        marginRight: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    transactionDetails: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginRight: 10,
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    subText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        marginRight: 10,
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingVertical: 32,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -10 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0px -10px 10px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    modalIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalTransactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    modalIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    modalTransactionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    modalTransactionSub: {
        fontSize: 12,
        color: '#666',
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalBtn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnDelete: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF1F1',
    },
    modalBtnCancel: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
    },
    modalBtnTextCancel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    modalBtnSave: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modalBtnTextSave: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    confirmCard: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 16,
        backgroundColor: '#FFF',
        padding: 18,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    confirmText: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 16,
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    confirmCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
    },
    confirmCancelText: {
        color: '#334155',
        fontWeight: '600',
    },
    confirmDeleteBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#DC2626',
        minWidth: 92,
        alignItems: 'center',
    },
    confirmDeleteText: {
        color: '#FFF',
        fontWeight: '700',
    },
});

export default TransactionsScreen;
