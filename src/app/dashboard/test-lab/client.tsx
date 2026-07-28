'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { testRAG } from '@/app/actions/test-lab';

export default function TestLabClient({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const result = await testRAG(tenantId, userMessage);
      
      setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
      setTrace({
        grounded: result.grounded,
        chunksRetrieved: result.results.length,
        topScore: result.results.length > 0 ? result.results[0].score : 0,
        sources: result.results
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error occurred during simulation.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setTrace(null);
  }

  return (
    <div className="flex flex-1 gap-6 min-h-0">
      {/* Chat Simulator */}
      <div className="flex flex-col flex-1 bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30 font-medium flex justify-between items-center">
          <span>Simulation Session</span>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              Start typing below to test your assistant's responses.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 text-sm bg-muted animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-card">
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1" 
              disabled={loading}
            />
            <Button type="submit" disabled={loading}><Play className="h-4 w-4 mr-2" /> Send</Button>
          </form>
        </div>
      </div>

      {/* Trace Analysis */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto min-w-[350px]">
        <div className="bg-card border rounded-xl shadow-sm p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Decision Trace
          </h3>
          <div className="space-y-4 text-sm">
            <div className="border rounded-md p-3">
              <span className="text-muted-foreground block mb-1 text-xs uppercase font-semibold">Intent Detected</span>
              <span className="font-medium">Knowledge Question</span>
            </div>
            <div className="border rounded-md p-3">
              <span className="text-muted-foreground block mb-1 text-xs uppercase font-semibold">Max Confidence</span>
              <span className="font-medium">{trace?.topScore ? (trace.topScore * 100).toFixed(1) + '%' : '-'}</span>
            </div>
            <div className="border rounded-md p-3">
              <span className="text-muted-foreground block mb-1 text-xs uppercase font-semibold">Knowledge Retrieved</span>
              <span className="font-medium">{trace?.chunksRetrieved ? `${trace.chunksRetrieved} chunks` : <span className="text-muted-foreground italic">No chunks retrieved</span>}</span>
              {trace?.sources && trace.sources.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground border-t pt-2 max-h-32 overflow-y-auto">
                  {trace.sources.map((s: any, i: number) => (
                    <div key={i} className="mb-2 pb-2 border-b last:border-0 truncate">
                      <strong>Score: {(s.score * 100).toFixed(1)}%</strong>
                      <p className="mt-1">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm p-5 border-yellow-500/20">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            Grounding & Safety
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Groundedness Score</span>
              <span className="font-medium">{trace ? (trace.grounded ? <span className="text-green-600 font-bold">100% (YES)</span> : <span className="text-red-600 font-bold">0% (NO)</span>) : '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Action Suggested</span>
              <span className="font-medium">Reply</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Handoff Triggered</span>
              <span className="font-medium">No</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
