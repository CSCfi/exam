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
    hasCourseSearchIntegration: boolean;
    hasEnrolmentCheckIntegration: boolean;
    isGradeScaleOverridable: boolean;
    isInteroperable: boolean;
    defaultTimeZone: string;
    maxFileSize: number;
    reservationWindowSize: number;
    reviewDeadline: number;
    roles: { ADMIN: string[], TEACHER: string[], STUDENT: string[] };
    supportsMaturity: boolean;
    supportsPrintouts: boolean;
}

export const SettingsComponent: angular.IComponentOptions = {
    template: require('./settings.template.html'),
    controller: class SettingsController {

        config: AppConfig;
        attributes: string[];

        constructor(private $translate: angular.translate.ITranslateService,
            private $http: angular.IHttpService,
            private Settings: any
        ) {
            'ngInject';
        }

        private onSuccess = () =>
            toast.info(this.$translate.instant('sitnet_settings') + ' ' +
                this.$translate.instant('sitnet_updated'))

        private onError = (error) => toast.error(error.data);

        $onInit = function () {
            this.Settings.config.get((config: AppConfig) => {
                this.config = config;
            });
        };

        updateAgreement = () =>
            this.Settings.agreement.update(this.config.eula, this.onSuccess, this.onError)

        updateDeadline = () =>
            this.Settings.deadline.update(this.config.reviewDeadline, this.onSuccess, this.onError)

        updateReservationWindow = () =>
            this.Settings.reservationWindow.update(this.config.reservationWindowSize, this.onSuccess, this.onError)

        showAttributes = () => this.$http.get('/attributes').then((resp: angular.IHttpResponse<string[]>) =>
            this.attributes = resp.data
        )
    }
};

angular.module('app.administrative.settings').component('settings', SettingsComponent);
