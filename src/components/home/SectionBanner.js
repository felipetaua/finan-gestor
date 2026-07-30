import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const SectionBanner = ({ section = 1, unit = 1, description = '', onPress }) => {
    return (
        <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={onPress}>
            <View style={styles.bannerContent}>
                <Text style={styles.sectionTitle}>SEÇÃO {section}, UNIDADE {unit}</Text>
                <Text style={styles.unitDescription}>{description}</Text>
            </View>
            <View style={styles.notesButton}>
                <MaterialCommunityIcons name="notebook-outline" size={24} color="white" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.md,
        borderRadius: theme.radius.md,
        
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.primaryDark,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: `0px 4px 0px ${theme.colors.primaryDark}`,
            },
            default: {}
        })
    },
    bannerContent: {
        flex: 1,
        paddingBottom: theme.spacing.md,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.sm,    
        paddingTop: theme.spacing.md,
    },
    sectionTitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: theme.fontSizes.xs,
        fontWeight: theme.fontWeights.bold,
        fontFamily: theme.fonts.bold,
        marginBottom: theme.spacing.xs,
    },
    unitDescription: {
        color: theme.colors.surface,
        fontSize: theme.fontSizes.lg - 2,
        fontWeight: theme.fontWeights.bold,
        fontFamily: theme.fonts.bold,
    },
    notesButton: {
        height: "100%",
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md - 4,
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(255, 255, 255, 0.3)',
        marginLeft: theme.spacing.md - 4,
    },
});

export default SectionBanner;
