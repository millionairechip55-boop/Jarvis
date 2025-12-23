
import { GoogleGenAI, Content, Type, GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import type { Message } from "../types";

export type PromptIntent = 'text_generation' | 'image_generation' | 'language_change' | 'device_control' | 'location_query';

export interface AnalyzedPrompt {
  intent: PromptIntent;
  detectedLanguageCode: string;
  languageChangeDetails?: {
    language: string;
    languageCode: string;
  };
  imagePrompt?: string;
  isSetLocationCommand?: boolean;
}

export function getAI() {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set. Please ensure the API key is configured.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await apiCall();
        } catch (error) {
            attempts++;
            const errorString = String(error).toLowerCase();
            if (errorString.includes('429') || errorString.includes('resource_exhausted') || errorString.includes('503') || errorString.includes('unavailable')) {
                if (attempts >= maxRetries) throw error;
                const delay = initialDelay * Math.pow(2, attempts - 1);
                console.warn(`API temporary failure. Retrying in ${delay}ms... (${attempts}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw new Error("Exceeded max retries.");
}

export async function analyzeUserPrompt(prompt: string): Promise<AnalyzedPrompt> {
    const systemInstruction = `You are Jarvis AI's intent analyzer.
Analyze the user's prompt and return ONLY a valid JSON object.

**Intents:**
- "location_query": User asks about locations, maps, directions, distances, or asks "where am I?", "what is my current location?".
- "image_generation": User wants to see/create an image.
- "device_control": Commands for hardware (wifi, volume, etc).
- "text_generation": General chat.

**Critical Rules:**
1. If the user wants to "set", "change", "go to", "open map", or "navigate" to a place, set "isSetLocationCommand": true.
2. If the user asks "Where am I?" or for their current location, categorize as "location_query".
3. Detect the BCP-47 language code.
4. If it's a location request, extract the place name into "imagePrompt" (misused field for simplicity here) or just ensure "isSetLocationCommand" is true.`;

    try {
        const ai = getAI();
        const apiCall = () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: { type: Type.STRING },
                        detectedLanguageCode: { type: Type.STRING },
                        isSetLocationCommand: { type: Type.BOOLEAN, nullable: true },
                        imagePrompt: { type: Type.STRING, nullable: true }
                    },
                    required: ["intent", "detectedLanguageCode"]
                },
                temperature: 0,
            },
        });

        const response = await withRetry<GenerateContentResponse>(apiCall);
        return JSON.parse(response.text.trim()) as AnalyzedPrompt;
    } catch (error) {
        return { intent: 'text_generation', detectedLanguageCode: 'en-US' };
    }
}

export async function generateImage(prompt: string): Promise<string> {
    const ai = getAI();
    const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } },
    });

    const response = await withRetry<GenerateContentResponse>(apiCall);
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data found.");
}

export function mapMessagesToGeminiHistory(messages: Message[]): Content[] {
    return messages
        .filter(msg => msg.text && !msg.image) 
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
}

export async function getResponse(
    contents: Content[],
    longTermMemory?: string,
    language?: string,
    toolsConfig?: any
): Promise<AsyncGenerator<GenerateContentResponse>> {
    
    let systemInstruction = `You are Jarvis, a witty AI assistant created by Mr. Kalpesh.
Always answer "Made by Mr. Kalpesh." if asked about your origin.

**LOCATION & CURRENT POSITION:**
- If toolConfig includes 'latLng', these coordinates are the user's EXACT CURRENT PHYSICAL LOCATION.
- Use the Google Maps tool to determine the user's address, city, or nearby landmarks if they ask "Where am I?".
- If the user asks for their location, provide a helpful and precise description based on the grounding results.
- If the user asks to "navigate" or "set location", or "show map", ALWAYS use the googleMaps tool and verbally confirm: "Certainly, opening the map for you now."
- Always act as if you have real-time access to their physical position through your sensors.`;

    if (longTermMemory) systemInstruction += `\n\nUser Profile Memory:\n${longTermMemory}`;
    if (language && !language.toLowerCase().startsWith('en')) {
        systemInstruction = `**OUTPUT LANGUAGE: ${language}.** Do not use English.\n` + systemInstruction;
    }

    // MAPS GROUNDING RULE: Only supported in Gemini 2.5 series.
    const hasMaps = toolsConfig?.tools?.some((t: any) => t.googleMaps);
    const modelName = hasMaps ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

    const ai = getAI();
    const apiCall = () => ai.models.generateContentStream({
        model: modelName,
        contents,
        config: { ...toolsConfig, systemInstruction },
    });

    return await withRetry<AsyncGenerator<GenerateContentResponse>>(apiCall);
}

export async function getMemoryUpdate(existingMemory: string, conversationMessages: Message[]): Promise<string> {
    const transcript = conversationMessages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Jarvis'}: ${msg.text}`)
        .join('\n');
    const ai = getAI();
    const apiCall = () => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Update memory.',
        config: {
            systemInstruction: `Update user profile memory list.\nCurrent:\n${existingMemory}\n\nNew:\n${transcript}`,
            temperature: 0,
        },
    });
    const response = await withRetry<GenerateContentResponse>(apiCall);
    return response.text.trim();
}

export const deviceControlTools: FunctionDeclaration[] = [
  {
    name: 'toggleSystemFeature',
    description: 'Turns a system feature on or off.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        feature: { type: Type.STRING, enum: ['wifi', 'bluetooth', 'flashlight', 'airplane_mode'] },
        enabled: { type: Type.BOOLEAN }
      },
      required: ['feature', 'enabled']
    }
  },
  {
    name: 'setSystemLevel',
    description: 'Sets volume or brightness.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            feature: { type: Type.STRING, enum: ['volume', 'brightness'] },
            level: { type: Type.NUMBER }
        },
        required: ['feature', 'level']
    }
  }
];
