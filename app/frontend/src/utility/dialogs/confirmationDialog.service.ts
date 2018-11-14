import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from './confirmationDialog.component';

@Injectable()
export class ConfirmationDialogService {

    constructor(private modal: NgbModal) { }

    open(title: string, description?: string): NgbModalRef {
        const modalRef = this.modal.open(ConfirmationDialogComponent, {
            backdrop: 'static',
            keyboard: false
        });
        modalRef.componentInstance.title = title;
        modalRef.componentInstance.description = description;
        return modalRef;
    }

}
