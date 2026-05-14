import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const TrailNode = ({ node, onPress }) => {
    const isLocked = node.status === 'locked';
    const isCurrent = node.status === 'current';
    
    return (
        <View style={[styles.nodeContainer, { marginLeft: node.position }]}>
            {isCurrent && (
                <View style={styles.startBadge}>
                    <Text style={styles.startText}>INICIAR</Text>
                    <View style={styles.startArrow} />
                </View>
            )}
            <TouchableOpacity
                onPress={() => !isLocked && onPress && onPress(node)}
                disabled={isLocked}
                activeOpacity={0.7}
                style={[
                    styles.node,
                    { backgroundColor: node.color },
                    Platform.select({
                        ios: { shadowColor: node.color || '#E5E5E5' },
                        android: { elevation: 6 },
                        web: { boxShadow: `0px 6px 0px ${node.color || '#E5E5E5'}` }
                    }),
                    isLocked && styles.lockedNode
                ]}
            >
                {node.type === 'star' ? (
                    <FontAwesome6 name="star" size={24} color="white" />
                ) : (
                    <MaterialCommunityIcons name={node.icon} size={28} color={isLocked ? '#AFAFAF' : 'white'} />
                )}
            </TouchableOpacity>
            {!isLocked && node.status === 'completed' && (
                <View style={styles.starsRow}>
                    <FontAwesome6 name="star" size={10} color="#FFC800" />
                    <FontAwesome6 name="star" size={10} color="#FFC800" />
                    <FontAwesome6 name="star" size={10} color="#FFC800" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    nodeContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    node: {
        width: 70,
        height: 65,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 0,
            },
        })
    },
    lockedNode: {
        backgroundColor: '#E5E5E5',
        ...Platform.select({
            ios: { shadowColor: '#AFAFAF' },
            web: { boxShadow: '0px 6px 0px #AFAFAF' }
        })
    },
    startBadge: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md - 4,
        paddingVertical: theme.spacing.sm - 2,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        marginBottom: theme.spacing.sm,
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.1)',
            }
        })
    },
    startText: {
        color: theme.colors.primary,
        fontWeight: theme.fontWeights.bold,
        fontSize: theme.fontSizes.xs,
        fontFamily: theme.fonts.bold,
    },
    startArrow: {
        position: 'absolute',
        bottom: -8,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderLeftColor: 'transparent',
        borderRightWidth: 6,
        borderRightColor: 'transparent',
        borderTopWidth: 8,
        borderTopColor: '#E5E5E5',
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: theme.spacing.xs,
    }
});

export default TrailNode;
