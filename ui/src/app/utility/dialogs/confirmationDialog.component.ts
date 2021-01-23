import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'confirmation-dialog',
    template: `
        <div id="sitnet-dialog">
            <div class="modal-header">
                <div class="student-enroll-dialog-wrap">
                    <div class="student-enroll-title">{{ title | translate }}</div>
                </div>
            </div>
            <div class="modal-body">
                {{ description }}
            </div>
            <div class="modal-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" (click)="activeModal.close()">
                        {{ 'sitnet_button_accept' | translate }}
                    </button>
                </div>
                <div class="student-message-dialog-button-cancel">
                    <button class="btn btn-sm btn-danger pull-left" (click)="activeModal.dismiss()">
                        {{ 'sitnet_button_decline' | translate }}
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class ConfirmationDialogComponent {
    title: string;
    description: string;

    constructor(public activeModal: NgbActiveModal) {}
}
