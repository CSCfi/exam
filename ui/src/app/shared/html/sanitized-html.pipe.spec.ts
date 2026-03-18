// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { SanitizedHtmlPipe } from './sanitized-html.pipe';

describe('SanitizedHtmlPipe', () => {
    let pipe: SanitizedHtmlPipe;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [BrowserModule] });
        pipe = TestBed.runInInjectionContext(() => new SanitizedHtmlPipe());
    });

    it('should return a SafeHtml value (not a plain string)', () => {
        const result = pipe.transform('<b>bold</b>');
        // DomSanitizer.bypassSecurityTrustHtml wraps the value; it should not equal a plain string
        expect(result).not.toBe('<b>bold</b>');
    });

    it('should produce the same trusted value as DomSanitizer.bypassSecurityTrustHtml', () => {
        const sanitizer = TestBed.inject(DomSanitizer);
        const expected = sanitizer.bypassSecurityTrustHtml('<p>hello</p>');
        const result = pipe.transform('<p>hello</p>');
        expect(result).toEqual(expected);
    });

    it('should handle an empty string without throwing', () => {
        expect(() => pipe.transform('')).not.toThrow();
    });

    it('should handle a string with script tags without throwing', () => {
        expect(() => pipe.transform('<script>alert(1)</script>')).not.toThrow();
    });
});
