import React, { useState, useEffect, useRef } from 'react';

// Hardcoded "Trap PR" diff from Phase 2 seeding
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
 });

--- a/ai-engine/app/routers/stream.py
+++ b/ai-engine/app/routers/stream.py
@@ -22,6 +22,12 @@
 @router.post('/stream')
 async def generate_stream(request: Request):
     payload = await request.json()
-    return process_chat_sync(payload)
+    
+    async def event_generator():
+        async for token in llm_client.stream_completion(f"Reply to: {payload['prompt']}"):
+            yield f"data: {token}\\n\\n"
+            
+    return StreamingResponse(event_generator(), media_type="text/event-stream")`;

export default function ReviewDashboard() {
  const [streamLog, setStreamLog] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalFindings, setFinalFindings] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  
  const endOfLogRef = useRef(null);

  // Auto-scroll the terminal pane
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

      if (!response.body) throw new Error('No ReadableStream provided by the server.');

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
          buffer = buffer.slice(boundary + 2); // advance past \n\n
          boundary = buffer.indexOf('\n\n');

          if (!chunk.trim()) continue;

          // Our engine.py returns: data: { "step": X, "message": "...", "result": ... }
          const dataPayload = chunk.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(dataPayload);
            
            if (parsed.step) setCurrentStep(parsed.step);
            
            // Handle error events from backend
            if (parsed.status === 'error' || parsed.error) {
              const errMsg = parsed.message || parsed.error || 'Unknown engine error';
              setStreamLog(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                step: -1,
                text: `ENGINE ERROR: ${errMsg}`
              }]);
              setIsProcessing(false);
              return;
            }

            // Log message updates
            if (parsed.message) {
              setStreamLog(prev => [...prev, {
                time: new Date().toLocaleTimeString(),
                step: parsed.step,
                text: parsed.message
              }]);
            }

            // Step 5: Finished
            if (parsed.step === 5 && parsed.result) {
              setFinalFindings(parsed.result);
              setIsComplete(true);
              setIsProcessing(false);
            }

          } catch (e) {
            console.error("SSE Parse Error:", e, chunk);
          }
        }
      }
    } catch (err) {
      setStreamLog(prev => [...prev, { time: new Date().toLocaleTimeString(), step: -1, text: `Connection Failed: ${err.message}` }]);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 selection:bg-indigo-500/30">
      
      {/* HEADER */}
      <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent">Omni-Review</span>
            <span className="text-sm font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700">v2.0 Elite</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Context-Aware Code Review Agent • Live Attack Simulation</p>
        </div>

        {/* Memory Maturity Indicator */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 shadow-inner">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Agentic Maturity</span>
            <span className="text-emerald-400 font-bold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> EXPERT STATE
            </span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex shrink-0 -space-x-2">
            {/* Visual fluff: representing vector nodes */}
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-500 flex items-center justify-center text-xs text-white font-bold">V</div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-cyan-500 flex items-center justify-center text-xs text-white font-bold">L</div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-white font-bold">+18</div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)]">
        
        {/* LEFT PANEL: PR / EDITOR */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-mono bg-slate-700/50 text-indigo-300 border border-slate-600">
                PR-1499: feat: Introduce lightning-fast SSE streaming
              </span>
            </div>
            {!isProcessing && !isComplete && (
              <button 
                onClick={triggerAgent}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
              >
                Analyze with Hindsight
              </button>
            )}
            {isProcessing && <span className="text-cyan-400 text-sm font-semibold animate-pulse">Running Multi-Pass Agent...</span>}
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-[#0d1117] font-mono text-sm leading-relaxed">
            <pre className="text-slate-300">
              {PR_DIFF.split('\\n').map((line, i) => {
                let colorClass = "text-slate-300";
                let bgClass = "bg-transparent";
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  colorClass = "text-emerald-300";
                  bgClass = "bg-emerald-900/20";
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  colorClass = "text-rose-300";
                  bgClass = "bg-rose-900/20";
                } else if (line.startsWith('@@')) {
                  colorClass = "text-cyan-400";
                }
                return (
                  <div key={i} className={`px-2 ${bgClass}`}>
                    <span className="text-slate-600 select-none inline-block w-8 mr-4 text-right border-r border-slate-700/50 pr-4">{i + 1}</span>
                    <span className={colorClass}>{line}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>

        {/* RIGHT PANEL: THE BRAIN / SSE FEED */}
        <div className="flex flex-col gap-6">
          
          {/* Terminal / execution feed */}
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 shadow-2xl flex flex-col">
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Agentic Reasoning Matrix</h2>
              <span className="flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${isProcessing ? 'bg-indigo-400 opacity-75' : 'hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-indigo-500' : 'bg-slate-600'}`}></span>
              </span>
            </div>
            
            <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-3 bg-[#0a0a0f]">
              {streamLog.map((log, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <div className="flex-1">
                    {/* Visual styling based on the event step */}
                    {log.step === 2 || log.step === 2.5 || log.step === 3 ? (
                      <span className="text-fuchsia-400 font-bold bg-fuchsia-400/10 px-2 py-0.5 rounded border border-fuchsia-400/20">{">>"} VECTORIZE_HINDSIGHT: {log.text}</span>
                    ) : log.step === 4 ? (
                      <span className="text-cyan-400 ml-4 font-semibold">{"->"} GROQ_LLM: {log.text}</span>
                    ) : log.step === 5 ? (
                      <span className="text-emerald-400 font-extrabold uppercase mt-2 block border-t border-emerald-900/50 pt-2">{log.text}</span>
                    ) : (
                      <span className="text-slate-300">{log.text}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endOfLogRef} />
            </div>
          </div>

          {/* GROQ Extracted Findings Panel */}
          {isComplete && (
            <div className="h-64 rounded-xl border border-rose-900/50 bg-rose-950/20 shadow-2xl overflow-auto animate-in slide-in-from-bottom-4 duration-500 relative">
              <div className="sticky top-0 bg-rose-950/90 backdrop-blur-md px-4 py-3 border-b border-rose-900/50 border-t-4 border-t-rose-500 select-none z-10 flex justify-between items-center">
                 <h2 className="text-sm font-bold text-rose-300 tracking-wide uppercase">Critical Security Violations Detected</h2>
                 <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded border border-rose-500/30 font-bold">{finalFindings.length} ISSUES</span>
              </div>
              
              <div className="p-4 space-y-4">
                {finalFindings.map((finding, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                       <h3 className="font-bold text-slate-100">{finding.title}</h3>
                       <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-sm shadow-sm">{finding.severity}</span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{finding.description}</p>
                    
                    {finding.referenced_memory_id && (
                      <div className="bg-fuchsia-950/30 border border-fuchsia-900/50 border-l-4 border-l-fuchsia-500 rounded-r-md px-4 py-2 flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                         <span className="text-fuchsia-300 text-xs font-semibold tracking-wide">MATCHED MEMORY: <span className="font-mono text-fuchsia-200">{finding.referenced_memory_id}</span></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
