import React, { createContext, useState, useContext } from 'react';

export const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
    const [onboardingData, setOnboardingData] = useState({
        step1: null,
        step2: null,
        step3: null,
        step4: null,
        step5: null,
    });

    const updateOnboardingData = (step, data) => {
        setOnboardingData(prev => ({
            ...prev,
            [step]: data
        }));
    };

    return (
        <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData }}>
            {children}
        </OnboardingContext.Provider>
    );
}

