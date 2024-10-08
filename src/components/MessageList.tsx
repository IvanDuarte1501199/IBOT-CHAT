import React from 'react';
import { Message } from '../types/Message';
import { formatMessage } from '../helpers/messageFormatter';

interface MessageListProps {
    messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    return (
        <ul className="flex flex-col gap-2">
            {messages.map((message, i) => (
                <li key={i} className={`${message.role === 'user' ? 'self-end' : 'self-start'} text-left max-w-xl flex flex-col gap-1 p-2`}>
                    <p className={message.role === 'user' ? 'text-blue-400' : 'text-green-400'}>{message.role === 'user' ? 'You:' : 'IBOT:'}</p>
                    <div className={`p-4 rounded-lg shadow-lg ${message.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-white'}`}>
                        <span>{message.role === 'user' ? message.content : formatMessage(message.content)}</span>
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default MessageList;