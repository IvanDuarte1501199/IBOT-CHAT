import React from 'react';

interface MessageInputProps {
    loadingEngine: boolean;
    loadingMessage: boolean;
    onSubmit: (message: string) => void;
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    clearChat: () => void;
    hasMessages: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ loadingEngine, loadingMessage, onSubmit, textAreaRef, clearChat, hasMessages }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const userMessage = textAreaRef.current?.value.trim() || '';
        if (userMessage) {
            onSubmit(userMessage);
            if (textAreaRef.current) textAreaRef.current.value = '';
        }
    };

    return (
        <form className='flex gap-2 relative pb-4' onSubmit={handleSubmit}>
            <textarea disabled={loadingEngine || loadingMessage}
                className={`${loadingEngine || loadingMessage ? 'opacity-20' : ''} 
              hover:outline-1 focus:outline-1 outline-0 focus:outline-gray-200 outline-gray-700 
              flex-1 pl-4 rounded-2xl outline-none pr-24 bg-gray-750 text-md pt-3 pb-3 resize-none h-auto min-h-12 overflow-hidden`}
                autoComplete="off"
                rows={1}
                ref={textAreaRef}
                name="message"
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                    }
                }}
                placeholder="Send a message to IBOT..." />
            <button disabled={loadingEngine || loadingMessage}
                className={`${loadingEngine || loadingMessage ? 'opacity-20' : ''} absolute rounded-full h-7 w-7 right-5 bottom-6`}
                type="submit">
                <img src="/send.svg" alt="Send Icon" className="text-white h-full w-full" />
            </button>
            {hasMessages && (
                <button onClick={clearChat} disabled={loadingEngine || loadingMessage}
                    className={`${loadingEngine || loadingMessage ? 'opacity-20' : ''} hidden md:block absolute rounded-full h-7 w-7 -right-10 bottom-6`}>
                    <img src="/trash.svg" alt="Trash Icon" className="text-white h-full w-full" />
                </button>
            )}
        </form>
    );
};

export default MessageInput;