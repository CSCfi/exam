import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
    selector: '[xmAutoFocus]',
    standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
    constructor(private elementRef: ElementRef) {}

    ngAfterViewInit() {
        this.elementRef.nativeElement.focus();
    }
}
