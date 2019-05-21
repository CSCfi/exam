import { Directive, ElementRef, Input } from '@angular/core';
@Directive({
    selector: '[MathJax]'
})
export class MathJaxDirective {
    @Input('MathJax') src: string;

    constructor(private el: ElementRef) {
    }

    ngOnChanges() {
        this.el.nativeElement.innerHTML = this.src;
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.el.nativeElement]);
    }
}
