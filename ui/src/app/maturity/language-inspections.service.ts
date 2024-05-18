// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpParams } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { InspectionStatementDialogComponent } from './dialogs/inspection-statement-dialog.component';
import type { LanguageInspection } from './maturity.model';

export interface QueryParams {
    text?: string;
    start?: number;
    end?: number;
}

@Injectable({ providedIn: 'root' })
export class LanguageInspectionService {
    constructor(
        private http: HttpClient,
        private router: Router,
        private modal: NgbModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
    ) {}

    query = (params: QueryParams | { month?: string }): Observable<LanguageInspection[]> =>
        this.http.get<LanguageInspection[]>('/app/inspections', { params: params as HttpParams });

    showStatement = (statement: { comment: string }) => {
        const modalRef = this.modal.open(InspectionStatementDialogComponent, {
            backdrop: 'static',
            keyboard: true,
        });
        modalRef.componentInstance.statement = statement.comment;
    };

    assignInspection = (inspection: LanguageInspection) =>
        this.dialogs
            .open$(this.translate.instant('i18n_confirm'), this.translate.instant('i18n_confirm_assign_inspection'))
            .subscribe({
                next: () => {
                    this.http.put(`/app/inspection/${inspection.id}`, {}).subscribe({
                        next: () => this.router.navigate(['/staff/assessments', inspection.exam.id]),
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });
}
