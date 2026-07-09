import React, { useRef, useState } from 'react';
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
    Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { db, auth } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
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

const AddTransactionScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const route = useRoute();
    const { type = 'expense' } = route.params || {};
    const { currencySymbol, currencyCode } = useCurrency();

    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isFixed, setIsFixed] = useState(false);
    const [paymentReminder, setPaymentReminder] = useState(false);
    const [details, setDetails] = useState('');
    const isSubmittingRef = useRef(false);

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
                date: serverTimestamp(),
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

    const currentCategories = type === 'expense' ? CATEGORIES.expense : CATEGORIES.income;
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
});

export default AddTransactionScreen;
