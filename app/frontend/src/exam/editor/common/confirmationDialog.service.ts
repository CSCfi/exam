import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '../../../../node_modules/@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogComponent } from './confirmationDialog.component';

@Injectable()
export class ConfirmationDialogService {

    constructor(private modal: NgbModal) { }

    open(title: string, description?: string): NgbModalRef {
        return this.modal.open(ConfirmationDialogComponent, {
            backdrop: 'static',
            keyboard: false
        });

    }

}
