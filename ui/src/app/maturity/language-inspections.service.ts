/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import type { HttpParams } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { ConfirmationDialogService } from '../shared/dialogs/confirmation-dialog.service';
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
            .open$(this.translate.instant('sitnet_confirm'), this.translate.instant('sitnet_confirm_assign_inspection'))
            .subscribe({
                next: () => {
                    this.http.put(`/app/inspection/${inspection.id}`, {}).subscribe({
                        next: () => this.router.navigate(['/staff/assessments', inspection.exam.id]),
                        error: this.toast.error,
                    });
                },
                error: this.toast.error,
            });
}
