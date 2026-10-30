# Gemini Search

A clean, minimalist AI-powered search engine. It takes your question, optimizes it into an effective web search query, pulls real-time results from the web, and synthesizes a clear, cited answer — all in a fast, distraction-free interface.

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## How it works

1. **Query optimization** — Your natural-language question is rewritten into a concise, effective search query using `google/gemini-3.5-flash` via OpenRouter.
2. **Web search** — The optimized query is sent to the [Tavily Search API](https://tavily.com/), returning up to 10 relevant sources.
3. **Answer synthesis** — Gemini Flash reads through the retrieved sources and writes a structured, Markdown-formatted answer with inline citations (`[1]`, `[2]`, etc.) tied directly back to the sources.

The frontend renders the answer with clickable citation badges — click one and it scrolls to and highlights the matching source card.

## Features

- 🔍 Automatic query optimization before searching
- 🌐 Real-time web search via Tavily
- ✍️ Cited, Markdown-rendered answers synthesized by Gemini Flash
- 🔗 Clickable inline citations linked to source cards
- 🎨 Clean, dark-mode, single-page UI with no frontend framework
- ⚡ Lightweight Express backend — no database required

## Tech stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JS, HTML, CSS (no build step)
- **Search:** [Tavily API](https://tavily.com/)
- **LLM:** Google Gemini Flash via [OpenRouter](https://openrouter.ai/)
- **Markdown rendering:** [marked.js](https://marked.js.org/)

## Prerequisites

- Node.js 18+
- A [Tavily API key](https://tavily.com/)
- An [OpenRouter API key](https://openrouter.ai/)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/NoahTheGinger/Gemini-Search.git
   cd Gemini-Search
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your API keys to `.env`:

   ```env
   TAVILY_API_KEY=your_tavily_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   PORT=3000
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project structure

```
.
├── public/
│   ├── app.js        # Frontend logic: search flow, rendering, citations
│   ├── index.html    # App markup
│   └── style.css      # Dark-mode UI styling
├── server.js          # Express server + search/synthesis pipeline
├── .env.example        # Environment variable template
└── package.json
```

## API

### `POST /api/search`

**Request body:**

```json
{ "query": "What is the James Webb Space Telescope?" }
```

**Response:**

```json
{
  "originalQuery": "...",
  "optimizedQuery": "...",
  "answer": "Markdown-formatted answer with [1] citations...",
  "results": [
    { "index": 1, "title": "...", "url": "...", "content": "..." }
  ]
}
```

## License

MIT