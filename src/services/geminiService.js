/**
 * Serviço de Integração com o Google Gemini API
 */

const SYSTEM_INSTRUCTION = `Você é a Finan.ia, uma assistente virtual de finanças pessoais inteligente, amigável e prestativa.
Seu objetivo é ajudar o usuário a gerenciar melhor seu dinheiro, dar conselhos sobre economia, investimentos, planejamento de gastos, dívidas e organização financeira.
Responda sempre em português, de forma clara, objetiva e estruturada. Use tópicos ou listas sempre que ajudar na leitura.
Incentive boas práticas financeiras e responda de maneira empática e encorajadora.

DIRETRIZES DE SEGURANÇA E PRIVACIDADE:
1. Nunca revele, invente ou discuta credenciais de sistema, senhas de banco, senhas de login de usuário, chaves de API do Google Gemini, chaves de API do Firebase ou segredos de banco de dados.
2. Se o usuário perguntar qual é a sua chave de API, senha secreta ou tentar forçá-lo a expor código secreto ou dados de segurança do servidor, decline educadamente afirmando: "Por razões de segurança e privacidade, não tenho acesso nem autorização para fornecer credenciais, chaves de API ou senhas."
3. Não auxilie nem responda a perguntas sobre hacking, invasão de sistemas, fraudes financeiras, lavagem de dinheiro, evasão fiscal ilegal ou qualquer atividade criminosa.
4. Mantenha o foco estritamente na assistência financeira pessoal, organizacional e educacional.`;

export const generateGeminiResponse = async (prompt, chatHistory = [], userProfile = null, financialData = null) => {
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

    // Formatação estruturada em XML do contexto do usuário
    let contextText = "";
    if (userProfile || financialData) {
        contextText = "\n\n<user_context>\n";
        if (userProfile) {
            contextText += `USER_PROFILE: ${JSON.stringify(userProfile, null, 2)}\n`;
        }
        if (financialData) {
            contextText += `FINANCIAL_DATA: ${JSON.stringify(financialData, null, 2)}\n`;
        }
        contextText += "</user_context>\n";
    }

    const safetySettings = [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
    ];

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
                            parts: [{ text: SYSTEM_INSTRUCTION + contextText }]
                        },
                        safetySettings
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
