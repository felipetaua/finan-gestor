/**
 * Serviço de Integração com o Google Gemini API
 */

const SYSTEM_INSTRUCTION = `Você é a Finan.ia, uma assistente virtual de finanças pessoais inteligente, amigável e prestativa.
Seu objetivo é ajudar o usuário a gerenciar melhor seu dinheiro, dar conselhos sobre economia, investimentos, planejamento de gastos, dívidas e organização financeira.
Responda sempre em português, de forma clara, objetiva e estruturada. Use tópicos ou listas sempre que ajudar na leitura.
Incentive boas práticas financeiras e responda de maneira empática e encorajadora.`;

export const generateGeminiResponse = async (prompt, chatHistory = []) => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
        return "⚠️ *Chave de API do Gemini não configurada.*\n\nPara conversar comigo, por favor adicione a chave `EXPO_PUBLIC_GEMINI_API_KEY` no seu arquivo `.env` na raiz do projeto e reinicie o servidor do Expo.";
    }

    // Lista de modelos e endpoints ativos e disponíveis para a chave do usuário
    const modelsToTry = [
        { name: 'gemini-flash-latest', version: 'v1beta' },
        { name: 'gemini-3.5-flash-lite', version: 'v1beta' },
        { name: 'gemini-2.0-flash', version: 'v1beta' },
        { name: 'gemini-3.6-flash', version: 'v1beta' },
        { name: 'gemini-flash-lite-latest', version: 'v1beta' }
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            console.log(`[Gemini] Tentando modelo: ${model.name} (${model.version})`);
            
            const contents = chatHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            contents.push({
                role: 'user',
                parts: [{ text: prompt }]
            });

            const response = await fetch(
                `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents,
                        systemInstruction: {
                            parts: [{ text: SYSTEM_INSTRUCTION }]
                        }
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `Erro HTTP ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (responseText) {
                console.log(`[Gemini] Sucesso usando o modelo: ${model.name}`);
                return responseText.trim();
            }
        } catch (error) {
            console.warn(`[Gemini] Falha no modelo ${model.name}:`, error.message);
            lastError = error;
            // Continua para tentar o próximo modelo da lista
        }
    }

    // Se todos os modelos da lista falharem, lança o último erro capturado
    throw lastError || new Error("Todos os modelos de IA falharam ou estão indisponíveis.");
};
