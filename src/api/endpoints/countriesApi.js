export const fetchCountriesApi = async () => {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,translations,flags,idd,cca2');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao carregar REST Countries API:", error);
        throw error;
    }
};
