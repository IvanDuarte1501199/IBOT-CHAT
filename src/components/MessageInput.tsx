import React from 'react';

interface MessageInputProps {
    loadingEngine: boolean;
    loadingMessage: boolean;
    onSubmit: (message: string) => void;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    isGenerating: boolean;
    onStop: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
    loadingEngine, 
    loadingMessage, 
    onSubmit, 
    textAreaRef, 
    isGenerating, 
    onStop 
}) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loadingEngine) return;
        
        if (isGenerating) {
            onStop();
            return;
        }

        const userMessage = textAreaRef.current?.value.trim() || '';
        if (userMessage && !loadingMessage) {
            onSubmit(userMessage);
            if (textAreaRef.current) {
                textAreaRef.current.value = '';
                textAreaRef.current.style.height = 'auto';
            }
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-6">
            <form className="relative flex items-end w-full glass-panel border border-slate-800/80 rounded-2xl p-1.5 focus-within:border-indigo-500/50 transition-all shadow-xl" onSubmit={handleSubmit}>
                <textarea
                    disabled={loadingEngine}
                    className="w-full pl-4 pr-14 py-3 bg-transparent text-slate-100 text-sm outline-none resize-none max-h-40 min-h-[44px] overflow-y-auto leading-relaxed placeholder-slate-500"
                    rows={1}
                    ref={textAreaRef}
                    name="message"
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as any);
                        }
                    }}
                    placeholder={loadingEngine ? "AI Engine is loading..." : "Ask IBOT anything..."}
                />
                
                <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    {isGenerating ? (
                        <button
                            onClick={onStop}
                            type="button"
                            className="flex items-center justify-center rounded-xl h-9 w-9 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-650 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                            title="Stop generating"
                        >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="1.5" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            disabled={loadingEngine || loadingMessage || !textAreaRef.current?.value.trim()}
                            className={`flex items-center justify-center rounded-xl h-9 w-9 transition-all shadow-md active:scale-95 cursor-pointer ${
                                loadingEngine || loadingMessage
                                    ? 'bg-slate-800/40 text-slate-600 border border-slate-800/80'
                                    : 'bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/30 text-white hover:shadow-indigo-500/10'
                            }`}
                            type="submit"
                        >
                            <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            </form>
            <p className="text-[10px] text-center text-slate-600 mt-2">
                IBOT running locally. Responses might be limited by model size.
            </p>
        </div>
    );
};

export default MessageInput;