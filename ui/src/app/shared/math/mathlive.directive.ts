// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { MathFieldElement, MathLiveService } from './mathlive.service';

// Type guard for MathfieldElement constructor
interface MathfieldElementConstructor {
    new (): MathFieldElement;
}

@Directive({
    selector: '[xmMathLive]',
})
export class MathLiveDirective implements OnChanges {
    @Input('xmMathLive') mathLive?: string;

    private el = inject(ElementRef);
    private mathLiveService = inject(MathLiveService);
    private mathField: MathFieldElement | null = null;

    async ngOnChanges() {
        if (this.mathLive) {
            await this.renderMath();
        }
    }

    private async renderMath() {
        await this.mathLiveService.loadMathLive();
        this.setupMathField();
    }

    private setupMathField() {
        if (!this.mathLiveService.isMathLiveAvailable()) {
            console.error('MathfieldElement not available');
            return;
        }

        if (this.mathField && this.mathField.parentNode) {
            this.mathField.parentNode.removeChild(this.mathField);
        }

        // Create a new MathfieldElement
        this.mathField = new (
            window as unknown as { MathfieldElement: MathfieldElementConstructor }
        ).MathfieldElement();

        // Configure the math field for read-only display
        this.mathField.readOnly = true;
        this.mathField.setAttribute('math-virtual-keyboard-policy', 'off');

        // Clear the element and append the math field
        this.el.nativeElement.innerHTML = '';
        this.el.nativeElement.appendChild(this.mathField);

        if (this.mathLive) {
            this.mathField.setValue(this.mathLive);
        }
    }
}
