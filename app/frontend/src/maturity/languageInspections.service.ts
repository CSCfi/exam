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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { Observable } from 'rxjs';
import * as toast from 'toastr';

import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { InspectionStatementDialogComponent } from './dialogs/inspectionStatementDialog.component';
import { LanguageInspection } from './maturity.model';

export interface QueryParams {
    text?: string;
    start?: number;
    end?: number;
}

@Injectable()
export class LanguageInspectionService {
    constructor(
        private http: HttpClient,
        private state: StateService,
        private modal: NgbModal,
        private translate: TranslateService,
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
        modalRef.result.catch(angular.noop);
    };

    assignInspection = (inspection: LanguageInspection) => {
        const dialog = this.dialogs.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_confirm_assign_inspection'),
        );
        dialog.result.then(() => {
            this.http
                .put(`/app/inspection/${inspection.id}`, {})
                .subscribe(() => this.state.go('assessment', { id: inspection.exam.id }), err => toast.error(err.data));
        });
    };
}
