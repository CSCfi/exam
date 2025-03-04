// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppConfig } from 'src/app/administrative/administrative.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
    constructor(private http: HttpClient) {}

    updateAgreement$ = (config: AppConfig, bypassAgreementUpdate = false) =>
        this.http.put('/app/settings/agreement', { value: config.eula, minorUpdate: bypassAgreementUpdate });

    updateDeadline$ = (config: AppConfig) => this.http.put('/app/settings/deadline', { value: config.reviewDeadline });

    updateReservationWindow$ = (config: AppConfig) =>
        this.http.put('/app/settings/reservationWindow', { value: config.reservationWindowSize });

    listAttributes$ = () => this.http.get<string[]>('/app/attributes');

    getConfig$ = () => this.http.get<AppConfig>('/app/config');
}
