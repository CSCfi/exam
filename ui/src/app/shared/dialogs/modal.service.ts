// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject, Injectable, Type } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EMPTY, from, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ModalService {
    private ngbModal = inject(NgbModal);

    /**
     * Opens a modal and returns an Observable that emits the result.
     *
     * If the modal is dismissed (cancelled), the Observable completes without emitting.
     * If the modal is closed with a result, the Observable emits that result and completes.
     *
     * @param component The component to display in the modal
     * @param options NgbModal options (backdrop, size, etc.)
     * @returns Observable that emits the modal result or completes if dismissed
     */
    open$<T>(component: Type<unknown>, options?: NgbModalOptions): Observable<T> {
        const modalRef: NgbModalRef = this.ngbModal.open(component, options);
        return from(modalRef.result as Promise<T>).pipe(
            catchError(() => EMPTY), // User dismissed modal - complete gracefully
        );
    }

    /**
     * Opens a modal and returns the NgbModalRef for advanced use cases.
     *
     * Use this when you need direct access to the modal instance
     * (e.g., to set component inputs before subscribing to the result).
     *
     * @param component The component to display in the modal
     * @param options NgbModal options (backdrop, size, etc.)
     * @returns The NgbModalRef instance
     *
     * @example
     * ```typescript
     * const modalRef = this.ModalService.openRef(MyComponent, { size: 'lg' });
     * modalRef.componentInstance.data = myData;
     *
     * this.ModalService.result$(modalRef)
     *   .pipe(switchMap(result => ...))
     *   .subscribe(...);
     * ```
     */
    openRef(component: Type<unknown>, options?: NgbModalOptions): NgbModalRef {
        return this.ngbModal.open(component, options);
    }

    /**
     * Converts a modal reference's result to an Observable with automatic dismissal handling.
     *
     * Use with openRef() when you need to configure the modal before subscribing.
     *
     * @param modalRef The modal reference from openRef()
     * @returns Observable that emits the modal result or completes if dismissed
     */
    result$<T>(modalRef: NgbModalRef): Observable<T> {
        return from(modalRef.result as Promise<T>).pipe(
            catchError(() => EMPTY), // User dismissed modal - complete gracefully
        );
    }

    /**
     * Closes all open modals.
     *
     * Useful for cleanup or when navigating away from a page with modals.
     */
    dismissAll(): void {
        this.ngbModal.dismissAll();
    }

    /**
     * Returns true if any modals are currently open.
     */
    hasOpenModals(): boolean {
        return this.ngbModal.hasOpenModals();
    }
}
