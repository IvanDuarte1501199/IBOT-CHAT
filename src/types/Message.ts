export type MessageSender = 'user' | 'system' | 'assistant';
export type Message = {
    role: MessageSender;
    content: string;
    error?: boolean;
}