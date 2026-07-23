import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const FirebaseRecaptchaVerifierModal = forwardRef(({ firebaseConfig, onVerify }, ref) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const resolveRef = useRef(null);
    const rejectRef = useRef(null);

    useImperativeHandle(ref, () => ({
        type: 'recaptcha',
        verify: () => {
            return new Promise((resolve, reject) => {
                resolveRef.current = resolve;
                rejectRef.current = reject;
                setVisible(true);
                setLoading(true);
            });
        },
        _reset: () => {
            console.log("reCAPTCHA verifier _reset chamado pelo Firebase.");
        },
        reset: () => {
            console.log("reCAPTCHA verifier reset chamado.");
        },
        clear: () => {
            console.log("reCAPTCHA verifier clear chamado.");
        }
    }));

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'success' && data.token) {
                setVisible(false);
                if (resolveRef.current) {
                    resolveRef.current(data.token);
                }
                if (onVerify) {
                    onVerify(data.token);
                }
            } else if (data.type === 'error') {
                setVisible(false);
                if (rejectRef.current) {
                    rejectRef.current(new Error(data.message || 'Erro no reCAPTCHA'));
                }
            }
        } catch (err) {
            console.error('Erro ao processar mensagem do reCAPTCHA:', err);
        }
    };

    const handleClose = () => {
        setVisible(false);
        if (rejectRef.current) {
            rejectRef.current(new Error('Cancelado pelo usuário'));
        }
    };

    const authDomain = firebaseConfig?.authDomain;
    const baseUrl = authDomain ? `https://${authDomain}` : 'https://localhost';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #f8f9fa;
                }
                #recaptcha-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
            </style>
            <!-- Carrega o Firebase JS SDK V8 (Compat) -->
            <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
            <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
        </head>
        <body>
            <div id="recaptcha-container"></div>
            
            <script>
                function onVerify(token) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'success',
                        token: token
                    }));
                }
                function onExpired() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: 'O reCAPTCHA expirou'
                    }));
                }
                function onError(error) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: error ? error.message : 'Erro no reCAPTCHA'
                    }));
                }

                try {
                    // Inicializa o Firebase no contexto web
                    firebase.initializeApp(${JSON.stringify(firebaseConfig)});
                    
                    window.onload = function() {
                        var options = {
                            size: 'normal',
                            callback: onVerify,
                            'expired-callback': onExpired,
                            'error-callback': onError
                        };
                        
                        // Cria o verifador oficial do Firebase
                        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', options);
                        
                        verifier.render().then(function(widgetId) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
                        }).catch(onError);
                    };
                } catch (e) {
                    onError(e);
                }
            </script>
        </body>
        </html>
    `;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Verificação de Segurança</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.webviewWrapper}>
                        <WebView
                            source={{ html: htmlContent, baseUrl: baseUrl }}
                            onMessage={handleMessage}
                            onLoadEnd={() => setLoading(false)}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            originWhitelist={['*']}
                            mixedContentMode="always"
                            userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
                            onConsoleMessage={(event) => {
                                console.log('reCAPTCHA WebView Console:', event.nativeEvent.message);
                            }}
                            onError={(event) => {
                                console.error('reCAPTCHA WebView Load Error:', event.nativeEvent);
                            }}
                            style={{ flex: 1 }}
                        />
                        {loading && (
                            <ActivityIndicator 
                                size="large" 
                                color="#3b82f6" 
                                style={styles.loader} 
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        height: '60%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeBtn: {
        padding: 4,
    },
    webviewWrapper: {
        flex: 1,
        position: 'relative',
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default FirebaseRecaptchaVerifierModal;
