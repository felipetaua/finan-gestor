import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const CURRENCY_STORAGE_KEY = '@finan_currency_code';

export const CURRENCY_OPTIONS = [
    { code: 'BRL', label: 'BRL (R$)', locale: 'pt-BR', symbol: 'R$' },
    { code: 'EUR', label: 'EUR (€)', locale: 'de-DE', symbol: '€' },
    { code: 'USD', label: 'USD ($)', locale: 'en-US', symbol: '$' },
    { code: 'JPY', label: 'JPY (¥)', locale: 'ja-JP', symbol: '¥' },
];

const DEFAULT_CURRENCY = CURRENCY_OPTIONS[0];

export const CurrencyContext = createContext(undefined);

export const CurrencyProvider = ({ children }) => {
    const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY.code);

    useEffect(() => {
        const loadCurrency = async () => {
            try {
                const firebaseUser = auth.currentUser;
                if (firebaseUser) {
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);
                    const firebaseCurrency = userSnap.data()?.currencyCode;
                    const firebaseOption = CURRENCY_OPTIONS.find((item) => item.code === firebaseCurrency);

                    if (firebaseOption) {
                        setCurrencyCode(firebaseOption.code);
                        await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, firebaseOption.code);
                        return;
                    }
                }

                const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
                if (!stored) return;

                const option = CURRENCY_OPTIONS.find((item) => item.code === stored);
                if (option) {
                    setCurrencyCode(option.code);
                }
            } catch (error) {
                console.log('Erro ao carregar moeda:', error);
            }
        };

        loadCurrency();
    }, []);

    const selectedCurrency = useMemo(() => {
        return CURRENCY_OPTIONS.find((item) => item.code === currencyCode) || DEFAULT_CURRENCY;
    }, [currencyCode]);

    const setCurrency = async (nextCode) => {
        const option = CURRENCY_OPTIONS.find((item) => item.code === nextCode);
        if (!option) return;

        try {
            await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, option.code);
            setCurrencyCode(option.code);

            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
                await setDoc(
                    doc(db, 'users', firebaseUser.uid),
                    { currencyCode: option.code },
                    { merge: true }
                );
            }
        } catch (error) {
            console.log('Erro ao salvar moeda:', error);
        }
    };

    const formatCurrency = (value) => {
        const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
        return new Intl.NumberFormat(selectedCurrency.locale, {
            style: 'currency',
            currency: selectedCurrency.code,
            maximumFractionDigits: selectedCurrency.code === 'JPY' ? 0 : 2,
        }).format(amount);
    };

    const value = {
        selectedCurrency,
        currencyCode,
        currencySymbol: selectedCurrency.symbol,
        formatCurrency,
        setCurrency,
    };

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

