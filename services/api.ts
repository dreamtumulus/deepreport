import { SearchResult, AppConfig } from '../types';

// Tavily Search API
export const searchTavily = async (query: string, apiKey: string): Promise<SearchResult[]> => {
  if (!apiKey) throw new Error("Tavily API Key is missing");

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_answer: false,
        max_results: 10,
        topic: "general", // "news" is also an option but general is often better for broad research
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map((res: any) => ({
      title: res.title,
      url: res.url,
      content: res.content,
      score: res.score,
    }));
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

// OpenRouter API (LLM)
export const generateText = async (
  messages: { role: string; content: string }[],
  config: AppConfig,
  jsonMode: boolean = false
): Promise<string> => {
  if (!config.openRouterApiKey) throw new Error("OpenRouter API Key is missing");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin, // Required by OpenRouter
        "X-Title": "OmniReport",
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000, // Large window for long sections
        response_format: jsonMode ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter Error: ${response.status} - ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("LLM Generation failed:", error);
    throw error;
  }
};