// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { ModalService } from './modal.service';

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
    private readonly modal = inject(ModalService);

    open$(
        title: string,
        description?: string,
        confirmButtonText?: string,
        cancelButtonText?: string,
    ): Observable<boolean> {
        const modalRef = this.modal.openRef(ConfirmationDialogComponent);
        modalRef.componentInstance.title.set(title);
        modalRef.componentInstance.description.set(description ?? '');
        if (confirmButtonText) modalRef.componentInstance.confirmButtonText.set(confirmButtonText);
        if (cancelButtonText) modalRef.componentInstance.cancelButtonText.set(cancelButtonText);
        return this.modal.result$<boolean>(modalRef);
    }
}
