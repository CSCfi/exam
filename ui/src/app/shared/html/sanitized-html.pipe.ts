// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safeHtml',
    standalone: true,
})
export class SanitizedHtmlPipe implements PipeTransform {
    private sanitizer = inject(DomSanitizer);

    transform(html: string) {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
