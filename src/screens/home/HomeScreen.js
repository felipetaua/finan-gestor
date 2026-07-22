import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { theme } from '../../theme/theme';
import HomeHeader from '../../components/home/HomeHeader';
import SectionBanner from '../../components/home/SectionBanner';
import TrailNode from '../../components/home/TrailNode';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
const trailDataRaw = require('./test.json');

const positions = [0, 40, 70, 30, -20, -60, -80, -40];

const HomeScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const animation = React.useRef(null);
    const [streak, setStreak] = useState(0);
    const [coins, setCoins] = useState(0);
    const [hearts, setHearts] = useState(6);
    const [isPremium, setIsPremium] = useState(false);
    const [nextEnergyTimeStr, setNextEnergyTimeStr] = useState("30:00");
    const [completedUnitIds, setCompletedUnitIds] = useState([]);

    const sectionsData = useMemo(() => {
        const completedSet = new Set(completedUnitIds);
        const orderedUnitIds = trailDataRaw.trilha.secoes.flatMap((secao) => secao.unidades.map((unidade) => unidade.id));
        const firstIncompleteIndex = orderedUnitIds.findIndex((unitId) => !completedSet.has(unitId));
        let globalIndex = 0;

        return trailDataRaw.trilha.secoes.map((secao) => ({
            id: secao.id,
            titulo: secao.titulo,
            unidades: secao.unidades.map((unidade) => {
                const index = globalIndex++;
                const isCompleted = completedSet.has(unidade.id);
                const isCurrent = !isCompleted && index === firstIncompleteIndex;
                const status = isCompleted ? 'completed' : (isCurrent ? 'current' : 'locked');

                let color = '#E5E5E5';
                let icon = 'lock-outline';
                let type = 'icon';

                if (isCompleted) {
                    color = '#22C55E';
                    icon = 'check-bold';
                } else if (isCurrent) {
                    color = '#1CB0F6';
                    icon = 'book-open-page-variant';
                }

                return {
                    id: unidade.id,
                    title: index === 0 ? trailDataRaw.trilha.nome : undefined,
                    description: unidade.titulo,
                    type,
                    color,
                    status,
                    position: positions[index % positions.length],
                    icon,
                    lessonData: unidade
                };
            })
        }));
    }, [completedUnitIds]);

    useEffect(() => {
    const user = auth.currentUser;
        if (!user) return;

        let energyInterval = null;

    // Load Streak
    const streakRef = doc(db, 'users', user.uid, 'gamification', 'streak');        
    const unsubscribeStreak = onSnapshot(streakRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setStreak(data.currentStreak || 0);
        }
    });

    // Load Coins 
    const economyRef = doc(db, 'users', user.uid, 'gamification', 'economy');        
    const unsubscribeEconomy = onSnapshot(economyRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setCoins(data.coins || 0);
        } else {
            // Initialize economy doc if it doesn't exist
            const { setDoc } = await import('firebase/firestore');
            await setDoc(economyRef, {
                coins: 25, // starting coins
                lastUpdated: new Date().toISOString()
            });
            setCoins(25);
        }
    });

    // Load Trail Progress
    const trailProgressRef = doc(db, 'users', user.uid, 'gamification', 'trailProgress');
    const unsubscribeTrail = onSnapshot(trailProgressRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const ids = Array.isArray(data.completedUnitIds) ? data.completedUnitIds : [];
            setCompletedUnitIds(ids);
        } else {
            await setDoc(trailProgressRef, {
                completedUnitIds: [],
                updatedAt: new Date().toISOString()
            });
            setCompletedUnitIds([]);
        }
    });

    // Load Energy (Hearts)
    const energyRef = doc(db, 'users', user.uid, 'gamification', 'energy');
    const unsubscribeEnergy = onSnapshot(energyRef, async (docSnap) => {
        const { setDoc } = await import('firebase/firestore');
        const now = Date.now();
        
        let data = null;
        if (docSnap.exists()) {
            data = docSnap.data();
        } else {
            // First time init
            data = { hearts: 6, maxHearts: 6, lastRefill: now, isPremium: false };
            await setDoc(energyRef, data);
        }

        setIsPremium(data.isPremium || false);

        if (data.isPremium) {
            setHearts(data.maxHearts || 6);
            if (energyInterval) clearInterval(energyInterval);
            return;
        }

        // Logic for Free Users (Max 6, 1 every 30min)
        const THIRTY_MINUTES_MS = 30 * 60 * 1000;
        let currentHearts = data.hearts;
        let lastRefill = data.lastRefill;

        const updateEnergyUI = async () => {
            const timePassed = Date.now() - lastRefill;
            const heartsToAdd = Math.floor(timePassed / THIRTY_MINUTES_MS);
            
            if (heartsToAdd > 0 && currentHearts < data.maxHearts) {
                const newHearts = Math.min(currentHearts + heartsToAdd, data.maxHearts);
                const timeRemainder = timePassed % THIRTY_MINUTES_MS;
                const newLastRefill = Date.now() - timeRemainder;
                
                await setDoc(energyRef, { 
                    ...data, 
                    hearts: newHearts, 
                    lastRefill: newLastRefill 
                }, { merge: true });
                return;
            }

            // Calculate countdown string
            if (currentHearts < data.maxHearts) {
                const msUntilNext = THIRTY_MINUTES_MS - (Date.now() - lastRefill);
                const minutes = Math.floor(msUntilNext / 60000);
                const seconds = Math.floor((msUntilNext % 60000) / 1000);
                setNextEnergyTimeStr(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            } else {
                setNextEnergyTimeStr("Cheia");
            }
            setHearts(currentHearts);
        };

        // Run immediately and set interval
        updateEnergyUI();
        if (energyInterval) clearInterval(energyInterval);
        energyInterval = setInterval(updateEnergyUI, 1000);
    });

    return () => {
        unsubscribeStreak();
        unsubscribeEconomy();
        unsubscribeTrail();
        unsubscribeEnergy();
        if (energyInterval) clearInterval(energyInterval);
    };
    }, []);

    const handleNodePress = (selectedNode) => {
        if (selectedNode.status === 'locked') {
            Alert.alert('Unidade bloqueada', 'Conclua a unidade atual para liberar a proxima.');
            return;
        }

        navigation.navigate('Lesson', { lessonData: selectedNode.lessonData });
    };


    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <HomeHeader 
            streak={streak} 
            coins={coins} 
            hearts={hearts} 
            isPremium={isPremium} 
            nextEnergyTime={nextEnergyTimeStr} 
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {sectionsData.map((section, index) => {
                const isFirstGroup = index === 0;

                return (
                    <View key={`section-${section.id}`}>
                        <SectionBanner
                            section={index + 1}
                            unit={section.unidades.length}
                            description={section.titulo}
                            onPress={() => {
                                const cleanTitle = section.titulo.includes(': ') 
                                    ? section.titulo.split(': ')[1] 
                                    : section.titulo;
                                const sectionBanner = {
                                    id: `section-${section.id}`,
                                    title: `Seção ${index + 1}: ${cleanTitle}`,
                                    subtitle: `${section.unidades.length} Unidades de aprendizado`,
                                    color: index % 3 === 0 ? '#1CB0F6' : (index % 3 === 1 ? '#22C55E' : '#FF9600'),
                                    detail: {
                                        heading: section.titulo,
                                        body: [
                                            {
                                                type: 'paragraph',
                                                text: `Bem-vindo à Seção ${index + 1} da sua trilha de aprendizado financeiro. Esta seção aborda conceitos fundamentais sobre planejamento, economia, e atitudes práticas para alavancar suas conquistas financeiras.`
                                            },
                                            ...section.unidades.map((u, ui) => ({
                                                type: 'section',
                                                title: `Unidade ${ui + 1}: ${u.titulo}`,
                                                text: `Complete as lições e atividades desta unidade para avançar no seu aprendizado, subir de nível no ranking e acumular recompensas!`
                                            })),
                                            {
                                                type: 'tip',
                                                label: 'Dica Prática',
                                                text: 'Dê um passo de cada vez. A consistência diária é muito mais valiosa do que estudar horas acumuladas uma única vez!'
                                            }
                                        ]
                                    }
                                };
                                navigation.navigate('BannerDetail', { banner: sectionBanner });
                            }}
                        />
                        <View style={styles.trailContainer}>
                            {isFirstGroup && (
                                <LottieView
                                    autoPlay
                                    loop={true}
                                    style={{ width: 150, height: 150 }}
                                    source={require('../../assets/lottie/loading-coin.json')}
                                />
                            )}
                            {section.unidades.map(node => (
                                <TrailNode 
                                    key={node.id} 
                                    node={node} 
                                    onPress={handleNodePress}
                                />
                            ))}
                        </View>
                    </View>
                );
            })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  trailContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  character: {
    width: 120,
    height: 120,
    position: 'absolute',
    left: 10,
    top: 120,
    zIndex: 1,
  },
});

export default HomeScreen;
