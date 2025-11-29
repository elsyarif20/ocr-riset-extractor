import { GoogleGenAI } from "@google/genai";
import { ResearchConfig, ResearchResult, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateText = async (text: string, targetLang: string, sourceLang: string): Promise<string> => {
  try {
    // Use Flash Lite for fast responses as requested
    const model = 'gemini-2.5-flash-lite';
    const prompt = `
      You are a professional translator. 
      Translate the following text from ${sourceLang} to ${targetLang}.
      Maintain the original formatting and tone.
      
      Text to translate:
      """
      ${text}
      """
      
      Only return the translated text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text.");
  }
};

export const generateResearchContent = async (config: ResearchConfig): Promise<ResearchResult> => {
  try {
    // Use gemini-3-pro-preview with thinking budget for complex tasks
    const model = 'gemini-3-pro-preview'; 

    const systemInstruction = `You are an expert academic writer and researcher assisting a student with their ${config.type}.
    Your writing style is ${config.writingStyle}.
    You must adhere to the ${config.citationStyle} citation style.
    The output language must be ${config.language}.
    `;

    let chapterPrompt = "";
    if (config.chapter === 'all') {
        chapterPrompt = `
        Please write a COMPREHENSIVE ACADEMIC THESIS covering Chapters I through V.
        
        Structure:
        - Title Page (Title only)
        - Abstract
        - Chapter I: Introduction (Background, Problem, Objectives)
        - Chapter II: Literature Review (Key theories, Framework)
        - Chapter III: Methodology (Design, Sample, Analysis)
        - Chapter IV: Results & Discussion (Key findings - simulated)
        - Chapter V: Conclusion & Recommendations
        
        Since this is a full thesis generation, focus on coherence, logical flow, and academic depth. 
        Total length should be substantial (approx 2000-3000 words) but concise enough to fit in one response.
        `;
    } else {
        chapterPrompt = `Please write the content for **${config.chapter}**.`;
    }

    const prompt = `
      Topic: ${config.topic}
      
      ${chapterPrompt}
      
      Requirements:
      1. Content Length: ${config.length} (be substantial and detailed).
      2. References: Include inline citations in ${config.citationStyle} format.
      3. Years range for references: ${config.yearFrom} to ${config.yearTo}.
      4. Structure: Use standard academic sections.
      5. Tone: Professional, academic, and objective.
      
      CRITICAL OUTPUT FORMAT:
      1. Main Content: The academic text. Use Markdown headers (#, ##, ###) for structure, but keep the text clean.
      2. References Section: At the end, create a section titled "References" containing:
         - ${config.referencesNational} references from local/national sources.
         - ${config.referencesInternational} references from international sources.
      3. RIS Data: AT THE VERY END, STRICTLY generate a valid RIS format block wrapped in \`\`\`ris \`\`\`.
    `;

    // Calculate token limits
    // Max thinking budget for 2.5/3 Pro is 32768.
    // To accommodate this + output, we set maxOutputTokens high.
    // Default output for some models is 8192, which is < 32768 thinking, causing failure.
    // We must set maxOutputTokens > thinkingBudget.
    const thinkingBudget = 32768; 
    const maxOutputTokens = 65536; 

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget }, 
        maxOutputTokens: maxOutputTokens
      }
    });

    const fullText = response.text || "";
    
    if (!fullText) {
        throw new Error("Received empty response from the model. Please try again or reduce the complexity.");
    }

    // Parse logic to separate content, references, and RIS
    let content = fullText;
    let ris = "";
    let references: string[] = [];

    // Extract RIS
    const risMatch = fullText.match(/```ris([\s\S]*?)```/);
    if (risMatch) {
      ris = risMatch[1].trim();
      content = content.replace(risMatch[0], "").trim();
    } else {
        // Fallback: try to find RIS without code blocks if model messed up
        const startRis = content.indexOf('TY  -');
        if (startRis !== -1) {
            ris = content.substring(startRis);
            content = content.substring(0, startRis).trim();
        }
    }

    return {
      content,
      references, 
      ris
    };

  } catch (error) {
    console.error("Research generation error:", error);
    throw new Error("Failed to generate research content. " + (error instanceof Error ? error.message : ""));
  }
};

export const sendMessage = async (
  message: string, 
  history: ChatMessage[], 
  useSearch: boolean, 
  useMaps: boolean,
  userLocation?: { latitude: number; longitude: number }
) => {
  try {
    let model = 'gemini-3-pro-preview'; 
    let tools = undefined;
    let toolConfig = undefined;

    if (useSearch) {
      model = 'gemini-2.5-flash';
      tools = [{ googleSearch: {} }];
    } else if (useMaps) {
      model = 'gemini-2.5-flash';
      tools = [{ googleMaps: {} }];
      if (userLocation) {
        toolConfig = {
          retrievalConfig: {
            latLng: userLocation
          }
        };
      }
    }

    const previousHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    const chat = ai.chats.create({
      model,
      history: previousHistory,
      config: {
        tools,
        toolConfig,
        thinkingConfig: (!useSearch && !useMaps) ? { thinkingBudget: 1024 } : undefined 
      }
    });

    const result = await chat.sendMessage({ message });
    
    return {
      text: result.text,
      groundingMetadata: result.candidates?.[0]?.groundingMetadata
    };

  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
}