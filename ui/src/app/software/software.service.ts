// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Software } from 'src/app/facility/facility.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({
    providedIn: 'root',
})
export class SoftwareService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
        private toast: ToastrService,
        private translate: TranslateService,
    ) {}

    listSoftware$(): Observable<Software[]> {
        return this.http
            .get<Software[]>('/app/softwares')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SoftwareService.listSoftware$')));
    }

    updateSoftware$(software: Software): Observable<void> {
        return this.http.put<void>(`/app/softwares/${software.id}/${software.name}`, {}).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_software_updated'))),
            catchError((err) => this.errorHandler.handle(err, 'SoftwareService.updateSoftware$')),
        );
    }

    addSoftware$(name: string): Observable<Software> {
        return this.http.post<Software>(`/app/softwares/${name}`, {}).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_software_added'))),
            catchError((err) => this.errorHandler.handle(err, 'SoftwareService.addSoftware$')),
        );
    }

    removeSoftware$(software: Software): Observable<void> {
        return this.http.delete<void>(`/app/softwares/${software.id}`).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_software_removed'))),
            catchError((err) => this.errorHandler.handle(err, 'SoftwareService.removeSoftware$')),
        );
    }
}
