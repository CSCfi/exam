// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { highlightCodeBlocks } from './syntax-highlight';

const render = (html: string) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root;
};

describe('highlightCodeBlocks', () => {
    it('should colorize a code block in a language CKEditor offers', async () => {
        const root = render('<pre><code class="language-cpp">int main() { return 0; }</code></pre>');

        await highlightCodeBlocks(root);

        const code = root.querySelector('code') as HTMLElement;
        expect(code.innerHTML).toContain('hljs-');
        expect(code.textContent).toBe('int main() { return 0; }');
    });

    it('should resolve the cs and html options through hljs aliases', async () => {
        const root = render(
            '<pre><code class="language-cs">var x = 1;</code></pre>' +
                '<pre><code class="language-html">&lt;p&gt;hello&lt;/p&gt;</code></pre>',
        );

        await highlightCodeBlocks(root);

        root.querySelectorAll('code').forEach((code) => expect(code.innerHTML).toContain('hljs-'));
    });

    it('should leave content without code blocks untouched', async () => {
        const root = render('<p>Pelkkaa tekstia</p>');

        await highlightCodeBlocks(root);

        expect(root.innerHTML).toBe('<p>Pelkkaa tekstia</p>');
    });

    it('should not highlight the same block twice', async () => {
        const root = render('<pre><code class="language-python">x = 1</code></pre>');

        await highlightCodeBlocks(root);
        const once = root.innerHTML;
        await highlightCodeBlocks(root);

        expect(root.innerHTML).toBe(once);
    });
});
