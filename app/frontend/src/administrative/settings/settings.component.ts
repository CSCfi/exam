import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

export interface AppConfig {
    eula: string;
    examDurations: number[];
    expirationPeriod: string;
    anonymousReviewEnabled: boolean;
    hasCourseSearchIntegration: boolean;
    hasEnrolmentCheckIntegration: boolean;
    isGradeScaleOverridable: boolean;
    isInteroperable: boolean;
    defaultTimeZone: string;
    maxFileSize: number;
    reservationWindowSize: number;
    reviewDeadline: number;
    roles: { ADMIN: string[]; TEACHER: string[]; STUDENT: string[] };
    supportsMaturity: boolean;
    supportsPrintouts: boolean;
    isExamVisitSupported: boolean;
    isExamCollaborationSupported: boolean;
    courseSearchIntegrationUrls: { [key: string]: string };
}

@Component({
    templateUrl: './settings.component.html',
    selector: 'settings',
})
export class SettingsComponent implements OnInit {
    config: AppConfig;
    attributes: string[];

    constructor(private translate: TranslateService, private http: HttpClient) {}

    private onSuccess = () =>
        toast.info(this.translate.instant('sitnet_settings') + ' ' + this.translate.instant('sitnet_updated'));

    private onError = (error: string) => toast.error(error);

    ngOnInit() {
        this.http.get<AppConfig>('/app/config').subscribe((resp) => {
            this.config = resp;
        });
    }

    updateAgreement = () =>
        this.http.put('/app/settings/agreement', { value: this.config.eula }).subscribe(this.onSuccess, this.onError);

    updateDeadline = () =>
        this.http
            .put('/app/settings/deadline', { value: this.config.reviewDeadline })
            .subscribe(this.onSuccess, this.onError);

    updateReservationWindow = () =>
        this.http
            .put('/app/settings/reservationWindow', { value: this.config.reservationWindowSize })
            .subscribe(this.onSuccess, this.onError);

    showAttributes = () => this.http.get('/attributes').subscribe((resp: string[]) => (this.attributes = resp));
}
