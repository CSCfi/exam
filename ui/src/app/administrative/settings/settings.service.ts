// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfig } from 'src/app/administrative/administrative.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    updateAgreement$ = (config: AppConfig, bypassAgreementUpdate = false): Observable<unknown> =>
        this.http
            .put('/app/settings/agreement', { value: config.eula, minorUpdate: bypassAgreementUpdate })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SettingsService.updateAgreement$')));

    updateDeadline$ = (config: AppConfig): Observable<unknown> =>
        this.http
            .put('/app/settings/deadline', { value: config.reviewDeadline })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SettingsService.updateDeadline$')));

    updateReservationWindow$ = (config: AppConfig): Observable<unknown> =>
        this.http
            .put('/app/settings/reservationWindow', { value: config.reservationWindowSize })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SettingsService.updateReservationWindow$')));

    listAttributes$ = (): Observable<string[]> =>
        this.http
            .get<string[]>('/app/attributes')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SettingsService.listAttributes$')));

    getConfig$ = (): Observable<AppConfig> =>
        this.http
            .get<AppConfig>('/app/config')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SettingsService.getConfig$')));
}
