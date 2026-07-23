import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Modal, FlatList, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useOnboarding } from '../../hooks/useOnboarding';
import { fetchCountriesApi } from '../../api/endpoints/countriesApi';
import FirebaseRecaptchaVerifierModal from '../../components/auth/FirebaseRecaptchaVerifierModal';

export default function PhoneAuthScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { onboardingData } = useOnboarding();
    const recaptchaVerifier = useRef(null);
    
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [countryData, setCountryData] = useState([
        { id: 'BR', name: 'Brasil', code: '+55', flag: 'https://flagcdn.com/w80/br.png' },
        { id: 'PT', name: 'Portugal', code: '+351', flag: 'https://flagcdn.com/w80/pt.png' },
        { id: 'US', name: 'Estados Unidos', code: '+1', flag: 'https://flagcdn.com/w80/us.png' },
        { id: 'ES', name: 'Espanha', code: '+34', flag: 'https://flagcdn.com/w80/es.png' },
        { id: 'GB', name: 'Reino Unido', code: '+44', flag: 'https://flagcdn.com/w80/gb.png' },
        { id: 'AO', name: 'Angola', code: '+244', flag: 'https://flagcdn.com/w80/ao.png' },
        { id: 'MZ', name: 'Moçambique', code: '+258', flag: 'https://flagcdn.com/w80/mz.png' },
    ]);
    const [countryCode, setCountryCode] = useState('+55');
    const [selectedCountry, setSelectedCountry] = useState({
        name: 'Brasil',
        code: '+55',
        flag: 'https://flagcdn.com/w80/br.png'
    });
    const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // API paises
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                console.log("Iniciando busca na REST Countries API...");
                const data = await fetchCountriesApi();
                
                if (data && Array.isArray(data)) {
                    const priorityCodes = ['BR', 'PT', 'US', 'ES', 'GB', 'AO', 'MZ'];
                    
                    const formattedCountries = data
                        .filter(item => item.idd && item.idd.root)
                        .map(item => {
                            const root = item.idd.root;
                            const suffix = item.idd.suffixes && item.idd.suffixes.length === 1 ? item.idd.suffixes[0] : '';
                            const ddi = `${root}${suffix}`;
                            
                            return {
                                id: item.cca2,
                                name: item.translations?.por?.common || item.name.common,
                                code: ddi,
                                flag: item.flags.png
                            };
                        })
                        .filter(item => item.code.length > 1)
                        .sort((a, b) => {
                            const scoreA = priorityCodes.indexOf(a.id);
                            const scoreB = priorityCodes.indexOf(b.id);
                            
                            if (scoreA !== -1 && scoreB !== -1) return scoreA - scoreB;
                            if (scoreA !== -1) return -1;
                            if (scoreB !== -1) return 1;
                            return a.name.localeCompare(b.name);
                        });
                    
                    setCountryData(formattedCountries);
                    console.log("REST Countries carregada com sucesso.");
                } else {
                    console.warn("REST Countries API não retornou uma lista válida. Mantendo lista de países padrão.");
                }
                setLoadingCountries(false);
            } catch (error) {
                console.error("Erro ao carregar REST Countries API:", error);
                setLoadingCountries(false);
            }
        };
        fetchCountries();
    }, []);

    const filteredCountries = countryData.filter(country => 
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.includes(searchQuery)
    );

    const formatPhoneNumber = (text) => {
        const cleaned = text.replace(/\D/g, '');
        
        const truncated = cleaned.slice(0, 11);
        
        if (truncated.length > 10) {
            return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
        } else if (truncated.length > 2) {
            return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
        } else if (truncated.length > 0) {
            return `(${truncated}`;
        }
        return truncated;
    };

    const handlePhoneChange = (text) => {
        const formatted = formatPhoneNumber(text);
        setPhoneNumber(formatted);
    };

    const handleFirebaseSocialLogin = async (credential) => {
        try {
            const result = await signInWithCredential(auth, credential);
            if (result.user) {
                const userRef = doc(db, "users", result.user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        name: result.user.displayName || "Usuário",
                        email: result.user.email || "",
                        onboarding: onboardingData,
                        createdAt: serverTimestamp(),
                        provider: 'phone'
                    });
                }
            }
        } catch (error) {
            console.error("Erro no login com telefone:", error);
            Alert.alert("Erro", "Ocorreu um problema ao vincular sua conta.");
        }
    };

    const handleSendVerificationCode = async () => {
        if (!phoneNumber) {
            Alert.alert("Erro", "Por favor, insira um número de telefone.");
            return;
        }

        if (Platform.OS === 'web') {
            Alert.alert("Aviso", "A autenticação por telefone no Web requer configuração adicional. Use o app mobile para testar este fluxo.");
            return;
        }

        setLoading(true);
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
            
            if (!recaptchaVerifier.current) {
                Alert.alert("Erro de Sistema", "O Verificador de segurança reCAPTCHA não pôde ser inicializado. Reinicie o aplicativo.");
                setLoading(false);
                return;
            }

            const id = await phoneProvider.verifyPhoneNumber(
                fullPhoneNumber,
                recaptchaVerifier.current
            );
            setVerificationId(id);
            console.log("Código enviado com sucesso. ID:", id);
            Alert.alert("Sucesso", "Código de verificação enviado!");
        } catch (err) {
            console.error("Erro completo do Firebase Phone Auth:", err);
            let errorMessage = err.message;
            if (err.code === 'auth/network-request-failed') {
                errorMessage = "Erro de rede. Verifique se o seu celular tem internet e se as chaves do Firebase estão corretas.";
            } else if (err.code === 'auth/invalid-phone-number') {
                errorMessage = "Número de telefone inválido. Verifique o formato.";
            } else if (err.code === 'auth/billing-not-enabled') {
                errorMessage = "O envio de SMS exige o plano Blaze (faturamento ativo) no Firebase. Para testar gratuitamente em desenvolvimento, adicione seu número de telefone e um código fixo nas configurações de números de teste no Console do Firebase (Authentication > Sign-in method > Phone).";
            }
            Alert.alert("Erro", `Não foi possível enviar o código: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmVerificationCode = async () => {
        if (!verificationCode) {
            Alert.alert("Erro", "Por favor, insira o código recebido.");
            return;
        }

        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            );
            await handleFirebaseSocialLogin(credential);
        } catch (err) {
            Alert.alert("Erro", "Código de verificação inválido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.goBack()}
                >
                    <FontAwesome name="chevron-left" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>
                        {!verificationId ? 'Seu Telefone' : 'Confirmar Código'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {!verificationId 
                            ? 'Insira seu número com DDD para receber o código de acesso.' 
                            : `Enviamos um SMS para ${phoneNumber}`}
                    </Text>
                </View>

                <View style={styles.form}>
                    {!verificationId ? (
                        <>
                            <View style={styles.phoneInputRow}>
                                <TouchableOpacity 
                                    style={styles.countryPicker}
                                    onPress={() => setIsCountryModalVisible(true)}
                                >
                                    {selectedCountry.flag.startsWith('http') ? (
                                        <Image 
                                            source={{ 
                                                uri: selectedCountry.flag,
                                                cache: 'force-cache'
                                            }} 
                                            style={styles.flagImage} 
                                        />
                                    ) : (
                                        <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                                    )}
                                    <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                                    <FontAwesome name="chevron-down" size={12} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                                <View style={styles.phoneInputContainer}>
                                    <Input
                                        placeholder="(11) 99999-9999"
                                        value={phoneNumber}
                                        onChangeText={handlePhoneChange}
                                        keyboardType="phone-pad"
                                        autoFocus
                                    />
                                </View>
                            </View>
                            <Button 
                                title={loading ? "" : "Enviar Código"} 
                                onPress={handleSendVerificationCode}
                                disabled={loading}
                            >
                                {loading && <ActivityIndicator color="#FFF" />}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Input
                                placeholder="000000"
                                value={verificationCode}
                                onChangeText={setVerificationCode}
                                keyboardType="number-pad"
                                autoFocus
                            />
                            <Button 
                                title={loading ? "" : "Confirmar e Entrar"} 
                                onPress={handleConfirmVerificationCode}
                                disabled={loading}
                            >
                                {loading && <ActivityIndicator color="#FFF" />}
                            </Button>
                            
                            <TouchableOpacity 
                                onPress={() => setVerificationId('')}
                                style={styles.resendContainer}
                            >
                                <Text style={styles.resendText}>Alterar número de telefone</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {Platform.OS !== 'web' && (
                    <FirebaseRecaptchaVerifierModal
                        ref={recaptchaVerifier}
                        firebaseConfig={auth.app.options}
                    />
                )}

                <Modal
                    visible={isCountryModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsCountryModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.countryModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Selecione seu país</Text>
                                <TouchableOpacity onPress={() => {
                                    setIsCountryModalVisible(false);
                                    setSearchQuery('');
                                }}>
                                    <FontAwesome name="close" size={24} color={theme.colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <Input
                                placeholder="Buscar país ou código..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />

                            {loadingCountries && searchQuery === '' && (
                                <ActivityIndicator style={{ marginVertical: 20 }} color={theme.colors.primary} />
                            )}

                            <FlatList
                                data={filteredCountries}
                                keyExtractor={(item) => item.id}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === 'android'}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.countryItem}
                                        onPress={() => {
                                            setSelectedCountry(item);
                                            setCountryCode(item.code);
                                            setIsCountryModalVisible(false);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <Image 
                                            source={{ 
                                                uri: item.flag,
                                                cache: 'force-cache'
                                            }} 
                                            style={styles.itemFlagImage}
                                            resizeMode="contain"
                                        />
                                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.itemCode}>{item.code}</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Nenhum país encontrado</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        lineHeight: 24,
    },
    form: {
        width: '100%',
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
    },
    countryPicker: {
        height: 56,
        paddingHorizontal: 12,
        backgroundColor: '#E5E5E5',
        borderRadius: theme.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countryFlag: {
        fontSize: 20,
    },
    flagImage: {
        width: 32,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#F3F4F6', 
    },
    itemFlagImage: {
        width: 32,
        height: 20,
        borderRadius: 4,
        marginRight: 16,
        backgroundColor: '#F3F4F6',
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    phoneInputContainer: {
        flex: 1,
    },
    resendContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    resendText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    countryModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemFlag: {
        fontSize: 24,
        marginRight: 16,
    },
    itemName: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    itemCode: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
});
