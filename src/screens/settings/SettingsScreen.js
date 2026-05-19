import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { CURRENCY_OPTIONS } from '../../context/CurrencyContext';
import { useCurrency } from '../../hooks/useCurrency';

const SettingsScreen = ({ navigation }) => {
    const { selectedCurrency, setCurrency } = useCurrency();
    const [isCurrencyModalVisible, setIsCurrencyModalVisible] = React.useState(false);
    const [isLogoutModalVisible, setIsLogoutModalVisible] = React.useState(false);
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleCurrencyChange = () => {
        setIsCurrencyModalVisible(true);
    };

    const handleSelectCurrency = async (code) => {
        await setCurrency(code);
        setIsCurrencyModalVisible(false);
    };

    const handleLogout = () => {
        setIsLogoutModalVisible(true);
    };

    const confirmLogout = async () => {
        if (isLoggingOut) return;

        try {
            setIsLoggingOut(true);
            await signOut(auth);
            setIsLogoutModalVisible(false);
        } catch (error) {
            console.log('Erro ao sair:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const SettingItem = ({ icon, label, onPress, value, type = 'chevron', color = theme.colors.textPrimary, isMaterial = false }) => {
        const IconComponent = isMaterial ? MaterialCommunityIcons : Ionicons;
        return (
            <TouchableOpacity style={styles.item} onPress={onPress}>
                <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                        <IconComponent name={icon} size={22} color={color} />
                    </View>
                    <Text style={[styles.label, { color }]}>{label}</Text>
                </View>
                <View style={styles.itemRight}>
                    {value && <Text style={styles.value}>{value}</Text>}
                    {type === 'chevron' && <Ionicons name="chevron-forward" size={20} color="#999" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Configurações</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Geral</Text>
                    <SettingItem 
                        icon="color-palette-outline" 
                        label="Tema" 
                        value="Claro"
                        onPress={() => {}} 
                        color={theme.colors.primary}
                    />
                    <SettingItem 
                        icon="language-outline" 
                        label="Idioma" 
                        value="Português"
                        onPress={() => {}} 
                        color="#8B5CF6"
                    />
                    <SettingItem 
                        isMaterial
                        icon="swap-horizontal" 
                        label="Moeda" 
                        value={selectedCurrency.label}
                        onPress={handleCurrencyChange} 
                        color="#49d327"
                    />
                    <SettingItem 
                        icon="notifications-outline" 
                        label="Notificações" 
                        onPress={() => {}} 
                        color="#F59E0B"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Segurança</Text>
                    <SettingItem 
                        icon="lock-closed-outline" 
                        label="Privacidade" 
                        onPress={() => {}} 
                        color="#10B981"
                    />
                    <SettingItem 
                        icon="shield-checkmark-outline" 
                        label="Segurança da conta" 
                        onPress={() => {}} 
                        color="#3B82F6"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aplicativo</Text>
                    <SettingItem 
                        icon="help-circle-outline" 
                        label="Ajuda e Suporte" 
                        onPress={() => {}} 
                        color="#6366F1"
                    />
                    <SettingItem 
                        icon="information-circle-outline" 
                        label="Sobre" 
                        onPress={() => {}} 
                        color="#6B7280"
                    />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    <Text style={styles.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.version}>Finan App v1.0.0</Text>
                </View>
            </ScrollView>

            <Modal
                visible={isCurrencyModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsCurrencyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalDismissArea}
                        activeOpacity={1}
                        onPress={() => setIsCurrencyModalVisible(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Selecionar moeda</Text>
                        <Text style={styles.modalSubtitle}>Escolha a moeda para exibir valores no app.</Text>

                        {CURRENCY_OPTIONS.map((option) => {
                            const isActive = selectedCurrency.code === option.code;
                            return (
                                <TouchableOpacity
                                    key={option.code}
                                    style={[styles.currencyOption, isActive && styles.currencyOptionActive]}
                                    onPress={() => handleSelectCurrency(option.code)}
                                >
                                    <Text style={[styles.currencyOptionText, isActive && styles.currencyOptionTextActive]}>
                                        {option.label}
                                    </Text>
                                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setIsCurrencyModalVisible(false)}
                        >
                            <Text style={styles.modalCancelText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isLogoutModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsLogoutModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalDismissArea}
                        activeOpacity={1}
                        onPress={() => setIsLogoutModalVisible(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Sair do app</Text>
                        <Text style={styles.modalSubtitle}>Deseja mesmo sair da sua conta?</Text>

                        <View style={styles.logoutModalActions}>
                            <TouchableOpacity
                                style={styles.logoutCancelButton}
                                onPress={() => setIsLogoutModalVisible(false)}
                                disabled={isLoggingOut}
                            >
                                <Text style={styles.logoutCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.logoutConfirmButton}
                                onPress={confirmLogout}
                                disabled={isLoggingOut}
                            >
                                <Text style={styles.logoutConfirmText}>Sair</Text>
                            </TouchableOpacity>
                        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    container: {
        flex: 1,
    },
    section: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 5,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    value: {
        fontSize: 14,
        color: '#999',
        marginRight: 10,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        paddingVertical: 15,
        marginHorizontal: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    footer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    version: {
        color: '#CCC',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 20,
    },
    modalDismissArea: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        backgroundColor: '#FFF',
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 16,
    },
    currencyOption: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
    },
    currencyOptionActive: {
        borderColor: theme.colors.primary,
        backgroundColor: '#EEF6FF',
    },
    currencyOptionText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '600',
    },
    currencyOptionTextActive: {
        color: theme.colors.primary,
    },
    modalCancelButton: {
        marginTop: 4,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },
    logoutModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 6,
    },
    logoutCancelButton: {
        height: 42,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutCancelText: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },
    logoutConfirmButton: {
        height: 42,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutConfirmText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default SettingsScreen;
