import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const { width: screenWidth } = Dimensions.get('window');

const TrailNode = ({ node, onPress }) => {
    const [isPressed, setIsPressed] = useState(false);
    const isLocked = node.status === 'locked';
    const isCurrent = node.status === 'current';

    const getDecorationSide = () => {
        const charCodeSum = node.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const side = charCodeSum % 2 === 0 ? 'left' : 'right';
        
        const decoTypes = [
            // Natureza / Matos / Árvores
            { icon: 'tree-outline', color: '#047857', bg: '#E6F4EA' }, 
            { icon: 'sprout-outline', color: '#059669', bg: '#D1FAE5' }, 
            { icon: 'leaf', color: '#10B981', bg: '#ECFDF5' }, 
            { icon: 'flower-outline', color: '#DB2777', bg: '#FCE7F3' },

            // Plaquinhas e Orientação
            { icon: 'signpost-variant-outline', color: '#78350F', bg: '#FEF3C7' }, 
            { icon: 'map-outline', color: '#B45309', bg: '#FFFBEB' }, 

            // Casas e Estruturas
            { icon: 'home-outline', color: '#3B82F6', bg: '#E0F2FE' }, 
            { icon: 'bank-outline', color: '#1E3A8A', bg: '#DBEAFE' }, 
            { icon: 'store-outline', color: '#8B5CF6', bg: '#F3E8FF' },

            // Recompensas e Conquistas
            { icon: 'piggy-bank-outline', color: '#EC4899', bg: '#FCE7F3' },
            { icon: 'rocket-launch-outline', color: '#4F46E5', bg: '#EEF2FF' },
            { icon: 'cash-multiple', color: '#10B981', bg: '#D1FAE5' },
            { icon: 'shield-check-outline', color: '#0284C7', bg: '#E0F2FE' },
            { icon: 'trophy-outline', color: '#F59E0B', bg: '#FEF3C7' },
            { icon: 'treasure-chest', color: '#D97706', bg: '#FFFBEB' } 
        ];
        
        const type = decoTypes[charCodeSum % decoTypes.length];
        return { side, ...type };
    };

    const deco = getDecorationSide();
    
    return (
        <View style={[styles.nodeContainer, { marginLeft: node.position }]}>
            {/* Decoration Side Illusts */}
            {deco && deco.side === 'left' && (
                <View style={[styles.decorationContainer, { left: -screenWidth / 2 + 35 - node.position }]} pointerEvents="none">
                    <View style={[styles.decorationCircle, { backgroundColor: deco.bg }]}>
                        <MaterialCommunityIcons name={deco.icon} size={22} color={deco.color} />
                    </View>
                </View>
            )}
            
            {deco && deco.side === 'right' && (
                <View style={[styles.decorationContainer, { right: -screenWidth / 2 + 35 + node.position }]} pointerEvents="none">
                    <View style={[styles.decorationCircle, { backgroundColor: deco.bg }]}>
                        <MaterialCommunityIcons name={deco.icon} size={22} color={deco.color} />
                    </View>
                </View>
            )}

            {isCurrent && (
                <View style={styles.startBadge}>
                    <Text style={styles.startText}>INICIAR</Text>
                    <View style={styles.startArrow} />
                </View>
            )}

            {/* Apenas para o nó atual, adicionamos um contorno externo destacado */}
            <View style={isCurrent ? styles.currentOuterRing : styles.normalWrapper}>
                <Pressable
                    onPressIn={() => !isLocked && setIsPressed(true)}
                    onPressOut={() => setIsPressed(false)}
                    onPress={() => !isLocked && onPress && onPress(node)}
                    disabled={isLocked}
                    style={[
                        styles.node,
                        { 
                            backgroundColor: isLocked ? '#E5E5E5' : node.color,
                            borderBottomWidth: isLocked ? 5 : (isPressed ? 1 : 6),
                            borderBottomColor: 'rgba(0, 0, 0, 0.20)', // Mescla perfeita para base 3D
                            marginTop: isPressed ? 5 : 0,
                            marginBottom: isPressed ? 0 : 5,
                        },
                        isLocked && styles.lockedNode
                    ]}
                >
                    {/* Círculo interno rebaixado com mescla suave de cor */}
                    <View style={styles.innerRecess}>
                        {node.type === 'star' ? (
                            <FontAwesome6 name="star" size={24} color="white" style={styles.iconShadow} />
                        ) : (
                            <MaterialCommunityIcons name={node.icon} size={28} color={isLocked ? '#9E9E9E' : 'white'} style={styles.iconShadow} />
                        )}
                    </View>
                </Pressable>
            </View>

            {!isLocked && node.status === 'completed' && (() => {
                const charCodeSum = node.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                const starCount = (charCodeSum % 2) + 2; // 2 ou 3 estrelas para variedade real
                return (
                    <View style={styles.starsRow}>
                        <MaterialCommunityIcons 
                            name="star" 
                            size={12} 
                            color={starCount >= 1 ? "#FFC800" : "#E2E8F0"} 
                            style={starCount >= 1 ? styles.starGlow : null} 
                        />
                        <MaterialCommunityIcons 
                            name="star" 
                            size={17} 
                            color={starCount >= 2 ? "#FFC800" : "#E2E8F0"} 
                            style={[starCount >= 2 ? styles.starGlow : null, { marginHorizontal: 2 }]} 
                        />
                        <MaterialCommunityIcons 
                            name="star" 
                            size={12} 
                            color={starCount >= 3 ? "#FFC800" : "#E2E8F0"} 
                            style={starCount >= 3 ? styles.starGlow : null} 
                        />
                    </View>
                );
            })()}
        </View>
    );
};

const styles = StyleSheet.create({
    nodeContainer: {
        alignItems: 'center',
        marginBottom: 25,
        position: 'relative',
        width: 96,
        height: 120,
        justifyContent: 'center',
    },
    normalWrapper: {
        width: 96,
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
    },
    node: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockedNode: {
        backgroundColor: '#E5E5E5',
    },
    currentOuterRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: '#1CB0F6',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorationContainer: {
        position: 'absolute',
        top: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorationCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
            web: {
                boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.08)',
            }
        })
    },
    startBadge: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md - 4,
        paddingVertical: theme.spacing.sm - 2,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        position: 'absolute',
        top: -24,
        alignSelf: 'center',
        zIndex: 10,
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
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
    },
    starGlow: {
        textShadowColor: 'rgba(255, 200, 0, 0.85)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#FFC800',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 4,
            }
        })
    },
    innerRecess: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 0, 0, 0.08)', // Borda escura sutil
        backgroundColor: 'rgba(0, 0, 0, 0.12)', // Overlay translúcido de rebaixo
    },
    iconShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 3,
    },
});

export default TrailNode;
