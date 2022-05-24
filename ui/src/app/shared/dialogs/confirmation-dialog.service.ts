import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { from, Observable } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Injectable()
export class ConfirmationDialogService {
    constructor(private modal: NgbModal) {}

    open$(title: string, description?: string): Observable<unknown> {
        const modalRef = this.modal.open(ConfirmationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.title = title;
        modalRef.componentInstance.description = description;
        return from(modalRef.result);
    }
}
