

'use server';

import { config } from 'dotenv';
config();
import { ai } from '@/ai/genkit'; 
import OpenAI from 'openai';

interface TestConnectionParams {
    provider: string;
    apiKey: string;
    model: string;
    serverUrl?: string;
}

export async function testAiConnection(params: TestConnectionParams): Promise<{ success: boolean, error?: string }> {
    try {
        if (!params.model) {
            throw new Error("Kein Modell ausgewählt.");
        }
        if (!params.apiKey && params.provider !== 'lokale_ki') {
            throw new Error("API-Schlüssel fehlt.");
        }
        
        if (params.provider === 'openrouter' || params.provider === 'lokale_ki') {
             const baseURL = params.provider === 'lokale_ki' 
                ? params.serverUrl
                : 'https://openrouter.ai/api/v1';

            if (!baseURL) {
                throw new Error("Server-URL für lokale KI fehlt.");
            }

            const openai = new OpenAI({
                baseURL: baseURL,
                apiKey: params.apiKey,
                defaultHeaders: {
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://rebelein-lager.web.app', 
                    'X-Title': 'Rebelein Lager',
                },
            });
            await openai.chat.completions.create({
                model: params.model,
                messages: [{ role: 'user', content: 'Hallo' }],
                max_tokens: 5,
            });

        } else { // Für 'google'
            const modelToUse = params.model;
            
            await ai.generate({
                model: `googleai/${modelToUse}`,
                prompt: 'Hallo',
                config: {
                    apiKey: params.apiKey,
                },
                output: {
                    format: 'text',
                },
            });
        }

        return { success: true };
    } catch (error: unknown) {
        console.error("Test connection failed:", error);
        let errorMessage = (error as Error).message || 'Ein unbekannter Fehler ist aufgetreten.';
        
        if (errorMessage.includes('404')) {
          errorMessage = `Modell '${params.model}' nicht gefunden. Überprüfen Sie den Modellnamen. Fehler: 404 - Not Found.`
        } else if ((error as { code?: string }).code) {
             errorMessage = `Fehler: ${(error as { code?: string }).code} - ${(error as Error).message}`;
        }
        
        if (errorMessage.includes("API key not valid")) {
            errorMessage = "Der API-Schlüssel ist ungültig oder hat nicht die nötigen Berechtigungen."
        }
        if (errorMessage.includes("API key is required")) {
             errorMessage = "Der API-Schlüssel ist ungültig oder hat nicht die nötigen Berechtigungen."
        }
        
        return { success: false, error: errorMessage };
    }
}
