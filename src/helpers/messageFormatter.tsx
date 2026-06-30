import React from "react";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatMessage(message: string): JSX.Element {
    if (!message) return <span />;

    // 1. Escape HTML first to prevent XSS
    let escaped = escapeHtml(message);

    // 2. Parse code blocks: ```lang\ncode``` or ```code```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    escaped = escaped.replace(codeBlockRegex, (_, lang, code) => {
        const language = lang || "code";
        const trimmedCode = code.trim();
        const encoded = encodeURIComponent(trimmedCode);
        return `
            <div class="relative my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs md:text-sm">
                <div class="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
                    <span class="capitalize">${language}</span>
                    <button class="copy-code-btn flex items-center gap-1 hover:text-white transition-colors cursor-pointer" data-code="${encoded}">
                        <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span class="pointer-events-none">Copy</span>
                    </button>
                </div>
                <pre class="p-4 overflow-x-auto text-slate-300"><code class="language-${language}">${trimmedCode}</code></pre>
            </div>
        `;
    });

    // 3. Parse headers: ### header or ## header or # header
    escaped = escaped.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-bold text-slate-200 mt-4 mb-2">$1</h4>');
    escaped = escaped.replace(/^## (.*?)$/gm, '<h3 class="text-md font-bold text-slate-100 mt-5 mb-2">$1</h3>');
    escaped = escaped.replace(/^# (.*?)$/gm, '<h2 class="text-lg font-bold text-white mt-6 mb-3">$1</h2>');

    // 4. Parse inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="bg-slate-900/60 border border-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">$1</code>');

    // 5. Parse bold: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

    // 6. Parse bullet lists: * item or - item
    // Matches groups of bullet points
    escaped = escaped.replace(/(?:^\s*[-*]\s+(.*?)$(?:\n|$))+/gm, (match) => {
        const items = match
            .split("\n")
            .map(line => line.replace(/^\s*[-*]\s+/, "").trim())
            .filter(Boolean)
            .map(item => `<li class="relative pl-5 mb-1 before:absolute before:left-1 before:top-2 before:w-1.5 before:h-1.5 before:bg-indigo-400 before:rounded-full">${item}</li>`)
            .join("");
        return `<ul class="list-none my-3 space-y-1">${items}</ul>`;
    });

    // 7. Parse numbered lists: 1. item
    escaped = escaped.replace(/(?:^\s*\d+\.\s+(.*?)$(?:\n|$))+/gm, (match) => {
        const items = match
            .split("\n")
            .map((line, idx) => line.replace(/^\s*\d+\.\s+/, "").trim())
            .filter(Boolean)
            .map((item, idx) => `<li class="mb-1"><span class="font-semibold text-indigo-400 mr-1.5">${idx + 1}.</span>${item}</li>`)
            .join("");
        return `<ol class="my-3 space-y-1">${items}</ol>`;
    });

    // 8. Convert remaining newlines (not in lists or code blocks) to paragraph formatting
    const blocks = escaped.split(/\n{2,}/g);
    const parsedBlocks = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        // If it starts/ends with layout block tags, return as-is
        if (
            trimmed.startsWith("<div") || 
            trimmed.startsWith("<ul") || 
            trimmed.startsWith("<ol") || 
            trimmed.startsWith("<h2") || 
            trimmed.startsWith("<h3") || 
            trimmed.startsWith("<h4")
        ) {
            return trimmed;
        }
        return `<p class="mb-3.5 last:mb-0 leading-relaxed text-slate-300">${trimmed.replace(/\n/g, "<br />")}</p>`;
    });

    const finalHtml = parsedBlocks.join("\n");

    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
}