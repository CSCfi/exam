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

export const ExaminationLogoutComponent: angular.IComponentOptions = {
    template: `
        <div id="sitnet-header" class="header">
            <div class="col-md-12 header-wrapper">
                <span class="header-text">{{'sitnet_end_of_exam' | translate}}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="exam-logout-wrapper">
                <h3 ng-if="!$ctrl.quitLinkEnabled" class="text-info" style="text-align: center">
                <h3 ng-if="$ctrl.quitLinkEnabled" class="text-info" style="text-align: center">
                    {{$ctrl.reasonPhrase | translate}}
                </h3>
                <a ng-if="$ctrl.quitLinkEnabled" class="text-info" style="text-align: center"
                    ng-href="{{$ctrl.quitLink}}">{{'sitnet_quit_seb' | translate}}
                </a>
            </div>
        </div>
    `,
    controller: class ExaminationLogoutController implements angular.IComponentController {
        quitLinkEnabled: boolean;
        reasonPhrase: string;
        quitLink: string;

        constructor(
            private $rootScope: angular.IRootScopeService,
            private $http: angular.IHttpService,
            private $routeParams: angular.route.IRouteParamsService,
            private $location: angular.ILocationService,
            private $timeout: angular.ITimeoutService
        ) {
            'ngInject';
        }

        $onInit = () => {
            this.reasonPhrase = this.$routeParams.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';
            this.quitLinkEnabled = this.$routeParams.quitLinkEnabled === 'true';

            if (this.quitLinkEnabled) {
                this.$http.get('/app/settings/examinationQuitLink').then(
                    (resp: angular.IHttpResponse<{ quitLink: string }>) => {
                        this.quitLink = resp.data.quitLink;
                    }).catch(() => {
                        // Fetching quit link failed for some reason, just log out
                        this.$timeout(() => {
                            this.$rootScope.$broadcast('examEnded');
                            this.$location.path('/logout');
                        }, 4000);
                    });
            } else {
                this.$timeout(() => {
                    this.$rootScope.$broadcast('examEnded');
                    this.$location.path('/logout');
                }, 8000);
            }
        }

    }
};

angular.module('app.examination').component('examinationLogout', ExaminationLogoutComponent);
