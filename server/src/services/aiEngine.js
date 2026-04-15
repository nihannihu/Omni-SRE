const axios = require('axios');
const config = require('../config/env');

/**
 * HTTP client for communicating with the Python AI Engine.
 */
class AIEngineService {
  constructor() {
    this.client = axios.create({
      baseURL: config.AI_ENGINE_URL,
      timeout: 120000, // 2 min — reviews can take time
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Trigger a context-aware code review.
   */
  async triggerReview(payload) {
    try {
      const response = await this.client.post('/review', payload);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      const error = new Error(`AI Engine review failed: ${message}`);
      error.statusCode = err.response?.status || 502;
      throw error;
    }
  }

  /**
   * Stream a context-aware code review via SSE.
   * Proxies stream to Express response AND parses the final result to update MongoDB.
   */
  async streamReview(payload, res, reviewDoc) {
    try {
      // Set SSE headers for Express response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const response = await this.client.post('/review/stream', payload, {
        responseType: 'stream',
      });

      let eventBuffer = '';

      response.data.on('data', (chunk) => {
        // Forward to client immediately
        res.write(chunk);
        
        // Keep string copy to parse final event
        eventBuffer += chunk.toString('utf8');
      });

      response.data.on('end', async () => {
        res.end();
        try {
          // Look for review_complete event which has the final result
          const completeMatch = eventBuffer.match(/event: review_complete\ndata: (.*)\n\n/);
          if (completeMatch && completeMatch[1]) {
            const data = JSON.parse(completeMatch[1]);
            const result = data.response;
            reviewDoc.status = result.status === 'completed' ? 'completed' : 'failed';
            reviewDoc.result = {
              findings: result.findings || [],
              summary: result.summary?.total_findings ? `${result.summary.total_findings} findings` : 'No findings',
              memoryRecallCount: result.summary?.memories_recalled || 0,
              llmModel: result.llm_usage?.model || 'unknown',
              tokensUsed: {
                input: result.llm_usage?.input_tokens || 0,
                output: result.llm_usage?.output_tokens || 0,
              },
              maturity: {
                level: result.maturity?.level || 'COLD',
                totalFacts: result.maturity?.total_facts || 0,
                observations: result.maturity?.observations || 0,
                confidenceBoost: result.maturity?.confidence_boost || 0,
                description: result.maturity?.description || '',
              },
            };
            reviewDoc.retainedToHindsight = result.memory_retained || false;
            reviewDoc.completedAt = new Date();
            await reviewDoc.save();
          }
        } catch (err) {
          console.error('[SSE] Failed to parse final review result for DB:', err);
        }
      });

      response.data.on('error', async (err) => {
        console.error('[SSE] AI Engine stream error:', err);
        reviewDoc.status = 'failed';
        reviewDoc.errorLog = 'AI Engine disconnected mid-stream';
        await reviewDoc.save();
        res.write(`event: error\ndata: {"message": "Stream failed"}\n\n`);
        res.end();
      });

    } catch (err) {
      reviewDoc.status = 'failed';
      reviewDoc.errorLog = 'Failed to connect to AI Engine';
      await reviewDoc.save();
      
      if (!res.headersSent) {
        res.status(502).json({ error: 'AI Engine stream failed' });
      } else {
        res.write(`event: error\ndata: {"message": "AI Engine connection failed"}\n\n`);
        res.end();
      }
    }
  }

  /**
   * Ingest knowledge (incident, convention, etc.) into Hindsight.
   */
  async ingestKnowledge(payload) {
    try {
      const response = await this.client.post('/ingest', payload);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message;
      const error = new Error(`AI Engine ingest failed: ${message}`);
      error.statusCode = err.response?.status || 502;
      throw error;
    }
  }

  /**
   * Health check for the AI engine.
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.data;
    } catch (err) {
      return { status: 'unreachable', error: err.message };
    }
  }
}

module.exports = new AIEngineService();
