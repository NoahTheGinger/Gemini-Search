require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Keys Check
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Endpoint: AI Search
app.post('/api/search', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Query is required and must be a non-empty string.' });
  }

  if (!TAVILY_API_KEY) {
    console.error('Missing TAVILY_API_KEY env variable.');
    return res.status(500).json({ error: 'Server configuration error: Tavily API key is missing.' });
  }

  if (!OPENROUTER_API_KEY) {
    console.error('Missing OPENROUTER_API_KEY env variable.');
    return res.status(500).json({ error: 'Server configuration error: OpenRouter API key is missing.' });
  }

  try {
    console.log(`\n--- New Search Request: "${query}" ---`);

    // STEP 1: Generate optimized search query using OpenRouter (google/gemini-3.5-flash)
    console.log('Step 1: Generating optimized search query...');
    const optimizeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/NoahTheGinger/Gemini-Search', // Optional referer
        'X-Title': 'Gemini Search'
      },
      body: JSON.stringify({
        model: 'google/gemini-3.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that optimizes user inputs into a single concise search engine query. Convert the user input into an effective keyword search query for a web search engine. Return ONLY the search query text. Do not include quotes, explanations, prefixes, intro text, or markdown code blocks.'
          },
          {
            role: 'user',
            content: `User query: "${query}"`
          }
        ],
        temperature: 0.1
      })
    });

    if (!optimizeResponse.ok) {
      const errText = await optimizeResponse.text();
      throw new Error(`OpenRouter Optimize API error: ${optimizeResponse.status} - ${errText}`);
    }

    const optimizeData = await optimizeResponse.json();
    let optimizedQuery = optimizeData.choices?.[0]?.message?.content?.trim() || query;
    // Strip surrounding quotes if the model added them
    optimizedQuery = optimizedQuery.replace(/^["']|["']$/g, '');
    console.log(`Optimized query: "${optimizedQuery}"`);

    // STEP 2: Execute Tavily Search
    console.log('Step 2: Fetching 10 search results from Tavily...');
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: optimizedQuery,
        max_results: 10
      })
    });

    if (!tavilyResponse.ok) {
      const errText = await tavilyResponse.text();
      throw new Error(`Tavily API error: ${tavilyResponse.status} - ${errText}`);
    }

    const tavilyData = await tavilyResponse.json();
    const searchResults = tavilyData.results || [];
    console.log(`Retrieved ${searchResults.length} results from Tavily.`);

    // STEP 3: Synthesize cited answer using OpenRouter
    console.log('Step 3: Synthesizing final answer with LLM...');
    
    // Format search results context for the LLM
    const contextText = searchResults.map((res, index) => {
      return `[Source ${index + 1}]
Title: ${res.title}
URL: ${res.url}
Snippet/Content: ${res.content}
`;
    }).join('\n---\n');

    const systemPrompt = `You are a precise, helpful, and objective AI-powered search engine.
Analyze the provided web search results to answer the user's original query.

Original User Query: "${query}"

Instructions:
1. Answer the original query accurately and completely based ONLY on the provided search results.
2. If the search results do not contain enough information to answer a part of the query, state that the search results do not mention it, but do your best with what is provided. Do not invent information.
3. You MUST cite your sources using inline citation markers like [1], [2], etc., corresponding to the indices of the search results (e.g. "[1]" for Source 1, "[2]" for Source 2). Make sure citations are placed immediately after the facts they support.
4. Structure your response using clean Markdown. Use headers, bold text, lists, or simple code blocks as appropriate for readability.
5. Keep your tone neutral, professional, and clear.`;

    const synthesizeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/NoahTheGinger/Gemini-Search',
        'X-Title': 'Gemini Search'
      },
      body: JSON.stringify({
        model: 'google/gemini-3.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Here are the search results:\n\n${contextText}\n\nPlease generate the cited answer.`
          }
        ],
        temperature: 0.2
      })
    });

    if (!synthesizeResponse.ok) {
      const errText = await synthesizeResponse.text();
      throw new Error(`OpenRouter Synthesize API error: ${synthesizeResponse.status} - ${errText}`);
    }

    const synthesizeData = await synthesizeResponse.json();
    const finalAnswer = synthesizeData.choices?.[0]?.message?.content || 'Error generating answer.';
    console.log('Answer synthesized successfully.');

    // Send back results
    res.json({
      originalQuery: query,
      optimizedQuery: optimizedQuery,
      answer: finalAnswer,
      results: searchResults.map((r, i) => ({
        index: i + 1,
        title: r.title,
        url: r.url,
        content: r.content
      }))
    });

  } catch (error) {
    console.error('Error during AI Search execution:', error);
    res.status(500).json({ error: error.message || 'An error occurred during search processing.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
