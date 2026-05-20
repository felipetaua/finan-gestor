import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Platform, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { auth, db } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useCurrency } from '../../hooks/useCurrency';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DonutChart = ({ size = 230, strokeWidth = 20, data, totalAmount, selectedKey, formatCurrency, centerLabel = 'Total gastos' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    const selectedItem = selectedKey ? data.find(d => d.key === selectedKey) : null;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
            <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {data.length > 0 ? data.map((item, index) => {
                const strokeDashoffset = circumference - (item.value / 100) * circumference;
                const rotation = (currentOffset / 100) * 360;
                currentOffset += item.value;

            return (
                <Circle
                    key={index}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
                    fill="transparent"
                    opacity={selectedKey && item.key !== selectedKey ? 0.15 : 1}
                />
                );
            }) : (
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#F3F4F6"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
            )}
            </G>
        </Svg>
        <View style={styles.chartCenter}>
            {selectedItem ? (
                <>
                    <Text style={styles.chartLabel} numberOfLines={1}>{selectedItem.key}</Text>
                    <Text style={styles.chartValue}>{formatCurrency(selectedItem.amount)}</Text>
                    <Text style={styles.chartPercent}>{Math.round(selectedItem.value)}%</Text>
                </>
            ) : (
                <>
                    <Text style={styles.chartLabel}>{centerLabel}</Text>
                    <Text style={styles.chartValue}>{formatCurrency(totalAmount)}</Text>
                </>
            )}
        </View>
    </View>
    );
};

const AnalyticsScreen = () => {
    const user = auth.currentUser;
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { formatCurrency } = useCurrency();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [savingsTotal, setSavingsTotal] = useState(0);
    const [percentageSpent, setPercentageSpent] = useState(0);
    const [percentageLeft, setPercentageLeft] = useState(0);
    const [activePage, setActivePage] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [viewPeriod, setViewPeriod] = useState('mensal');
    const [viewType, setViewType] = useState('despesas'); 
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    useEffect(() => {
        if (!user) return;

        // Definir intervalo conforme período selecionado
        const startDate = viewPeriod === 'anual'
            ? new Date(currentDate.getFullYear(), 0, 1)
            : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = viewPeriod === 'anual'
            ? new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59)
            : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let allTrans = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(item => !(item?.isDeleted === true || item?.isDeleted === 'true' || item?.deletedAt != null));

            // Ordenação local (descendente)
            allTrans.sort((a, b) => {
                const dateA = a.date?.seconds || 0;
                const dateB = b.date?.seconds || 0;
                return dateB - dateA;
            });

            // Filtrar localmente por data
            const periodTrans = allTrans.filter(t => {
                if (!t.date) return false;
                const d = new Date(t.date.seconds * 1000);
                return d >= startDate && d <= endDate;
            });

            // Filtrar lista de transações conforme tipo selecionado
            const displayTrans = viewType === 'ambos'
                ? periodTrans
                : periodTrans.filter(t => t.type === (viewType === 'despesas' ? 'expense' : 'income'));

            setTransactions(displayTrans);

            // Calcular totais sempre com todos do período
            const expenses = periodTrans.filter(t => t.type === 'expense');
            const totalE = expenses.reduce((acc, curr) => acc + curr.amount, 0);

            const income = periodTrans.filter(t => t.type === 'income');
            const totalI = income.reduce((acc, curr) => acc + curr.amount, 0);

            const savings = totalI - totalE;
            const pSpent = totalI > 0 ? (totalE / totalI) * 100 : 0;
            const pLeft = 100 - pSpent;

            setTotalExpenses(totalE);
            setTotalIncome(totalI);
            setSavingsTotal(savings);
            setPercentageSpent(pSpent);
            setPercentageLeft(pLeft);

            // Gráfico de categorias conforme tipo selecionado
            const chartSource = viewType === 'renda' ? income : expenses;
            const chartTotal = viewType === 'renda' ? totalI : totalE;

            const categoryMap = {};
            chartSource.forEach(t => {
                if (!categoryMap[t.category]) {
                    categoryMap[t.category] = {
                        key: t.category,
                        amount: 0,
                        color: t.categoryColor || '#DDD'
                    };
                }
                categoryMap[t.category].amount += t.amount;
            });

            const data = Object.values(categoryMap).map(cat => ({
                key: cat.key,
                value: chartTotal > 0 ? (cat.amount / chartTotal) * 100 : 0,
                color: cat.color,
                amount: cat.amount,
                label: `${cat.key} ${chartTotal > 0 ? Math.round((cat.amount / chartTotal) * 100) : 0}%`
            }));

            setChartData(data);
        });

        return () => unsubscribe();
    }, [user, currentDate, viewPeriod, viewType]);

    const changeDate = (num) => {
        const newDate = new Date(currentDate);
        if (viewPeriod === 'anual') {
            newDate.setFullYear(newDate.getFullYear() + num);
        } else {
            newDate.setMonth(newDate.getMonth() + num);
        }
        setCurrentDate(newDate);
        setSelectedCategory(null);
    };

    const renderTransaction = ({ item }) => (
        <View style={styles.transactionItem}>
        <View style={[styles.transactionIconContainer, { backgroundColor: (item.categoryColor || '#000') + '15' }]}>
            <MaterialCommunityIcons name={item.categoryIcon || 'cash'} size={24} color={item.categoryColor || '#000'} />
        </View>
        <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>{item.description}</Text>
            <Text style={styles.transactionSubtitle}>{item.category}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? '#FF5252' : '#4CAF50' }]}>
            {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
        </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Análise de Gastos</Text>
            </View>
            <TouchableOpacity 
                style={styles.headerSettings} 
                onPress={() => setIsSettingsVisible(true)}
            >
                <Ionicons name="options-outline" size={22} color="#000" />
            </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.dateSelector}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                
                <View style={styles.dateInfo}>
                    {viewPeriod === 'mensal' && (
                        <Text style={styles.monthDisplay}>{months[currentDate.getMonth()]}</Text>
                    )}
                    <Text style={[styles.yearDisplay, viewPeriod === 'anual' && styles.yearDisplayLarge]}>
                        {currentDate.getFullYear()}
                    </Text>
                </View>

                <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.horizontalContainer}>
                <ScrollView 
                    horizontal 
                    pagingEnabled 
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    disableIntervalMomentum={true}
                    onScroll={(e) => {
                        const x = e.nativeEvent.contentOffset.x;
                        const page = Math.round(x / SCREEN_WIDTH);
                        if (page !== activePage) setActivePage(page);
                    }}
                    scrollEventThrottle={16}
                >
                    {/* Page 1: Gráfico de Rosca */}
                    <View style={styles.chartSlide}>
                        <DonutChart
                            data={chartData}
                            totalAmount={viewType === 'renda' ? totalIncome : totalExpenses}
                            selectedKey={selectedCategory}
                            formatCurrency={formatCurrency}
                            centerLabel={viewType === 'renda' ? 'Total renda' : 'Total gastos'}
                        />
                    </View>

                    {/* Page 2: Resumo de Métricas */}
                    <View style={styles.statsSlide}>
                        <View style={styles.metricsContainer}>
                            <View style={styles.metricRow}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Renda Total</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.metricValue, { color: '#4CAF50' }]}>{formatCurrency(totalIncome)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.metricItem, { alignItems: 'flex-end' }]}>
                                    <Text style={styles.metricLabel}>Despesa Total</Text>
                                    <Text style={[styles.metricValue, { color: '#FF5252' }]}>{formatCurrency(totalExpenses)}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.metricRow}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Percentual Gasto</Text>
                                    <Text style={styles.metricValue}>{Math.round(percentageSpent)}%</Text>
                                </View>
                                <View style={[styles.metricItem, { alignItems: 'flex-end' }]}>
                                    <Text style={styles.metricLabel}>Percentual Sobra</Text>
                                    <Text style={styles.metricValue}>{Math.round(percentageLeft)}%</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.metricItemFull}>
                                <Text style={styles.metricLabel}>Sobra Total</Text>
                                <Text style={[styles.metricValueLarge, { color: savingsTotal >= 0 ? '#4CAF50' : '#FF5252' }]}>
                                    {formatCurrency(savingsTotal)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
                
                {/* Indicadores de página */}
                <View style={styles.paginationDots}>
                    <View style={[styles.dot, activePage !== 0 && { opacity: 0.2 }]} />
                    <View style={[styles.dot, activePage !== 1 && { opacity: 0.2 }]} />
                </View>
            </View>

                <View style={styles.legendContainer}>
                {chartData.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.legendItem, selectedCategory === item.key && { borderColor: item.color, borderWidth: 1.5 }]}
                        onPress={() => setSelectedCategory(selectedCategory === item.key ? null : item.key)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
                </View>

                <View style={styles.transactionsHeader}>
                    <Text style={styles.sectionTitle}>Transações</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                        <Text style={styles.seeAll}>Ver todos</Text>
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
                    <Text style={styles.emptyText}>Nenhuma transação neste período.</Text>
                )}
                </View>
            </ScrollView>

            {/* Modal de Configurações */}
            <Modal
                visible={isSettingsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSettingsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsSettingsVisible(false)}
                >
                    <View style={styles.settingsModal}>
                        <View style={styles.settingsHandle} />
                        <Text style={styles.settingsTitle}>Configurações do Gráfico</Text>

                        <Text style={styles.settingsLabel}>Período</Text>
                        <View style={styles.toggleRow}>
                            {[
                                { key: 'mensal', label: 'Mensal' },
                                { key: 'anual', label: 'Anual' },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[styles.toggleButton, viewPeriod === opt.key && styles.toggleButtonActive]}
                                    onPress={() => { setViewPeriod(opt.key); setSelectedCategory(null); }}
                                >
                                    <Text style={[styles.toggleText, viewPeriod === opt.key && styles.toggleTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingsLabel}>Visualizar</Text>
                        <View style={styles.toggleRow}>
                            {[
                                { key: 'despesas', label: 'Despesas' },
                                { key: 'renda', label: 'Renda' },
                                { key: 'ambos', label: 'Ambos' },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[styles.toggleButton, styles.toggleButtonFlex, viewType === opt.key && styles.toggleButtonActive]}
                                    onPress={() => { setViewType(opt.key); setSelectedCategory(null); }}
                                >
                                    <Text style={[styles.toggleText, viewType === opt.key && styles.toggleTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.settingsClose}
                            onPress={() => setIsSettingsVisible(false)}
                        >
                            <Text style={styles.settingsCloseText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
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
        paddingHorizontal: 15,
        paddingVertical: 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    title: {
        fontFamily: theme.fonts.title,
        fontSize: 24,
        color: '#000',
    },
    headerSettings: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 20,
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateInfo: {
        alignItems: 'center',
        minWidth: 120,
    },
    monthDisplay: {
        fontFamily: theme.fonts.title,
        fontSize: 18,
        color: '#000',
    },
    yearDisplay: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: -2,
    },
    horizontalContainer: {
        width: '100%',
        height: 290,
        marginVertical: 20,
    },
    chartSlide: {
        width: SCREEN_WIDTH,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    statsSlide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: 20,
        height: 250, 
        justifyContent: 'center',
    },
    metricsContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricItem: {
        flex: 1,
    },
    metricItemFull: {
        alignItems: 'center',
        marginTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
    metricLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    metricValueLarge: {
        fontSize: 24,
        fontWeight: '800',
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 10,
        marginBottom: 15,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#000',
    },
    chartCenter: {
        position: 'absolute',
        alignItems: 'center',
    },
    chartLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    chartValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    chartPercent: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    legendText: {
        fontSize: 10,
        color: '#374151',
        fontWeight: '500',
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontFamily: theme.fonts.title,
        fontSize: 22,
        color: '#000',
    },
    seeAll: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
        fontSize: 14,
    },
    transactionsList: {
        paddingHorizontal: 20,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
    },
    transactionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    transactionSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    //config menu
    yearDisplayLarge: {
        fontSize: 18,
        color: '#000',
        fontFamily: theme.fonts.title,
        marginTop: 0,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    settingsModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 36,
    },
    settingsHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 16,
    },
    settingsTitle: {
        fontFamily: theme.fonts.title,
        fontSize: 20,
        color: '#000',
        marginBottom: 20,
    },
    settingsLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    toggleButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    toggleButtonFlex: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    toggleTextActive: {
        color: '#FFF',
    },
    settingsClose: {
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    settingsCloseText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
});

export default AnalyticsScreen;
