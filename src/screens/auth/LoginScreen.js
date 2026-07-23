import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { auth, db, app } from '../../services/firebaseConfig';
import {
    useCreateUserWithEmailAndPassword,
    useSignInWithEmailAndPassword
} from "react-firebase-hooks/auth";
import {
    updateProfile,
    GoogleAuthProvider,
    signInWithCredential,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useOnboarding } from '../../hooks/useOnboarding';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { fetchGoogleUserInfo } from '../../api/endpoints/authApi';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { onboardingData } = useOnboarding();
    const [isLogin, setIsLogin] = useState(() => {
        if (route.params?.mode === 'signup') {
            return false;
        }
        return true;
    });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (route.params?.mode === 'signup') {
            setIsLogin(false);
        } else if (route.params?.mode === 'login') {
            setIsLogin(true);
        }
    }, [route.params?.mode]);

    // Detecta se está rodando no aplicativo Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    // Selecionar o client ID correto baseado na plataforma e no ambiente (Expo Go vs APK Nativo)
    const getClientId = () => {
        if (isExpoGo) {
            // No Expo Go, precisamos usar obrigatoriamente o Web Client ID para todas as plataformas
            return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        }
        if (Platform.OS === 'web') {
            return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        } else if (Platform.OS === 'android') {
            return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
        }
        return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    };

    const [request, response, promptAsync] = Google.useAuthRequest(
        {
            clientId: getClientId(),
            // IMPORTANTE: Evitamos passar androidClientId no Expo Go.
            // Se passarmos, a biblioteca expo-auth-session ignora o clientId e força o ID Android nativo,
            // o que causa rejeição do Google por incompatibilidade de pacote (Expo Go vs com.example.finan).
            androidClientId: isExpoGo ? undefined : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            // No Expo Go, usamos a string direta para que o Google receba a URL HTTPS correta.
            // No APK final (APK), usamos o makeRedirectUri tradicional com o esquema finan:// nativo.
            redirectUri: isExpoGo 
                ? 'https://auth.expo.io/@felipetaua/FINAN' 
                : makeRedirectUri({ scheme: 'finan' }),
        },
        // Segundo argumento: Opções do provedor de autenticação (necessário para o Proxy funcionar no Expo Go)
        isExpoGo ? { useProxy: true, projectNameForProxy: '@felipetaua/FINAN' } : undefined
    );

    useEffect(() => {
        if (request) {
            console.log("URI de redirecionamento sendo usada:", request.redirectUri);
            console.log("Plataforma:", Platform.OS);
            console.log("Client ID selecionado:", getClientId());
            console.log("Web Client ID:", process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
            console.log("Android Client ID:", process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
        }
    }, [request]);

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            const accessToken = authentication?.accessToken;

            console.log("Login Google sucesso!");
            console.log("Access Token recebido:", !!accessToken);

            if (accessToken) {
                // Usar o accessToken para obter informações do usuário do Google
                fetchGoogleUserInfoHandler(accessToken);
            } else {
                console.error("AccessToken não encontrado na resposta do Google:", response);
                Alert.alert("Erro", "Não foi possível extrair o token do Google. Tente novamente.");
            }
        } else if (response?.type === 'error') {
            console.error("Erro no AuthSession:", response.error);
            Alert.alert("Erro de Login", `${response.error?.message || 'Erro ao conectar com Google'}`);
        } else if (response?.type === 'dismiss') {
            console.log("Usuário cancelou o login do Google");
        }
    }, [response]);

    const fetchGoogleUserInfoHandler = async (token) => {
        try {
            const userInfo = await fetchGoogleUserInfo(token);
            console.log("Informações do usuário obtidas com sucesso do Google!");
            await handleFirebaseSocialLogin('google', userInfo);
        } catch (error) {
            console.error("Erro ao obter dados do usuário do Google:", error);
            Alert.alert("Erro", "Não foi possível obter os dados do seu perfil do Google.");
        }
    };

    const handleFirebaseSocialLogin = async (type, userInfo) => {
        try {
            const email = userInfo.email;
            const name = userInfo.name;
            const photoUrl = userInfo.picture;
            const providerId = userInfo.id;

            // Criar credencial de autenticação
            const credential = GoogleAuthProvider.credential(null, userInfo.idToken);
            
            // Tentar login com o Firebase usando o token de acesso obtido
            const credentialGoogle = GoogleAuthProvider.credential(null, tokenGoogleFix(userInfo, response));
            const userCredential = await signInWithCredential(auth, credentialGoogle);
            const user = userCredential.user;

            console.log("Firebase login social efetuado:", user.uid);

            // Verificar se o documento do usuário já existe no Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                console.log("Criando novo documento do usuário pós login social...");
                // Se for novo usuário, salvar os dados iniciais
                await setDoc(userDocRef, {
                    name: name || user.displayName || 'Usuário Finan',
                    email: email || user.email,
                    photoUrl: photoUrl || user.photoURL || '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isPremium: false,
                    onboardingCompleted: false
                });
            }

            // Seguir fluxo de Onboarding ou Home
            checkOnboardingAndNavigate(user.uid);
        } catch (error) {
            console.error(`Erro no login com ${type}:`, error);
            Alert.alert("Erro", "Ocorreu um problema ao vincular sua conta.");
        }
    };

    // Helper para extrair credenciais corretas do Firebase
    const tokenGoogleFix = (userInfo, resp) => {
        // Se viemos do AuthSession, usamos o idToken ou a credencial implícita
        return resp?.authentication?.idToken || resp?.authentication?.accessToken;
    };

    const handleSocialLogin = async (type) => {
        console.log("handleSocialLogin chamado com tipo:", type);
        if (type === 'google') {
            try {
                console.log("Iniciando promptAsync do Google nativo...");
                const result = await promptAsync();
                console.log("Resultado promptAsync Google:", result?.type);
            } catch (error) {
                console.error("Erro ao abrir login do Google:", error);
                Alert.alert("Erro", "Não foi possível abrir o login do Google.");
            }
        } else if (type === 'phone') {
            navigation.navigate('PhoneAuth');
        }
    };

    const [
        createUserWithEmailAndPassword,
        userCreate,
        loadingCreate,
        errorCreate,
    ] = useCreateUserWithEmailAndPassword(auth);

    const [
        signInWithEmailAndPassword,
        userSignIn,
        loadingSignIn,
        errorSignIn,
    ] = useSignInWithEmailAndPassword(auth);

    const handleContinue = async () => {
        console.log("handleContinue chamado. isLogin:", isLogin);
        if (!email || !password) {
            console.log("Email ou senha vazios");
            Alert.alert("Erro", "Por favor, preencha email e senha.");
            return;
        }

        if (!isLogin && !name) {
            console.log("Nome vazio no cadastro");
            Alert.alert("Erro", "Por favor, preencha seu nome.");
            return;
        }

        try {
            if (!isLogin) {
                console.log("Tentando criar usuário com email:", email);
                const result = await createUserWithEmailAndPassword(email, password);
                console.log("Resultado createUser:", result ? "Objeto recebido" : "Undefined/Null");

                if (result && result.user) {
                    console.log("Usuário criado. Atualizando perfil com nome:", name);
                    await updateProfile(result.user, { displayName: name });

                    console.log("Perfil atualizado. Salvando no Firestore...");
                    const userRef = doc(db, "users", result.user.uid);
                    await setDoc(userRef, {
                        name: name,
                        email: email,
                        onboarding: onboardingData || {},
                        plan: 'Gratuito',
                        xp: 0,
                        xpDiario: 0,
                        xpMensal: 0,
                        lastResetDiario: "",
                        lastResetMensal: "",
                        level: 1,
                        createdAt: serverTimestamp()
                    });
                    console.log("Firestore OK. O listener onAuthStateChanged deve disparar.");
                } else {
                    console.log("CreateUser não retornou usuário (pode ter falhado silenciosamente ou erro já capturado pelo hook)");
                }
            } else {
                console.log("Tentando fazer login com email:", email);
                const result = await signInWithEmailAndPassword(email, password);
                console.log("Resultado signIn:", result ? "Objeto recebido" : "Undefined/Null");
                if (result) {
                    console.log("Login OK. O listener onAuthStateChanged deve disparar.");
                }
            }
        } catch (error) {
            console.error("Erro no handleContinue:", error);
            Alert.alert("Erro de Autenticação", error.message || "Não foi possível realizar a operação.");
        }
    };

    const isLoading = loadingCreate || loadingSignIn;

    const getAuthErrorMessage = () => {
        const error = isLogin ? errorSignIn : errorCreate;
        if (!error) return null;

        const code = error.code || '';

        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            return 'Senha incorreta. Tente novamente.';
        }
        if (code === 'auth/user-not-found') {
            return 'Conta não encontrada para este email.';
        }
        if (code === 'auth/invalid-email') {
            return 'Email inválido.';
        }
        if (code === 'auth/email-already-in-use') {
            return 'Este email já está em uso.';
        }
        if (code === 'auth/weak-password') {
            return 'A senha precisa ter pelo menos 6 caracteres.';
        }

        return 'Não foi possível autenticar. Verifique os dados e tente novamente.';
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.logo}>Finan</Text>
                    <Text style={styles.title}>{isLogin ? 'Bem-vindo!' : 'Comece agora'}</Text>
                    <Text style={styles.helperText}>
                        {isLogin ? 'Entre para continuar cuidando das suas finanças' : 'Crie sua conta e tenha o controle total'}
                    </Text>
                </View>

                <View style={styles.toggleWrapper}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                        onPress={() => setIsLogin(true)}
                    >
                        <Text style={[styles.toggleBtnText, isLogin && styles.toggleBtnTextActive]}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                        onPress={() => setIsLogin(false)}
                    >
                        <Text style={[styles.toggleBtnText, !isLogin && styles.toggleBtnTextActive]}>Criar conta</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <Input
                            placeholder="Nome Completo"
                            value={name}
                            onChangeText={setName}
                        />
                    )}
                    <Input
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                    />
                    <Input
                        placeholder="Senha"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        rightIcon={
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={theme.colors.textSecondary}
                            />
                        }
                        onRightIconPress={() => setShowPassword((prev) => !prev)}
                    />

                    {errorCreate || errorSignIn ? (
                        <Text style={styles.errorText}>
                            {getAuthErrorMessage()}
                        </Text>
                    ) : null}

                    <Button
                        title={isLogin ? "Entrar" : "Cadastrar"}
                        onPress={handleContinue}
                        isLoading={isLoading}
                    />
                </View>

                <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>ou</Text>
                    <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialButtons}>
                    <Button
                        title="Continue com Google"
                        type="outline"
                        onPress={() => handleSocialLogin('google')}
                        icon={<FontAwesome name="google" size={20} color="#EA4335" />}
                    />
                    <Button
                        title="Entrar com Telefone"
                        type="outline"
                        onPress={() => handleSocialLogin('phone')}
                        icon={<FontAwesome name="phone" size={20} color={theme.colors.primary} />}
                    />
                </View>

                <TouchableOpacity style={styles.helpLink}>
                    <Text style={styles.helpText}>Precisa de Ajuda para criar conta?</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Ao se cadastrar, você está criando uma conta no Finan e concorda com os{' '}
                        <Text style={styles.footerLink}>Termos</Text> e a{' '}
                        <Text style={styles.footerLink}>Política de Privacidade</Text> do Finan.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    container: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 30,
    },
    logo: {
        fontFamily: theme.fonts.title,
        fontSize: 48,
        color: theme.colors.primary,
        marginBottom: 10,
    },
    title: {
        fontSize: theme.fontSizes.xl,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    helperText: {
        fontSize: theme.fontSizes.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        width: '100%',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
            }
        })
    },
    toggleBtnText: {
        fontSize: theme.fontSizes.sm,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    toggleBtnTextActive: {
        color: theme.colors.primary,
    },
    form: {
        width: '100%',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.fontSizes.sm,
        marginBottom: 10,
        textAlign: 'center',
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
        width: '100%',
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    separatorText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSizes.md,
        marginHorizontal: 10,
    },
    socialButtons: {
        width: '100%',
        marginTop: 10,
    },
    helpLink: {
        marginTop: 20,
        marginBottom: 40,
    },
    helpText: {
        color: theme.colors.primary,
        fontSize: theme.fontSizes.md,
        fontWeight: '600',
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9CA3AF',
        lineHeight: 18,
    },
    footerLink: {
        color: theme.colors.primary,
    },
});
