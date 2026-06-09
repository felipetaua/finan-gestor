import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';

export default function WelcomeScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/images/splashart.png')}
                style={styles.imageScreen}
                resizeMode="contain"
            />
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.primary }]}>
                    Planejamento Financeiro que muda vidas.
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Com um planejamento eficiente mude sua vida para melhor, tenha liberdade e qualidade de vida.
                </Text>

                <Button
                    onPress={() => navigation.navigate('StepScreen1')} 
                    title="Iniciar" 
                    type='primary'
                />
                <Button
                    onPress={() => navigation.navigate('Login', { mode: 'login' })} 
                    title="Já possuo conta" 
                    type='secondary'
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
    },
    imageScreen: {
        width: 600, 
        height: "45%",
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingBottom: 25,
    },
    title: {
        fontFamily: theme.fonts.title,
        fontSize: theme.fontSizes.xxxl,
        textAlign: 'left',
        marginBottom: 16,
        lineHeight: 50,
    },
    subtitle: {
        fontFamily: theme.fonts.regular,
        fontSize: theme.fontSizes.md,
        textAlign: 'left',
        marginBottom: 24,
        lineHeight: 24,
    },
});
