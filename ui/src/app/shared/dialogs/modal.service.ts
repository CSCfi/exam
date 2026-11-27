// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ApplicationRef, inject, Injectable, Type } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EMPTY, from, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ModalService {
    private readonly defaultOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: true,
    };
    private readonly ngbModal = inject(NgbModal);
    private readonly appRef = inject(ApplicationRef);

    open$<T>(component: Type<unknown>, options?: NgbModalOptions): Observable<T> {
        const modalRef: NgbModalRef = this.ngbModal.open(component, { ...this.defaultOptions, ...options });
        return from(modalRef.result as Promise<T>).pipe(
            catchError(() => EMPTY),
            tap(() => queueMicrotask(() => this.appRef.tick())),
        );
    }

    openRef(component: Type<unknown>, options?: NgbModalOptions): NgbModalRef {
        return this.ngbModal.open(component, { ...this.defaultOptions, ...options });
    }

    result$<T>(modalRef: NgbModalRef): Observable<T> {
        return from(modalRef.result as Promise<T>).pipe(
            catchError(() => EMPTY),
            tap(() => queueMicrotask(() => this.appRef.tick())),
        );
    }

    dismissAll(): void {
        this.ngbModal.dismissAll();
    }

    hasOpenModals(): boolean {
        return this.ngbModal.hasOpenModals();
    }
}
