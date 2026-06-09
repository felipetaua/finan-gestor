import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme/theme';

const SpeechBubble = ({ children, style, textStyle }) => {
    return (
        <View style={[styles.bubbleContainer, style]}>
            <View style={styles.triangle} />
            <View style={styles.bubble}>
                {typeof children === 'string' ? (
                    <Text style={[styles.bubbleText, textStyle]}>{children}</Text>
                ) : (
                    children
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bubbleContainer: {
        alignItems: 'center',
        marginVertical: 15,
        width: '100%',
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#E6F0FF', // palette.blue.100 light blue background
    },
    bubble: {
        backgroundColor: '#E6F0FF', // palette.blue.100 equivalent
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 15,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        justifyContent: 'center',
        // Slight shadow for a premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bubbleText: {
        fontFamily: theme.fonts?.title || 'System',
        fontSize: theme.fontSizes?.lg || 18,
        color: '#1E4FD8', // palette.blue.700 (primaryDark) for contrast and readability
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default SpeechBubble;
