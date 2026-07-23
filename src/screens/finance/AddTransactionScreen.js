import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    Switch, 
    Alert, 
    ActivityIndicator,
    Platform,
    Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { theme } from '../../theme/theme';
import { db, auth } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, query, where, onSnapshot } from 'firebase/firestore';
import { useCurrency } from '../../hooks/useCurrency';

const CATEGORIES = {
    expense: [
        { id: '1', name: 'Alimentação', icon: 'food', color: '#FF9F43' },
        { id: '2', name: 'Transporte', icon: 'car', color: '#54A0FF' },
        { id: '3', name: 'Lazer', icon: 'popcorn', color: '#5F27CD' },
        { id: '4', name: 'Saúde', icon: 'heart-pulse', color: '#EE5253' },
        { id: '5', name: 'Educação', icon: 'school', color: '#00D2D3' },
        { id: '6', name: 'Moradia', icon: 'home', color: '#10AC84' },
        { id: '7', name: 'Compras', icon: 'cart', color: '#01a3a4' },
        { id: '8', name: 'Outros', icon: 'dots-horizontal', color: '#8395a7' },
    ],
    income: [
        { id: '9', name: 'Salário', icon: 'cash', color: '#10AC84' },
        { id: '10', name: 'Investimentos', icon: 'chart-line', color: '#2E86DE' },
        { id: '11', name: 'Presente', icon: 'gift', color: '#FF9F43' },
        { id: '12', name: 'Vendas', icon: 'store', color: '#EE5253' },
        { id: '14', name: 'Renda Extra', icon: 'cash-multiple', color: '#01a3a4' },
        { id: '13', name: 'Outros', icon: 'dots-horizontal', color: '#8395a7' },
    ]
};

const CATEGORY_ICONS = ['food', 'car', 'popcorn', 'heart-pulse', 'school', 'home', 'cart', 'gift', 'cash', 'store', 'laptop', 'airplane', 'dog', 'wrench', 'credit-card', 'bank', 'music', 'tshirt-crew'];
const CATEGORY_COLORS = ['#FF9F43', '#54A0FF', '#5F27CD', '#EE5253', '#00D2D3', '#10AC84', '#01a3a4', '#8395a7', '#EC4899', '#EAB308'];

const AddTransactionScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute();
    const { type = 'expense', accountType = 'pessoal' } = route.params || {};
    const { currencySymbol, currencyCode } = useCurrency();

    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isFixed, setIsFixed] = useState(false);
    const [paymentReminder, setPaymentReminder] = useState(false);
    const [details, setDetails] = useState('');
    const isSubmittingRef = useRef(false);

    // Estados para Data Customizada
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    // Estados para Novas Categorias Customizadas
    const [customCategories, setCustomCategories] = useState([]);
    const [isNewCategoryModalVisible, setIsNewCategoryModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('cash');
    const [newCategoryColor, setNewCategoryColor] = useState('#FF9F43');
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    // Buscar categorias customizadas do Firestore em tempo real
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, "custom_categories"),
            where("userId", "==", user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCustomCategories(list);
        });

        return unsub;
    }, []);

    const handleCreateCategory = async () => {
        const user = auth.currentUser;
        if (!user) return;

        if (!newCategoryName.trim()) {
            Alert.alert("Ops!", "Por favor, digite o nome da categoria.");
            return;
        }

        setIsSavingCategory(true);
        try {
            await addDoc(collection(db, "custom_categories"), {
                userId: user.uid,
                type: type, // 'expense' ou 'income'
                name: newCategoryName.trim(),
                icon: newCategoryIcon,
                color: newCategoryColor,
                createdAt: serverTimestamp()
            });

            setIsNewCategoryModalVisible(false);
            setNewCategoryName('');
            // A categoria aparecerá automaticamente na lista pelo onSnapshot
        } catch (error) {
            console.error("Erro ao salvar categoria customizada:", error);
            Alert.alert("Erro", "Não foi possível criar a categoria.");
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleSave = async () => {
        if (isSubmittingRef.current || loading) return;

        if (!amount || !description || !selectedCategory) {
            Alert.alert('Ops!', 'Por favor, preencha o valor, a descrição e escolha uma categoria.');
            return;
        }

        isSubmittingRef.current = true;
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Usuário não autenticado');

            const transactionData = {
                userId: user.uid,
                type: type, // 'income' ou 'expense'
                amount: parseFloat(amount.replace(',', '.')),
                currencyCode,
                description: description,
                category: selectedCategory.name,
                categoryIcon: selectedCategory.icon,
                categoryColor: selectedCategory.color,
                isFixed: isFixed,
                paymentReminder: type === 'expense' ? paymentReminder : false,
                paymentPaid: type === 'expense' ? false : null,
                details: details,
                accountType: accountType,
                date: selectedDate, // Salva a data selecionada em vez de serverTimestamp()
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'transactions'), transactionData);
            
            const userRef = doc(db, "users", user.uid);
            const xpAmount = type === 'income' ? 10 : 2;
            
            await updateDoc(userRef, {
                xp: increment(xpAmount),
                xpDiario: increment(xpAmount),
                xpMensal: increment(xpAmount)
            });
            
            Alert.alert('Sucesso!', `Transação adicionada! Você ganhou +${xpAmount} XP.`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error("Erro ao salvar transação:", error);
            Alert.alert('Erro', 'Não foi possível salvar a transação. Tente novamente.');
        } finally {
            isSubmittingRef.current = false;
            setLoading(false);
        }
    };

    const baseCategories = type === 'expense' ? CATEGORIES.expense : CATEGORIES.income;
    const filteredCustom = customCategories.filter(c => c.type === type);
    const currentCategories = [...baseCategories, ...filteredCustom];
    const themeColor = type === 'expense' ? theme.colors.error : theme.colors.success;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>
                    Nova {type === 'expense' ? 'Despesa' : 'Receita'}
                </Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Amount Input */}
                <View style={styles.amountSection}>
                    <Text style={styles.label}>Valor</Text>
                    <View style={styles.amountInputRow}>
                        <Text style={[styles.currency, { color: themeColor }]}>{currencySymbol}</Text>
                        <TextInput
                            style={[styles.amountInput, { color: themeColor }]}
                            placeholder="0,00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />
                    </View>
                </View>

                {/* Description */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Ex: Aluguel, Supermercado..."
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Date Selection */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Data da Transação</Text>
                    <View style={styles.dateSelectorRow}>
                        <TouchableOpacity 
                            style={[
                                styles.dateOptionBtn, 
                                selectedDate.toDateString() === new Date().toDateString() && styles.dateOptionBtnActive
                            ]}
                            onPress={() => setSelectedDate(new Date())}
                        >
                            <Text style={[
                                styles.dateOptionText, 
                                selectedDate.toDateString() === new Date().toDateString() && styles.dateOptionTextActive
                            ]}>Hoje</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.dateOptionBtn, 
                                selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString() && styles.dateOptionBtnActive
                            ]}
                            onPress={() => setSelectedDate(new Date(Date.now() - 86400000))}
                        >
                            <Text style={[
                                styles.dateOptionText, 
                                selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString() && styles.dateOptionTextActive
                            ]}>Ontem</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.dateOptionBtn, 
                                styles.dateOptionCustomBtn,
                                selectedDate.toDateString() !== new Date().toDateString() && 
                                selectedDate.toDateString() !== new Date(Date.now() - 86400000).toDateString() && styles.dateOptionBtnActive
                            ]}
                            onPress={() => setIsCalendarVisible(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color={
                                selectedDate.toDateString() !== new Date().toDateString() && 
                                selectedDate.toDateString() !== new Date(Date.now() - 86400000).toDateString() ? '#FFF' : themeColor
                            } style={{ marginRight: 5 }} />
                            <Text style={[
                                styles.dateOptionText, 
                                selectedDate.toDateString() !== new Date().toDateString() && 
                                selectedDate.toDateString() !== new Date(Date.now() - 86400000).toDateString() && styles.dateOptionTextActive
                            ]}>
                                {selectedDate.toDateString() === new Date().toDateString() || 
                                 selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString() 
                                    ? 'Outra Data' 
                                    : selectedDate.toLocaleDateString('pt-BR')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category Selection */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.categoriesGrid}>
                        {currentCategories.map((cat) => (
                            <TouchableOpacity 
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    selectedCategory?.id === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                                    <MaterialCommunityIcons name={cat.icon} size={24} color="#FFF" />
                                </View>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Botão de Adicionar Nova Categoria */}
                        <TouchableOpacity 
                            style={[styles.categoryItem, styles.addCategoryItem]}
                            onPress={() => setIsNewCategoryModalVisible(true)}
                        >
                            <View style={[styles.categoryIcon, { backgroundColor: '#F1F5F9' }]}>
                                <Ionicons name="add" size={24} color="#64748B" />
                            </View>
                            <Text style={[styles.categoryName, { color: '#64748B' }]}>Nova Cat...</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Fixed Transaction Toggle */}
                <View style={styles.toggleRow}>
                    <View>
                        <Text style={styles.toggleTitle}>É uma transação fixa?</Text>
                        <Text style={styles.toggleSubtitle}>Se repete todos os meses</Text>
                    </View>
                    <Switch
                        value={isFixed}
                        onValueChange={setIsFixed}
                        trackColor={{ false: '#767577', true: themeColor }}
                    />
                </View>

                {type === 'expense' && (
                    <View style={styles.toggleRow}>
                        <View>
                            <Text style={styles.toggleTitle}>Lembrar pagamento?</Text>
                            <Text style={styles.toggleSubtitle}>Mostra esta despesa na tela de pagamentos</Text>
                        </View>
                        <Switch
                            value={paymentReminder}
                            onValueChange={setPaymentReminder}
                            trackColor={{ false: '#767577', true: themeColor }}
                        />
                    </View>
                )}

                {/* More Details */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Mais detalhes (opcional)</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea]}
                        placeholder="Adicione notas ou observações..."
                        value={details}
                        onChangeText={setDetails}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: themeColor }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Salvar Transação</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal de Calendário */}
            <Modal
                visible={isCalendarVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCalendarVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackgroundDismiss} 
                        activeOpacity={1} 
                        onPress={() => setIsCalendarVisible(false)} 
                    />
                    <View style={styles.calendarModalContent}>
                        <View style={styles.calendarHeader}>
                            <Text style={styles.calendarTitle}>Escolher Data</Text>
                            <TouchableOpacity onPress={() => setIsCalendarVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Calendar
                            maxDate={new Date().toISOString().split('T')[0]} // Não permite selecionar data futura
                            current={selectedDate.toISOString().split('T')[0]}
                            markedDates={{
                                [selectedDate.toISOString().split('T')[0]]: { selected: true, selectedColor: themeColor }
                            }}
                            onDayPress={(day) => {
                                // O dia é retornado como { year, month, day, dateString, timestamp }
                                const localDate = new Date(day.year, day.month - 1, day.day);
                                setSelectedDate(localDate);
                                setIsCalendarVisible(false);
                            }}
                            theme={{
                                todayTextColor: themeColor,
                                arrowColor: themeColor,
                                selectedDayBackgroundColor: themeColor,
                                selectedDayTextColor: '#FFFFFF',
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Modal de Nova Categoria */}
            <Modal
                visible={isNewCategoryModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsNewCategoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackgroundDismiss} 
                        activeOpacity={1} 
                        onPress={() => setIsNewCategoryModalVisible(false)} 
                    />
                    <View style={styles.categoryModalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalHeaderTitle}>Nova Categoria</Text>
                            <TouchableOpacity onPress={() => setIsNewCategoryModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Nome */}
                            <Text style={styles.modalLabel}>Nome da Categoria</Text>
                            <TextInput
                                style={styles.modalTextInput}
                                placeholder="Ex: Investimentos, Pet, Jogos..."
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                            />

                            {/* Ícone */}
                            <Text style={styles.modalLabel}>Escolha um Ícone</Text>
                            <View style={styles.iconsSelectorGrid}>
                                {CATEGORY_ICONS.map((ico) => (
                                    <TouchableOpacity
                                        key={ico}
                                        style={[
                                            styles.iconOptionItem,
                                            newCategoryIcon === ico && { backgroundColor: themeColor }
                                        ]}
                                        onPress={() => setNewCategoryIcon(ico)}
                                    >
                                        <MaterialCommunityIcons 
                                            name={ico} 
                                            size={20} 
                                            color={newCategoryIcon === ico ? '#FFF' : '#64748B'} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Cor */}
                            <Text style={styles.modalLabel}>Escolha uma Cor</Text>
                            <View style={styles.colorsSelectorGrid}>
                                {CATEGORY_COLORS.map((col) => (
                                    <TouchableOpacity
                                        key={col}
                                        style={[
                                            styles.colorOptionItem,
                                            { backgroundColor: col },
                                            newCategoryColor === col && styles.colorOptionItemSelected
                                        ]}
                                        onPress={() => setNewCategoryColor(col)}
                                    />
                                ))}
                            </View>

                            {/* Criar Categoria Button */}
                            <TouchableOpacity 
                                style={[styles.createCategoryBtn, { backgroundColor: themeColor }]}
                                onPress={handleCreateCategory}
                                disabled={isSavingCategory}
                            >
                                {isSavingCategory ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.createCategoryBtnText}>Criar Categoria</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontFamily: theme.fonts.title,
        fontSize: 20,
        color: '#000',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    amountSection: {
        alignItems: 'center',
        marginVertical: 30,
    },
    label: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
        fontWeight: '600',
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currency: {
        fontSize: 24,
        fontWeight: 'bold',
        marginRight: 5,
    },
    amountInput: {
        fontSize: 48,
        fontWeight: 'bold',
        minWidth: 100,
        textAlign: 'center'
    },
    inputSection: {
        marginBottom: 25,
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 10,
    },
    categoryItem: {
        width: '22%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 9,
        color: '#4B5563',
        fontWeight: '600',
        textAlign: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 12,
        marginBottom: 25,
    },
    toggleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    toggleSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Estilos do Seletor de Data
    dateSelectorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 5,
    },
    dateOptionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    dateOptionCustomBtn: {
        flex: 1.2,
    },
    dateOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    dateOptionTextActive: {
        color: '#FFFFFF',
    },
    // Estilo da categoria "Adicionar"
    addCategoryItem: {
        borderStyle: 'dashed',
        borderColor: '#94A3B8',
        borderWidth: 2,
    },
    // Estilos dos Modais
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalBackgroundDismiss: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    calendarModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    categoryModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 15,
        marginBottom: 8,
    },
    modalTextInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconsSelectorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 5,
    },
    iconOptionItem: {
        width: '14%',
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    colorsSelectorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 5,
    },
    colorOptionItem: {
        width: '14%',
        aspectRatio: 1,
        borderRadius: 10,
        marginBottom: 4,
    },
    colorOptionItemSelected: {
        borderWidth: 3,
        borderColor: '#0F172A',
    },
    createCategoryBtn: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 25,
        marginBottom: 10,
    },
    createCategoryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AddTransactionScreen;
