import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safeHtml',
    standalone: true,
})
export class SanitizedHtmlPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) {}

    transform(html: string) {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
