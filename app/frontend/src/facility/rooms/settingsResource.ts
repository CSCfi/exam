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
import * as angular from 'angular';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class SettingsResourceService {
    constructor(private http: HttpClient) {}

    hostname = () => this.http.get('/app/settings/hostname');
    examDurations = () => this.http.get('/app/settings/durations');
    gradeScale = () => this.http.get('/app/settings/gradescale');
    enrolmentPermissions = () => this.http.get('/app/settings/enrolmentPermissionCheck');
    environment = () => this.http.get('/app/settings/environment');
    examVisit = () => this.http.get('/app/settings/iop/examVisit');
    anonymousReviewEnabled = () => this.http.get('/app/settings/anonymousReviewEnabled');
    maxFilesize = () => this.http.get('/app/settings/maxfilesize');
    appVersion = () => this.http.get('/app/settings/appVersion');
    maturityInstructions = () => this.http.get('/app/settings/maturityInstructions');
}
