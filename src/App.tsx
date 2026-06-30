import './App.css';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { Message } from './types/Message';
import MessageList from './components/MessageList';
import LoadingSpinner from './components/Spinner';
import MessageInput from './components/MessageInput';

const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

const PROMPT_SUGGESTIONS = [
  {
    title: "Explain React useEffect hook",
    desc: "Understand dependencies, cleanups, and execution flow.",
    prompt: "Can you explain how the useEffect hook works in React with a simple example, including how to handle cleanups?"
  },
  {
    title: "Centering with CSS Flexbox",
    desc: "Create a template for horizontal and vertical alignment.",
    prompt: "Write a clean CSS Flexbox template to center a card horizontally and vertically. Explain the key properties used."
  },
  {
    title: "How to setup Ollama locally?",
    desc: "Step-by-step instructions for running models on your CPU/GPU.",
    prompt: "What are the steps to setup Ollama locally, pull a model (like llama3.2), and configure CORS Origins to connect with web apps?"
  },
  {
    title: "List weekend project ideas",
    desc: "Fun and creative projects to practice front-end coding.",
    prompt: "Suggest 3 fun and creative weekend project ideas for a front-end developer looking to practice React and Tailwind CSS."
  }
];

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ibot_messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeEngine, setActiveEngine] = useState<'webgpu' | 'ollama' | 'simulation'>(() => {
    return (localStorage.getItem('ibot_active_engine') as any) || 'webgpu';
  });

  const [ollamaUrl, setOllamaUrl] = useState(() => {
    return localStorage.getItem('ibot_ollama_url') || 'http://localhost:11434';
  });

  const [ollamaModel, setOllamaModel] = useState(() => {
    return localStorage.getItem('ibot_ollama_model') || 'llama3.2';
  });

  const [engine, setEngine] = useState<any>(null);
  const [loadingEngine, setLoadingEngine] = useState<boolean>(true);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [inProgressMessage, setInProgressMessage] = useState<string>('Loading WebGPU Engine...');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync settings with localStorage
  useEffect(() => {
    localStorage.setItem('ibot_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('ibot_active_engine', activeEngine);
  }, [activeEngine]);

  useEffect(() => {
    localStorage.setItem('ibot_ollama_url', ollamaUrl);
  }, [ollamaUrl]);

  useEffect(() => {
    localStorage.setItem('ibot_ollama_model', ollamaModel);
  }, [ollamaModel]);

  const initProgressCallback = (initProgress) => {
    setInProgressMessage(initProgress.text);
  };

  const initEngine = useCallback(async () => {
    setLoadingEngine(true);
    setEngineError(null);
    setInProgressMessage("Initialising WebWorker...");
    try {
      const createdEngine = await CreateWebWorkerMLCEngine(
        new Worker(new URL('/src/workers/worker.ts', import.meta.url), {
          type: "module",
        }), 
        SELECTED_MODEL, 
        { initProgressCallback }
      );
      setEngine(createdEngine);
      setLoadingEngine(false);
    } catch (error: any) {
      console.error("WebGPU Engine Init Error:", error);
      setEngineError(error?.message || String(error));
    }
  }, []);

  // Control engine loading based on settings
  useEffect(() => {
    if (activeEngine === 'webgpu') {
      if (!engine) {
        initEngine();
      } else {
        setLoadingEngine(false);
        setEngineError(null);
      }
    } else {
      setLoadingEngine(false);
      setEngineError(null);
    }
  }, [activeEngine, engine, initEngine]);

  useEffect(() => {
    scrollBottom();
  }, [messages]);

  const scrollBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const clearChat = () => {
    setMessages([]);
    handleStop();
    textAreaRef.current?.focus();
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setLoadingMessage(false);
    }
  };

  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);

    if (textAreaRef.current) {
      textAreaRef.current.value = '';
      textAreaRef.current.style.height = 'auto';
    }
    
    setLoadingMessage(true);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (activeEngine === 'webgpu') {
        await updateMessageWebGPU(updatedMessages, controller.signal);
      } else if (activeEngine === 'ollama') {
        await updateMessageOllama(updatedMessages, controller.signal);
      } else {
        await streamSimulationResponse(userMessage, controller.signal);
      }
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
      setLoadingMessage(false);
      abortControllerRef.current = null;
    }
  };

  const updateMessageWebGPU = async (history: Message[], signal: AbortSignal) => {
    if (!engine) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'assistant', content: '' }
    ]);

    let assistantMessage = '';
    try {
      const chunks = await engine.chat.completions.create({
        messages: history.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      });

      for await (const chunk of chunks) {
        if (signal.aborted) break;
        
        const content = chunk.choices[0]?.delta?.content || '';
        assistantMessage += content;
        setMessages((prevMessages) =>
          prevMessages.map((msg, i) =>
            i === prevMessages.length - 1 && msg.role === 'assistant'
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      setMessages((prevMessages) =>
        prevMessages.map((msg, i) =>
          i === prevMessages.length - 1 && msg.role === 'assistant'
            ? { ...msg, content: `**WebGPU Error**: ${error?.message || String(error)}`, error: true }
            : msg
        )
      );
    }
  };

  const updateMessageOllama = async (history: Message[], signal: AbortSignal) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'assistant', content: '' }
    ]);

    let assistantMessage = '';
    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: history.map(m => ({ role: m.role, content: m.content })),
          stream: true
        }),
        signal: signal
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Response body is not readable");

      while (true) {
        if (signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                assistantMessage += parsed.message.content;
                setMessages((prevMessages) =>
                  prevMessages.map((msg, i) =>
                    i === prevMessages.length - 1 && msg.role === 'assistant'
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Partial line chunk, skip
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      let errorMsg = "Sorry, I had trouble connecting to Ollama.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMsg = `**Could not connect to Ollama** at \`${ollamaUrl}\`.

1. **Is Ollama running?** Verify that Ollama is active on your device.
2. **CORS Permission Required**: Browsers block cross-origin requests by default. To let this chat app communicate with Ollama, you must enable CORS. Run Ollama with the following environment variables:
   * **PowerShell (Windows)**:
     \`\`\`powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     \`\`\`
   * **Terminal (macOS/Linux)**:
     \`\`\`bash
     OLLAMA_ORIGINS="*" ollama serve
     \`\`\`
   Then restart Ollama and try again!`;
      } else {
        errorMsg = `**Ollama Error**: ${error?.message || String(error)}`;
      }

      setMessages((prevMessages) =>
        prevMessages.map((msg, i) =>
          i === prevMessages.length - 1 && msg.role === 'assistant'
            ? { ...msg, content: errorMsg, error: true }
            : msg
        )
      );
    }
  };

  const streamSimulationResponse = async (userPrompt: string, signal: AbortSignal) => {
    let responseText = "";
    const promptLower = userPrompt.toLowerCase();
    
    if (promptLower.includes("hola") || promptLower.includes("hello") || promptLower.includes("hi")) {
      responseText = "¡Hola! Soy **IBOT** en modo de simulación offline.\n\nActualmente estoy corriendo de forma simulada porque WebGPU no está disponible. Sin embargo, puedes chatear conmigo para probar la interfaz, o bien cambiar al motor **Ollama** en el menú lateral para interactuar con un modelo local real.\n\n¿En qué te puedo ayudar hoy?";
    } else if (promptLower.includes("react")) {
      responseText = "React es una biblioteca de JavaScript para construir interfaces de usuario. Aquí tienes un ejemplo simple de un hook personalizado:\n\n```typescript\nimport { useState, useEffect } from 'react';\n\nexport function useLocalStorage<T>(key: string, initialValue: T) {\n  const [value, setValue] = useState<T>(() => {\n    const json = localStorage.getItem(key);\n    return json ? JSON.parse(json) : initialValue;\n  });\n\n  useEffect(() => {\n    localStorage.setItem(key, JSON.stringify(value));\n  }, [key, value]);\n\n  return [value, setValue] as const;\n}\n```\n\n¡Puedes probar el botón de **Copy** arriba a la derecha en el bloque de código para copiarlo al portapapeles!";
    } else if (promptLower.includes("code") || promptLower.includes("código") || promptLower.includes("javascript") || promptLower.includes("js")) {
      responseText = "Aquí tienes un ejemplo de una función debounce en JavaScript, muy útil para optimizar eventos de redimensionamiento o entrada de texto:\n\n```javascript\nfunction debounce(func, wait) {\n  let timeout;\n  return function (...args) {\n    clearTimeout(timeout);\n    timeout = setTimeout(() => {\n      func.apply(this, args);\n    }, wait);\n  };\n}\n\n// Ejemplo de uso:\nconst handleSearch = debounce((query) => {\n  console.log('Buscando:', query);\n}, 300);\n```";
    } else if (promptLower.includes("css") || promptLower.includes("html") || promptLower.includes("diseño")) {
      responseText = "Para crear un diseño de rejilla moderno (CSS Grid) que sea completamente responsivo y adaptativo sin usar media queries, puedes utilizar el siguiente código:\n\n```css\n.grid-container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n  padding: 1.5rem;\n}\n\n.grid-item {\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 12px;\n  padding: 1rem;\n  transition: transform 0.2s;\n}\n\n.grid-item:hover {\n  transform: translateY(-4px);\n}\n```";
    } else if (promptLower.includes("ollama")) {
      responseText = "Para conectar IBOT con **Ollama** y ejecutar modelos locales más potentes de forma 100% gratuita y privada, sigue estos pasos:\n\n1. **Descarga Ollama**: Visita [ollama.com](https://ollama.com) y descarga la versión para tu sistema operativo (Windows, macOS o Linux).\n2. **Descarga un modelo**: Abre tu terminal y descarga un modelo ligero ejecutando:\n   ```bash\n   ollama pull llama3.2\n   ```\n3. **Habilita los permisos CORS**: Para que tu navegador pueda conectarse con el servidor de Ollama, debes configurar la variable de entorno `OLLAMA_ORIGINS`:\n   * **En Windows (PowerShell)**:\n     ```powershell\n     $env:OLLAMA_ORIGINS=\"*\"\n     ollama serve\n     ```\n   * **En macOS/Linux (Terminal)**:\n     ```bash\n     OLLAMA_ORIGINS=\"*\" ollama serve\n     ```\n4. **Configura el lateral**: Selecciona el motor **Ollama** en el menú de la izquierda, confirma que el modelo coincide (ej. `llama3.2`) y empieza a chatear.";
    } else {
      responseText = `Entendido tu mensaje: "${userPrompt}".\n\nComo asistente en **Modo Simulación**, puedo decirte que la interfaz de chat está completamente operativa. Se admiten formatos de texto en negrita como **este texto**, código en línea como \`console.log()\` y listas ordenadas.\n\nPara obtener respuestas reales e inteligentes desde tu hardware local, por favor activa **WebGPU** en tu navegador o selecciona el motor de **Ollama** en el menú de configuración lateral.`;
    }

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'assistant', content: '' }
    ]);

    let currentIdx = 0;
    const chunkSize = 4;
    
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(interval);
          reject(new Error("Stream aborted"));
          return;
        }
        
        currentIdx += chunkSize;
        const currentText = responseText.slice(0, currentIdx);
        
        setMessages((prevMessages) =>
          prevMessages.map((msg, i) =>
            i === prevMessages.length - 1 && msg.role === 'assistant'
              ? { ...msg, content: currentText }
              : msg
          )
        );

        if (currentIdx >= responseText.length) {
          clearInterval(interval);
          resolve();
        }
      }, 35);
    });
  };

  const handleSwitchEngine = (newEngine: 'ollama' | 'simulation') => {
    setActiveEngine(newEngine);
    setEngineError(null);
    setLoadingEngine(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar - Collapsible on Mobile, Persistent on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#080b13] border-r border-slate-900/80 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Title */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-1.5 flex items-center justify-center shadow-inner">
                <img src="/ibot.svg" alt="IBOT" className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">IBOT Assistant</h1>
                <p className="text-[10px] text-slate-500">v0.1.0 • Local AI</p>
              </div>
            </div>
            
            {/* Status dot */}
            <div className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${
                activeEngine === 'webgpu' 
                  ? loadingEngine ? 'bg-amber-500 animate-pulse' : engineError ? 'bg-red-500' : 'bg-green-500' 
                  : activeEngine === 'ollama' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'
              }`} />
            </div>
          </div>

          {/* New Chat Button */}
          <button 
            onClick={clearChat}
            className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 px-4 bg-indigo-650/15 hover:bg-indigo-650/25 border border-indigo-500/25 text-indigo-300 text-xs font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Settings Section */}
          <div className="mt-6 flex-1 overflow-y-auto space-y-5 pr-1">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Active AI Engine
              </span>
              <div className="space-y-1.5">
                {[
                  { id: 'webgpu', name: 'WebGPU (In-Browser)', desc: 'Runs fully locally inside browser' },
                  { id: 'ollama', name: 'Local Ollama', desc: 'Connects to Ollama backend' },
                  { id: 'simulation', name: 'Offline Simulator', desc: 'Mock responses for testing' }
                ].map((engineOption) => (
                  <button
                    key={engineOption.id}
                    onClick={() => {
                      setActiveEngine(engineOption.id as any);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                      activeEngine === engineOption.id
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300 shadow-md'
                        : 'bg-slate-900/30 border-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <p className="font-semibold">{engineOption.name}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">{engineOption.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ollama Config Fields */}
            {activeEngine === 'ollama' && (
              <div className="space-y-3 p-3 rounded-xl bg-slate-900/40 border border-slate-900 animate-fade-in">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ollama Configuration
                </span>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Server Host URL</label>
                  <input 
                    type="text" 
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none transition-all"
                    placeholder="e.g. http://localhost:11434"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Model Name</label>
                  <input 
                    type="text" 
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none transition-all"
                    placeholder="e.g. llama3.2"
                  />
                </div>
              </div>
            )}

            {/* WebGPU Status/Warning */}
            {activeEngine === 'webgpu' && (
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-900 text-[11px] leading-relaxed text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Model Spec:</p>
                <p className="font-mono text-[9px] text-slate-500 break-all">{SELECTED_MODEL}</p>
                <p className="pt-1.5">WebGPU runs a compiled model locally using browser GPU hardware acceleration.</p>
              </div>
            )}
          </div>
        </div>

        {/* Clear History Trigger */}
        <div className="pt-4 border-t border-slate-900/80">
          <button 
            onClick={clearChat}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full py-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Conversation History
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 relative">
        
        {/* Header */}
        <header className="h-14 border-b border-slate-900/60 px-4 flex items-center justify-between bg-[#0b0f19]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-1.5">
            {/* Hamburger button on mobile */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 cursor-pointer mr-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xs font-bold text-white tracking-wide">IBOT Workspace</span>
          </div>

          {/* Active Engine Badge */}
          <div>
            {activeEngine === 'webgpu' && (
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider border ${
                loadingEngine 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : engineError 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
              }`}>
                {loadingEngine ? 'WebGPU Loading' : engineError ? 'WebGPU Failed' : 'WebGPU Active'}
              </span>
            )}
            {activeEngine === 'ollama' && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                Ollama: {ollamaModel}
              </span>
            )}
            {activeEngine === 'simulation' && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider bg-slate-800 border border-slate-700 text-slate-400">
                Offline Simulator
              </span>
            )}
          </div>
        </header>

        {/* Content Container */}
        <main 
          className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 flex flex-col justify-start" 
          ref={messagesContainerRef}
        >
          {loadingEngine && activeEngine === 'webgpu' ? (
            <LoadingSpinner 
              message={inProgressMessage} 
              error={engineError} 
              onSwitchEngine={handleSwitchEngine}
            />
          ) : messages.length === 0 ? (
            /* Welcome Empty State */
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center px-4 py-16 my-auto animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-indigo-650/10 border border-indigo-500/20 p-3.5 flex items-center justify-center shadow-lg shadow-indigo-500/5 pulse-gaze mb-6">
                <img src="/ibot.svg" alt="IBOT" className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Meet IBOT</h2>
              <p className="text-slate-400 text-sm max-w-sm mt-2 leading-relaxed">
                Your lightweight, private local AI assistant. Choose a sample prompt below or start typing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 w-full">
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(s.prompt)}
                    className="p-4 text-left rounded-xl bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900 hover:border-slate-800/80 transition-all group active:scale-[0.98] cursor-pointer"
                  >
                    <h4 className="text-slate-200 font-semibold text-xs group-hover:text-indigo-400 transition-colors">
                      {s.title}
                    </h4>
                    <p className="text-slate-500 text-[10px] mt-1 leading-snug">
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="max-w-3xl mx-auto w-full">
              <MessageList messages={messages} />
              
              {/* Message Generation Spinner */}
              {loadingMessage && (
                <div className="flex gap-3 text-sm items-start py-2 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-indigo-650/10 border border-indigo-500/20 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                    <img src="/ibot.svg" alt="IBOT" className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <span className="text-[10px] font-medium text-slate-500 px-1">IBOT</span>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-none border bg-slate-900/30 border-slate-900 text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Input Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/90 to-transparent pt-10 z-10">
          <MessageInput
            loadingEngine={loadingEngine && activeEngine === 'webgpu'}
            loadingMessage={loadingMessage}
            onSubmit={handleSubmit}
            textAreaRef={textAreaRef}
            isGenerating={isGenerating}
            onStop={handleStop}
          />
        </div>
      </div>
    </div>
  );
}

export default App;


