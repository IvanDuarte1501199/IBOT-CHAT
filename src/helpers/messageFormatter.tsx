import React from "react";

export function formatMessage(message: string): JSX.Element {
    const boldRegex = /\*\*(.*?)\*\*/g;
    let formattedMessage = message.replace(boldRegex, (match, p1) => `<strong>${p1}</strong>`);

    const blockCodeRegex = /```([\s\S]*?)```/g;
    formattedMessage = formattedMessage.replace(blockCodeRegex, (match, p1) => `<pre class="bg-black p-6 rounded-lg my-4 border-solid border-1 border-gray-700"><code>${p1}</code></pre>`); formattedMessage

    const inlineCodeRegex = /`([^`]+)`/g;
    formattedMessage = formattedMessage.replace(inlineCodeRegex, (match, p1) => `<code>${p1}</code>`);

    formattedMessage = formattedMessage.replace(/(\d+\.\s.*(?:\n|$))+/g, (match) => {
        const items = match.replace(/\d+\.\s/g, "").split('\n').filter(Boolean).map(item => `<li>${item}</li>`).join("");
        return `<ol class="list-decimal pl-4">${items}</ol>`;
    });

    formattedMessage = formattedMessage.replace(/(\*\s.*(?:\n|$))+/g, (match) => {
        const items = match.replace(/\*\s/g, "").split('\n').filter(Boolean).map(item => `<li>${item}</li>`).join("");
        return `<ul class="list-disc pl-6">${items}</ul>`;
    });

    const remainingTextRegex = /(?:<pre[\s\S]*?<\/pre>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<code>.*?<\/code>|<strong>.*?<\/strong>|\S[\s\S]+?(?=<|$))/g;
    formattedMessage = formattedMessage.replace(remainingTextRegex, (match) => {
        if (!match.startsWith('<') && !match.endsWith('>')) {
            return `<p>${match.trim()}</p>`;
        }
        return match;
    });

    return <div dangerouslySetInnerHTML={{ __html: formattedMessage }} />;
}