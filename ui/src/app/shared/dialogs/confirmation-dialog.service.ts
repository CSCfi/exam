// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { from, Observable } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
    constructor(private modal: NgbModal) {}

    open$(
        title: string,
        description?: string,
        confirmButtonText?: string,
        cancelButtonText?: string,
    ): Observable<boolean> {
        const modalRef = this.modal.open(ConfirmationDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.title = title;
        modalRef.componentInstance.description = description;
        modalRef.componentInstance.confirmButtonText = confirmButtonText;
        modalRef.componentInstance.cancelButtonText = cancelButtonText;
        return from(modalRef.result);
    }
}
