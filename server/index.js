import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mentor-studio-api', aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/mentor', async (req, res) => {
  const { messages, profile } = req.body ?? {};
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'The AI mentor is not configured yet. Add OPENAI_API_KEY to your .env file and restart the server.' });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return res.status(400).json({ error: 'Send between 1 and 40 conversation messages.' });
  }
  const allowed = messages.every(m => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string' && m.content.length <= 12000);
  if (!allowed) return res.status(400).json({ error: 'Invalid conversation message format.' });

  const learner = profile && typeof profile === 'object' ? profile : {};
  const system = `You are Mentor Studio, an experienced music producer, FL Studio expert, mix engineer, songwriter, and empathetic educator. Teach clearly and practically. For FL Studio instructions, name exact native plugins and give numbered click-by-click steps or shortcuts. Explain WHY a move affects sound, use helpful analogies, and prompt critical listening. Avoid pretending to hear audio that was not provided. If the user asks about mastering, explain tradeoffs and avoid one-size-fits-all settings. Personalize only using this learner profile: name=${String(learner.name || 'Producer').slice(0,80)}, level=${String(learner.level || 'Beginner').slice(0,80)}, genre=${String(learner.genre || 'Not specified').slice(0,100)}, goals=${String(learner.goals || 'Improve production').slice(0,300)}. Structure longer replies with concise headings and practical steps.`;
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', stream: true, messages: [{ role: 'system', content: system }, ...messages.map(({ role, content }) => ({ role, content }))] })
    });
    if (!upstream.ok) {
      const details = await upstream.text();
      return res.status(upstream.status).json({ error: `AI provider returned ${upstream.status}. ${details.slice(0, 500)}` });
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n');
      buffer = chunks.pop() || '';
      for (const line of chunks) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { res.write('event: done\ndata: {}\n\n'); continue; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
          if (parsed.error) res.write(`event: error\ndata: ${JSON.stringify({ error: parsed.error.message || 'AI provider error' })}\n\n`);
        } catch { /* Ignore incomplete or non-JSON provider lines. */ }
      }
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) return res.status(502).json({ error: `Could not reach the AI provider: ${error.message}` });
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'The AI stream ended unexpectedly.' })}\n\n`);
    res.end();
  }
});

// Production mode serves the built client from the same server.
app.use(express.static(path.join(root, 'dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(root, 'dist', 'index.html'), err => { if (err) next(); });
});
app.listen(port, () => console.log(`Mentor Studio API listening on http://localhost:${port}`));
