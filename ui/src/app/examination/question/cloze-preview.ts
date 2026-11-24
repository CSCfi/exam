// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/**
 * The HTML of a cloze question with each blank replaced by the student's answer in brackets, or by
 * a line when it has none: the read-only preview shown in a collapsed question card. Answers go in
 * as text nodes, so whatever the student typed is escaped, never parsed as markup.
 */
export function clozePreview(html: string, answers: Record<string, string>): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.body.querySelectorAll('input').forEach((blank) => {
        const answer = answers[blank.id]?.trim();
        blank.replaceWith(doc.createTextNode(answer ? `[${answer}]` : '____'));
    });
    return doc.body.innerHTML;
}
