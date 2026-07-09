import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';

const MissionsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const completeMission = async (points) => {
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                xp: increment(points),
                xpDiario: increment(points),
                xpMensal: increment(points)
            });
            alert(`Missão concluída! Você ganhou +${points} XP`);
            navigation.goBack();
        } catch (error) {
            console.error("Erro ao completar missão: ", error);
            alert("Erro ao validar missão. Tente novamente!");
        }
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Missões Diárias</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>Complete tarefas para subir no Rank!</Text>
                
                <TouchableOpacity style={styles.missionCard} onPress={() => completeMission(50)}>
                    <View style={styles.missionIcon}>
                        <Ionicons name="wallet" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.missionInfo}>
                        <Text style={styles.missionTitle}>Adicionar 3 Transações</Text>
                        <Text style={styles.missionDesc}>Registre seus gastos de hoje.</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+50 XP</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.missionCard} onPress={() => completeMission(100)}>
                    <View style={styles.missionIcon}>
                        <Ionicons name="book" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.missionInfo}>
                        <Text style={styles.missionTitle}>Ler 1 Artigo</Text>
                        <Text style={styles.missionDesc}>Aprenda algo novo sobre finanças.</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+100 XP</Text>
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.missionCard} onPress={() => completeMission(200)}>
                    <View style={styles.missionIcon}>
                        <Ionicons name="rocket" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.missionInfo}>
                        <Text style={styles.missionTitle}>Criar uma Meta</Text>
                        <Text style={styles.missionDesc}>Planeje seu futuro em investimentos.</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+200 XP</Text>
                    </View>
                </TouchableOpacity>

                <Text style={styles.hint}>* As simulações acima vão conceder XP real a sua conta para testes!</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: theme.fontSizes.xl,
        fontFamily: theme.fonts.title,
        color: theme.colors.textPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    subtitle: {
        fontSize: theme.fontSizes.md,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    missionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing.md,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        elevation: 2,
    },
    missionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    missionInfo: {
        flex: 1,
    },
    missionTitle: {
        fontSize: theme.fontSizes.md,
        fontFamily: theme.fonts.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    missionDesc: {
        fontSize: theme.fontSizes.sm,
        fontFamily: theme.fonts.regular,
        color: theme.colors.textSecondary,
    },
    pointsBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    pointsText: {
        color: '#FFFFFF',
        fontFamily: theme.fonts.bold,
        fontSize: 12,
    },
    hint: {
        marginTop: theme.spacing.xl,
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});

export default MissionsScreen;