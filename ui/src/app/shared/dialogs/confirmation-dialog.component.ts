import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-confirmation-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ title | translate }}</div>
        </div>
        <div class="modal-body" [innerHTML]="description"></div>
        <div class="modal-footer">
            <button class="xm-ok-button" (click)="activeModal.close(true)" autofocus>
                {{ 'i18n_button_accept' | translate }}
            </button>
            <button class="xm-cancel-button float-start" (click)="activeModal.dismiss(false)">
                {{ 'i18n_button_decline' | translate }}
            </button>
        </div>
    `,
})
export class ConfirmationDialogComponent {
    title = '';
    description = '';

    constructor(public activeModal: NgbActiveModal) {}
}
