// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-inspection-statement-dialog',
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_inspector_statement' | translate }}</div>
        </div>
        <div class="modal-body">
            <div class="mt-2">
                <p mathjax [innerHtml]="statement"></p>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" (click)="activeModal.close()" autofocus>
                {{ 'i18n_close' | translate }}
            </button>
        </div>
    `,
})
export class InspectionStatementDialogComponent {
    @Input() statement: unknown;
    constructor(public activeModal: NgbActiveModal) {}
}
