import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
    Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { generateGeminiResponse } from '../../services/geminiService';

const { width } = Dimensions.get('window');

const POPULAR_TOPICS = [
    { label: 'Plano de Gastos', prompt: 'Gostaria de criar um plano de gastos mensal ideal. Como devo começar a dividir meu salário?' },
    { label: 'Análise de Assinaturas', prompt: 'Como posso analisar minhas assinaturas mensais e decidir quais cancelar ou manter?' },
    { label: 'Meta de Economia', prompt: 'Como posso definir metas de economia realistas para conseguir poupar dinheiro todo mês?' },
    { label: 'Mentalidade Financeira', prompt: 'Dicas para desenvolver uma mentalidade financeira mais saudável e evitar compras por impulso.' },
    { label: 'Orçamento', prompt: 'Qual é o melhor método de orçamento? 50/30/20 ou outro? Me explique resumidamente.' },
    { label: 'Prioridade de Dívidas', prompt: 'Qual a melhor estratégia para pagar dívidas? Devo focar nas menores ou nas de juros mais altos?' },
    { label: 'Avaliação de Compra', prompt: 'O que devo me perguntar antes de fazer uma compra grande para ter certeza de que vale a pena?' },
    { label: 'Planejamento', prompt: 'Como fazer um planejamento financeiro básico para os próximos 6 meses?' },
];

const AiChatScreen = ({ route }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    
    // Obtém o contexto do usuário passado pela tela de finanças
    const { userProfile, financialData } = route.params || {};
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    
    const flatListRef = useRef(null);
    const welcomeFadeAnim = useRef(new Animated.Value(1)).current;
    
    // Auto scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const handleSend = async (textToSend) => {
        const text = textToSend || inputText;
        if (!text.trim() || loading) return;

        // Limpa o campo se veio do input
        if (!textToSend) {
            setInputText('');
        }

        const userMessage = {
            id: Date.now().toString() + '-user',
            text: text.trim(),
            sender: 'user',
            timestamp: new Date()
        };

        // Adiciona mensagem do usuário
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            // Chama a API do Gemini enviando o histórico atual e o contexto
            const responseText = await generateGeminiResponse(text.trim(), messages, userProfile, financialData);
            
            const aiMessage = {
                id: (Date.now() + 1).toString() + '-ai',
                text: responseText,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.warn("Erro ao buscar resposta do Gemini:", error);
            const errorMessage = {
                id: (Date.now() + 1).toString() + '-ai-error',
                text: error.message || 'Desculpe, ocorreu um erro inesperado ao conectar com a IA. Tente novamente mais tarde.',
                sender: 'ai',
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const renderWelcomeLayout = () => {
        return (
            <ScrollView 
                contentContainerStyle={styles.welcomeContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headlineContainer}>
                    <Text style={styles.welcomeText}>
                        A melhor forma de melhorar sua vida{' '}
                        <Text style={styles.welcomeTextHighlight}>financeira</Text>
                    </Text>
                </View>

                <View style={styles.topicsSection}>
                    <Text style={styles.topicsTitle}>Populares para começar</Text>
                    <View style={styles.pillsContainer}>
                        {POPULAR_TOPICS.map((topic, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.pill}
                                activeOpacity={0.7}
                                onPress={() => handleSend(topic.prompt)}
                            >
                                <Text style={styles.pillText}>{topic.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderMessageItem = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
                {!isUser && (
                    <View style={styles.aiAvatar}>
                        <Ionicons name="sparkles" size={14} color="#FFF" />
                    </View>
                )}
                <View 
                    style={[
                        styles.messageBubble, 
                        isUser ? styles.userBubble : styles.aiBubble,
                        item.isError ? styles.errorBubble : null
                    ]}
                >
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { paddingTop: insets.top }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.headerButton} 
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>Finan<Text style={styles.headerTitleSub}>.ia</Text></Text>
                </View>

                <TouchableOpacity 
                    style={styles.headerButton} 
                    activeOpacity={0.7}
                    onPress={() => {
                        // Poderia abrir um histórico ou instruções
                    }}
                >
                    <Ionicons name="document-text-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {messages.length === 0 ? (
                    renderWelcomeLayout()
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderMessageItem}
                        contentContainerStyle={styles.chatListContent}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={
                            loading && (
                                <View style={styles.loadingRow}>
                                    <View style={styles.aiAvatar}>
                                        <Ionicons name="sparkles" size={14} color="#FFF" />
                                    </View>
                                    <View style={[styles.messageBubble, styles.aiBubble]}>
                                        <ActivityIndicator size="small" color="#3b82f6" />
                                    </View>
                                </View>
                            )
                        }
                    />
                )}
            </View>

            {/* Bottom Bar */}
            <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <View style={styles.inputWrapper}>
                    <Ionicons name="sparkles" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Qual sua dúvida"
                        placeholderTextColor="#9CA3AF"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={() => handleSend()}
                        returnKeyType="send"
                        multiline={false}
                        editable={!loading}
                    />
                    {inputText.trim().length > 0 && (
                        <TouchableOpacity 
                            style={styles.sendButton} 
                            onPress={() => handleSend()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-up-circle" size={28} color="#3b82f6" />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.disclaimerText}>
                    Utilize a ferramenta como auxilio. A ferramenta pode conter erros então sempre cheque os resultados.
                </Text>
            </View>
        </KeyboardAvoidingView>
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
        height: 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    headerTitleSub: {
        color: '#60a5fa',
    },
    content: {
        flex: 1,
    },
    // Welcome Layout
    welcomeContainer: {
        paddingHorizontal: 24,
        paddingTop: 36,
        paddingBottom: 24,
    },
    headlineContainer: {
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 26,
        lineHeight: 38,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'left',
    },
    welcomeTextHighlight: {
        color: '#3b82f6',
        fontWeight: '700',
    },
    topicsSection: {
        marginTop: 10,
    },
    topicsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pill: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    pillText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0369A1',
    },
    // Chat List
    chatListContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 16,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        width: '100%',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    aiAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 2,
    },
    messageBubble: {
        maxWidth: width * 0.75,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
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
        }),
    },
    userBubble: {
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: '#F3F4F6',
        borderBottomLeftRadius: 4,
    },
    errorBubble: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#FFF',
    },
    aiText: {
        color: '#1F2937',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
    },
    // Bottom Bar
    bottomContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: '#FFF',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#1F2937',
        fontSize: 15,
        paddingVertical: 8,
    },
    sendButton: {
        paddingLeft: 8,
    },
    disclaimerText: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 14,
    },
});

export default AiChatScreen;
