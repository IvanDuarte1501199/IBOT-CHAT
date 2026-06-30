import React from 'react';
import { Message } from '../types/Message';
import { formatMessage } from '../helpers/messageFormatter';

interface MessageListProps {
    messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    const handleListClick = async (e: React.MouseEvent<HTMLUListElement>) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('copy-code-btn')) {
            const code = decodeURIComponent(target.getAttribute('data-code') || '');
            if (code) {
                try {
                    await navigator.clipboard.writeText(code);
                    const originalText = target.innerHTML;
                    target.innerHTML = `
                        <svg class="w-3.5 h-3.5 text-green-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-green-400 pointer-events-none">Copied!</span>
                    `;
                    setTimeout(() => {
                        target.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy: ', err);
                }
            }
        }
    };

    return (
        <ul className="flex flex-col gap-6 py-6" onClick={handleListClick}>
            {messages.map((message, i) => {
                if (message.role === 'system') return null; // We handle welcome message outside or format as assistant
                
                const isUser = message.role === 'user';
                return (
                    <li 
                        key={i} 
                        className={`flex gap-3 text-sm max-w-3xl w-full animate-fade-in ${
                            isUser ? 'justify-end self-end' : 'justify-start self-start'
                        }`}
                    >
                        {!isUser && (
                            <div className="flex items-start">
                                <div className="w-8 h-8 rounded-xl bg-indigo-650/10 border border-indigo-500/20 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                                    <img src="/ibot.svg" alt="IBOT" className="w-5 h-5" />
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 max-w-[85%]">
                            <span className={`text-[10px] font-medium text-slate-500 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                {isUser ? 'You' : 'IBOT'}
                            </span>
                            <div 
                                className={`px-4 py-3 rounded-2xl shadow-md leading-relaxed border ${
                                    isUser 
                                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-50 rounded-tr-none' 
                                        : message.error 
                                            ? 'bg-red-950/10 border-red-500/25 text-red-200 rounded-tl-none' 
                                            : 'bg-slate-900/50 border-slate-800/80 text-slate-200 rounded-tl-none'
                                }`}
                            >
                                {isUser ? (
                                    <p className="whitespace-pre-wrap leading-relaxed text-indigo-50">{message.content}</p>
                                ) : (
                                    formatMessage(message.content)
                                )}
                            </div>
                        </div>
                        {isUser && (
                            <div className="flex items-start">
                                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 font-bold text-xs select-none shadow-sm">
                                    U
                                </div>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};

export default MessageList;