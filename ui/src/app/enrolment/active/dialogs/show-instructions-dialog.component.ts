// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';

@Component({
    selector: 'xm-show-instructions-dialog',
    imports: [TranslateModule, MathJaxDirective],
    template: `
        <div class="modal-header">
            <div class="modal-title">
                <div class="xm-modal-title">{{ title | translate }}</div>
            </div>
        </div>
        <div class="modal-body" [xmMathJax]="instructions"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" (click)="ok()" autofocus>
                {{ 'i18n_button_ok' | translate }}
            </button>
        </div>
    `,
})
export class ShowInstructionsDialogComponent {
    @Input() instructions = '';
    @Input() title = '';

    activeModal = inject(NgbActiveModal);

    ok = () => this.activeModal.close();
}
