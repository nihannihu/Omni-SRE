import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal, Brain, ShieldAlert, Cpu, 
  ChevronRight, Database, Zap, Activity, Code, Server, Radar
} from 'lucide-react';
import TiltCard from '../components/ui/TiltCard';

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
+});`;

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
      <header style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
             <Radar size={18} style={{ color: 'var(--brand-primary)' }} />
             <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Agent Simulation Environment</span>
          </div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.05em' }}>
            Mission Control
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem', fontWeight: 500 }}>
            Active-duty simulation for institutional pattern calibration and threat detection.
          </p>
        </div>
        
        <button 
          onClick={triggerAgent} 
          disabled={isProcessing}
          className="btn-pill btn-primary"
          style={{ 
            padding: '1.125rem 2.25rem', 
            opacity: isProcessing ? 0.6 : 1,
            pointerEvents: isProcessing ? 'none' : 'auto'
          }}
        >
          {isProcessing ? <><Cpu size={20} className="spin" /> Calibrating Chain...</> : <><Play size={20} /> INITIATE SYSTEM PROBE</>}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '2.5rem', height: 'calc(100vh - 280px)' }}>
        
        {/* Left: Code Context */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <TiltCard style={{ height: '100%' }}>
            <div className="glass-card" style={{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 900, fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                  <Code size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  TELEMETRY_SAMPLE.diff
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.8 }}>
                {PR_DIFF.split('\n').map((line, i) => (
                  <div key={i} style={{ 
                    color: line.startsWith('+') ? '#10b981' : line.startsWith('-') ? '#ef4444' : '#64748b',
                    background: line.startsWith('+') ? 'rgba(16, 185, 129, 0.04)' : line.startsWith('-') ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    display: 'flex',
                    gap: '2rem'
                  }}>
                    <span style={{ color: '#cbd5e1', textAlign: 'right', minWidth: '2rem', userSelect: 'none', fontSize: '0.75rem' }}>{i + 1}</span>
                    <span style={{ whiteSpace: 'pre' }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>
        </section>

        {/* Right: Agent Reasoning & Findings */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Reasoning Machine */}
          <TiltCard style={{ flex: isComplete ? '1' : '3' }}>
            <div className="glass-card" style={{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={18} style={{ color: isProcessing ? 'var(--brand-primary)' : '#475569' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Reasoning Matrix</span>
                </div>
                {isProcessing && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    PHASE {currentStep} / 5
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {streamLog.length === 0 && !isProcessing && (
                  <div style={{ color: '#475569', textAlign: 'center', marginTop: '20%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                    <Server size={40} opacity={0.3} />
                    <span style={{ fontWeight: 700, letterSpacing: '0.1em' }}>AWAITING COMMAND SIGNAL</span>
                  </div>
                )}
                {streamLog.map((log, i) => (
                  <div key={i} style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', lineHeight: 1.6 }}>
                    <span style={{ color: '#3b82f6', opacity: 0.8, flexShrink: 0, fontSize: '0.7rem', fontWeight: 700 }}>[{log.time}]</span>
                    <div style={{ color: log.step >= 3 ? '#f1f5f9' : '#94a3b8' }}>
                      <span style={{ color: '#3b82f6', marginRight: '0.75rem', fontWeight: 900 }}>{">>"}</span>
                      {log.text}
                    </div>
                  </div>
                ))}
                <div ref={endOfLogRef} />
              </div>
            </div>
          </TiltCard>

          {/* Findings (Only visible when complete) */}
          {isComplete && (
            <div style={{ flex: '2', animation: 'animate-slide-up 0.6s ease-out forwards' }}>
              <TiltCard>
                <div className="glass-card" style={{ height: '100%', borderTop: '4px solid #ef4444', background: '#fff', padding: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <ShieldAlert size={22} style={{ color: '#ef4444' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detected Violations</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', maxHeight: '100%' }}>
                    {finalFindings.map((f, idx) => (
                      <div key={idx} style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{f.title}</span>
                          <span style={{ background: '#fef2f2', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, border: '1px solid #fee2e2' }}>{f.severity}</span>
                        </div>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem', fontWeight: 500 }}>{f.description}</p>
                        {f.referenced_memory_id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 900, background: '#f5f3ff', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                            <Brain size={16} /> HINDSIGHT CALIBRATION: {f.referenced_memory_id}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
