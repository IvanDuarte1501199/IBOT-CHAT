import './App.css'
import { useState, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import { CreateWebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { formatMessage } from './helpers/messageFormatter';
import { Message } from './types/Message';
import MessageList from './components/MessageList';
import LoadingSpinner from './components/Spinner';
import MessageInput from './components/MessageInput';


const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
const WELCOME_MESSAGES = [
  "Hi, I'm IBOT. How can I assist you today?",
  "Welcome! I'm IBOT, your personalized assistant. How can I help?",
  "IBOT is ready to help you with your technical questions. Ask me anything!",
  "IBOT is here to assist you with any questions you may have. How can I help?",
  "IBOT is your personalized AI assistant. How can I help you today?",
  "IBOT is here to help you with any technical questions you may have. How can I assist you?",
  "IBOT is ready to assist you with any questions you may have. How can I help?",
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [engine, setEngine] = useState<any>(null);
  const [loadingEngine, setLoadingEngine] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<boolean>(false);
  const [inProgreesMessage, setInProgreesMessage] = useState<string>('Loading Model...');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const randomMessage = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

  useEffect(() => {
    if (loadingEngine && messages.length === 0 && engine) {
      setMessages((prevMessages) => [...prevMessages, { role: 'system', content: randomMessage }])
      setLoadingEngine(false);
      textAreaRef.current?.focus();
    }
  }, [loadingEngine, engine]);

  useEffect(() => {
    if (!loadingEngine && !loadingMessage) textAreaRef.current?.focus();
  }, [loadingEngine, loadingMessage]);

  useEffect(() => {
    if (!engine) {
      initEngine();
    }
  }, []);

  const initEngine = useCallback(async () => {
    const createdEngine = await CreateWebWorkerMLCEngine(new Worker(new URL('/src/workers/worker.ts', import.meta.url), {
      type: "module",
    }), SELECTED_MODEL, { initProgressCallback });
    setEngine(createdEngine);
  }, []);

  const initProgressCallback = (initProgress) => {
    setInProgreesMessage(initProgress.text)
  }

  useEffect(() => {
    scrollBottom();
  }, [messages]);

  const scrollBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }

  const clearChat = () => {
    setMessages([]);
    textAreaRef.current?.focus();
  }

  const handleSubmit = async (userMessage: string) => {
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);

    if (textAreaRef.current) textAreaRef.current.value = '';
    setLoadingMessage(true);
    await updateMessage(updatedMessages);
    setLoadingMessage(false);
  };

  const updateMessage = async (messages: Message[]) => {
    if (engine) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: '' }
      ]);

      try {
        const chunks = await engine.chat.completions.create({
          messages: [...messages],
          stream: true,
        });

        let assistantMessage = '';

        for await (const chunk of chunks) {
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
      } catch (error) {
        setMessages((prevMessages) =>
          prevMessages.map((msg, i) =>
            i === prevMessages.length - 1 && msg.role === 'assistant'
              ? { ...msg, content: "Sorry, I'm having some issues right now. Please try again later.", }
              : msg
          )
        );
      }
    }
  }

  return (
    <>
      <div className='flex flex-col h-screen container px-4'>
        <header>
          <h1 className='text-xl font-bold text-white h-14 flex items-center justify-center'>Chat with IBOT</h1>
        </header>
        <main className={`${inProgreesMessage && loadingEngine ? 'flex justify-center' : ''} flex-1 overflow-y-auto lg:w-60 max-w-60 pb-10 px-2`} ref={messagesContainerRef}>
          {loadingEngine ? (
            <LoadingSpinner message={inProgreesMessage} />
          ) : (
            <MessageList messages={messages} />
          )}
        </main>
        <MessageInput
          loadingEngine={loadingEngine}
          loadingMessage={loadingMessage}
          onSubmit={handleSubmit}
          textAreaRef={textAreaRef}
          clearChat={clearChat}
          hasMessages={messages.length > 1}
        />
      </div>
    </>
  )
}

export default App

