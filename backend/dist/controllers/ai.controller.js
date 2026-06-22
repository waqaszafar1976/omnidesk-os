"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamAICompletion = void 0;
// Stream completion mock using SSE (Server-Sent Events) to simulate Vercel AI SDK text streams
const streamAICompletion = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ success: false, error: 'MISSING_PROMPT_PARAMETER' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    console.log(`[AI Engine] Streaming response for prompt: "${prompt.slice(0, 40)}..."`);
    const mockPhrases = [
        "Here is a professional co-writing proposal from Omnidesk AI:\n\n",
        "- **Operational Standard**: Establish direct validation check protocols across distributor pipelines.\n",
        "- **Workflow Optimizations**: Automate daily recovery logs, preventing delay offsets.\n",
        "- **Action Item**: Verify workspace RLS compliance settings on table partitions before launching Phase 3.",
        "\n\nDoes this align with your team's objective?"
    ];
    let i = 0;
    const interval = setInterval(() => {
        if (i < mockPhrases.length) {
            res.write(`data: ${JSON.stringify({ text: mockPhrases[i] })}\n\n`);
            i++;
        }
        else {
            res.write('data: [DONE]\n\n');
            clearInterval(interval);
            res.end();
        }
    }, 400);
    req.on('close', () => {
        clearInterval(interval);
    });
};
exports.streamAICompletion = streamAICompletion;
