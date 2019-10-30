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
}

export const SettingsComponent: angular.IComponentOptions = {
    template: require('./settings.template.html'),
    controller: class SettingsController implements angular.IComponentController {
        config: AppConfig;
        attributes: string[];

        constructor(private $translate: angular.translate.ITranslateService, private $http: angular.IHttpService) {
            'ngInject';
        }

        private onSuccess = () =>
            toast.info(this.$translate.instant('sitnet_settings') + ' ' + this.$translate.instant('sitnet_updated'));

        private onError = (error: { data: string }) => toast.error(error.data);

        $onInit = () => {
            this.$http.get('/app/config').then((resp: angular.IHttpResponse<AppConfig>) => {
                this.config = resp.data;
            });
        };

        updateAgreement = () =>
            this.$http
                .put('/app/settings/agreement', { value: this.config.eula })
                .then(this.onSuccess)
                .catch(this.onError);

        updateDeadline = () =>
            this.$http
                .put('/app/settings/deadline', { value: this.config.reviewDeadline })
                .then(this.onSuccess)
                .catch(this.onError);

        updateReservationWindow = () =>
            this.$http
                .put('/app/settings/reservationWindow', { value: this.config.reservationWindowSize })
                .then(this.onSuccess)
                .catch(this.onError);

        showAttributes = () =>
            this.$http
                .get('/attributes')
                .then((resp: angular.IHttpResponse<string[]>) => (this.attributes = resp.data));
    },
};

angular.module('app.administrative.settings').component('settings', SettingsComponent);
