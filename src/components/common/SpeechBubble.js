import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme/theme';

const SpeechBubble = ({ children, style, textStyle }) => {
    return (
        <View style={[styles.bubbleContainer, style]}>
            <View style={styles.triangleContainer}>
                <View style={styles.triangleBorder} />
                <View style={styles.triangleInner} />
            </View>
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
    triangleContainer: {
        width: 20,
        height: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        // Position it slightly overlapping the bubble border to look seamless
        marginBottom: -1,
        zIndex: 1,
    },
    triangleBorder: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#E5E7EB', // Neutral light gray border
    },
    triangleInner: {
        position: 'absolute',
        bottom: -1, // Sits exactly on the bubble border to cut through it
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: 9,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFFFFF', // Matches bubble background color
    },
    bubble: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 15,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        justifyContent: 'center',
        // Soft shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    bubbleText: {
        fontFamily: theme.fonts?.regular || 'System',
        fontSize: theme.fontSizes?.lg || 18,
        color: theme.colors.textPrimary || '#111827', // Neutral dark gray/black text
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default SpeechBubble;
