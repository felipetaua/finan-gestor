import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { db, auth } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const { height } = Dimensions.get('window');

const AiAddTransactionScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation for the border
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(borderAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: false,
                }),
                Animated.timing(borderAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, [borderAnim]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#4A90E2', '#8B5CF6', '#EC4899'] // Transitioning colors: Blue -> Purple -> Pink
    });

    const handleSave = async () => {
        if (!prompt.trim()) {
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Erro', 'Usuário não autenticado.');
            return;
        }

        setLoading(true);
        try {
            // Save the raw text for AI processing later
            await addDoc(collection(db, "ai_transactions_queue"), {
                userId: user.uid,
                prompt: prompt.trim(),
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            navigation.goBack();
            setTimeout(() => {
                Alert.alert('Sucesso', 'Sua transação será processada pela IA em breve.');
            }, 500);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            Alert.alert("Erro", "Não foi possível salvar a anotação.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        >
            <TouchableOpacity 
                style={styles.backdrop} 
                activeOpacity={1} 
                onPress={() => navigation.goBack()} 
            />
            
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.content}>
                    <View style={styles.dragHandle} />
                    
                    <Text style={styles.title}>Adicione Rapidamente</Text>
                    <Text style={styles.subtitle}>
                        Descreva o gasto e nós categorizamos para você.
                    </Text>
                    
                    <Animated.View style={[styles.inputContainer, { borderColor, borderWidth: 1.5 }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Paguei 35 no almoço hoje com VR..."
                            placeholderTextColor="#999"
                            multiline
                            maxLength={250}
                            value={prompt}
                            onChangeText={setPrompt}
                            autoFocus={true}
                        />
                        <TouchableOpacity 
                            style={[
                                styles.sendButton, 
                                !prompt.trim() ? styles.sendButtonDisabled : { backgroundColor: theme.colors.primary || '#4A90E2' }
                            ]}
                            onPress={handleSave}
                            disabled={loading || !prompt.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Ionicons name="arrow-up" size={24} color="#FFF" style={styles.sendIcon} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomSheet: {
        width: '100%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'visible',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#DDD',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F5F5F5',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 56,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingTop: 5,
        paddingBottom: 5,
        paddingRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: -2,
    },
    sendButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    sendIcon: {
        marginLeft: 2,
    }
});

export default AiAddTransactionScreen;