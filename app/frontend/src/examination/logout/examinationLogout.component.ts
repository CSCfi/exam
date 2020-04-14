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
import { StateParams, StateService } from '@uirouter/core';
import * as angular from 'angular';

export const ExaminationLogoutComponent: angular.IComponentOptions = {
    template: `
        <div class="jumbotron">
            <h1>{{'sitnet_end_of_exam' | translate}}</h2>
            <h2>
                {{$ctrl.reasonPhrase | translate}}
            </h2>
            <h3>
                <u>
                    <a ng-if="$ctrl.quitLink" ng-href="{{$ctrl.quitLink}}">{{'sitnet_quit_seb' | translate}}</a>
                </u>
            </h3>
        </div>
    `,
    controller: class ExaminationLogoutController implements angular.IComponentController {
        quitLinkEnabled: boolean;
        reasonPhrase: string;
        quitLink: string;

        constructor(
            private $rootScope: angular.IRootScopeService,
            private $http: angular.IHttpService,
            private $stateParams: StateParams,
            private $state: StateService,
            private $timeout: angular.ITimeoutService,
        ) {
            'ngInject';
        }

        private logout = () =>
            this.$timeout(() => {
                this.$rootScope.$broadcast('examEnded');
                this.$state.go('logout');
            }, 8000);

        $onInit = () => {
            this.reasonPhrase = this.$stateParams.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';
            this.quitLinkEnabled = this.$stateParams.quitLinkEnabled === 'true';

            if (this.quitLinkEnabled) {
                this.$http
                    .get('/app/settings/examinationQuitLink')
                    .then((resp: angular.IHttpResponse<{ quitLink: string }>) => {
                        this.quitLink = resp.data.quitLink;
                    })
                    .catch(
                        // Fetching quit link failed for some reason, just log out
                        () => this.logout(),
                    );
            } else {
                this.logout();
            }
        };
    },
};

angular.module('app.examination').component('examinationLogout', ExaminationLogoutComponent);
