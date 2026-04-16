import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal, Brain, ShieldAlert, Cpu, 
  ChevronRight, Database, Zap, Activity
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';

const PR_DIFF = `--- a/server/resolvers.js
+++ b/server/resolvers.js
@@ -88,11 +88,13 @@
 app.post('/api/chat/stream', authMiddleware, async (req, res) => {
   const { prompt, userSettings } = req.body;
   
-  const aiResponse = await axios.post('http://ai-engine:8000/sync-chat', { prompt });
-  res.json(aiResponse.data);
+  // Pass through directly to Python streaming engine
+  const aiResponse = await axios.post('http://ai-engine:8000/stream', {
+     prompt: prompt,
+     settings: userSettings
+  }, { responseType: 'stream' });
+  
+  aiResponse.data.pipe(res);
 });`;

export default function ReviewDashboard() {
  const [streamLog, setStreamLog] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalFindings, setFinalFindings] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  const endOfLogRef = useRef(null);

  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamLog]);

  const triggerAgent = async () => {
    setIsProcessing(true);
    setStreamLog([]);
    setFinalFindings([]);
    setCurrentStep(1);

    try {
      const response = await fetch('http://localhost:8000/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff: PR_DIFF, bank_id: 'omni-review-bank' })
      });

      if (!response.body) throw new Error('ReadableStream unavailable.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (!chunk.trim()) continue;

          const dataPayload = chunk.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.step) setCurrentStep(parsed.step);
            if (parsed.message) {
              setStreamLog(prev => [...prev, {
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
                step: parsed.step,
                text: parsed.message
              }]);
            }
            if (parsed.step === 5 && parsed.result) {
              setFinalFindings(parsed.result);
              setIsComplete(true);
              setIsProcessing(false);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      setStreamLog(prev => [...prev, { time: new Date().toLocaleTimeString(), step: -1, text: `CRITICAL ERROR: ${err.message}` }]);
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Interactive Simulation
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Live attack vector analysis and institutional memory calibration.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={triggerAgent} 
            disabled={isProcessing}
            className={`btn-premium ${isProcessing ? 'btn-secondary' : 'btn-primary'}`}
            style={{ padding: '0.75rem 1.5rem', boxShadow: isProcessing ? 'none' : '0 0 20px var(--brand-glow)' }}
          >
            {isProcessing ? <><Cpu size={18} className="spin" /> Processing Chain...</> : <><Play size={18} /> Run Agent Simulation</>}
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', height: 'calc(100vh - 250px)' }}>
        
        {/* Left: Code Context */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <GlassCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>DETECTION_TARGET.diff</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#020617', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              {PR_DIFF.split('\n').map((line, i) => (
                <div key={i} style={{ 
                  color: line.startsWith('+') ? '#6ee7b7' : line.startsWith('-') ? '#f43f5e' : '#94a3b8',
                  background: line.startsWith('+') ? 'rgba(16, 185, 129, 0.05)' : line.startsWith('-') ? 'rgba(244, 63, 94, 0.05)' : 'transparent'
                }}>
                  <span style={{ display: 'inline-block', width: '2rem', color: '#475569', textAlign: 'right', marginRight: '1rem', userSelect: 'none' }}>{i + 1}</span>
                  {line}
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* Right: Agent Reasoning & Findings */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Reasoning Machine */}
          <GlassCard style={{ flex: isComplete ? '1' : '3', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={16} style={{ color: isProcessing ? 'var(--brand-primary)' : 'var(--text-dim)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reasoning Matrix</span>
              </div>
              {isProcessing && <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 700 }}>STEP {currentStep} OF 5</div>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#0a0a0f', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              {streamLog.length === 0 && !isProcessing && <div style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '20%' }}>Awaiting simulation trigger...</div>}
              {streamLog.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{log.time}]</span>
                  <div style={{ color: log.step >= 3 ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--brand-glow)', marginRight: '0.5rem' }}>{">>"}</span>
                    {log.text}
                  </div>
                </div>
              ))}
              <div ref={endOfLogRef} />
            </div>
          </GlassCard>

          {/* Findings (Only visible when complete) */}
          {isComplete && (
            <GlassCard style={{ flex: '2', borderTop: '4px solid var(--red-glow)', animation: 'slideUp 0.5s ease forwards' }} title="Detected Security Violations" icon={<ShieldAlert size={18} style={{ color: 'var(--red-glow)' }} />}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', overflowY: 'auto', maxHeight: '100%' }}>
                {finalFindings.map((f, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                      <span className="status-badge status-failed">{f.severity}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{f.description}</p>
                    {f.referenced_memory_id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Brain size={12} /> HINDSIGHT MATCH: {f.referenced_memory_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </section>
      </div>
    </div>
  );
}
