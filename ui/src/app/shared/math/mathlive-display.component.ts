// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject } from '@angular/core';
import { MathFieldElement, MathLiveService } from './mathlive.service';

// Type guard for MathfieldElement constructor
interface MathfieldElementConstructor {
    new (): MathFieldElement;
}

@Component({
    selector: 'xm-mathlive-display',
    template: ` <div #mathDisplay class="math-display" [class.inline]="inline"></div> `,
    standalone: true,
    imports: [CommonModule],
    styles: [
        `
            .math-display {
                display: block;
                text-align: center;
                margin: 1rem 0;
                padding: 0.5rem;
                background: #f8f9fa;
                border-radius: 0.25rem;
                min-height: 2rem;
            }

            .math-display.inline {
                display: inline-block;
                margin: 0;
                padding: 0.25rem 0.5rem;
                background: transparent;
                border-radius: 0;
                min-height: auto;
            }
        `,
    ],
})
export class MathLiveDisplayComponent implements OnChanges, OnDestroy, AfterViewInit {
    @ViewChild('mathDisplay', { static: true }) mathDisplayRef!: ElementRef;

    @Input() expression = '';
    @Input() inline = false;

    private mathField: MathFieldElement | null = null;
    private mathLiveService = inject(MathLiveService);

    ngAfterViewInit() {
        this.initializeMathDisplay();
    }

    ngOnChanges() {
        if (this.mathField && this.expression) {
            this.updateDisplay();
        }
    }

    ngOnDestroy() {
        if (this.mathField && this.mathField.parentNode) {
            this.mathField.parentNode.removeChild(this.mathField);
        }
    }

    private async initializeMathDisplay() {
        await this.mathLiveService.loadMathLive();
        this.setupMathDisplay();
    }

    private setupMathDisplay() {
        if (!this.mathLiveService.isMathLiveAvailable()) {
            console.error('MathfieldElement not available');
            return;
        }

        // Create a new MathfieldElement
        this.mathField = new (
            window as unknown as { MathfieldElement: MathfieldElementConstructor }
        ).MathfieldElement();

        // Configure the math field for read-only display
        this.mathField.readOnly = true;
        this.mathField.setAttribute('math-virtual-keyboard-policy', 'off');

        // Append to the container
        this.mathDisplayRef.nativeElement.appendChild(this.mathField);

        this.updateDisplay();
    }

    private updateDisplay() {
        if (this.mathField && this.expression) {
            this.mathField.setValue(this.expression);
        }
    }
}
