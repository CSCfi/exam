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
import {IComponentController, IHttpResponse} from "angular";

export const EulaDialogComponent: angular.IComponentOptions = {
    template: `
    <div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <div class="student-enroll-title">{{'sitnet_accept_useragreement' | translate}}</div>
            </div>
            <div class="modal-body">
                <div ng-bind-html="$ctrl.settings.eula.value">
                </div>
            </div>
            <div class="student-message-dialog-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" ng-click="$ctrl.ok()">
                        {{'sitnet_button_accept' | translate}}
                    </button>
                </div>
                <div class="student-message-dialog-button-cancel">
                    <button class="btn btn-sm btn-danger pull-left" ng-click="$ctrl.cancel()">
                        {{'sitnet_button_decline' | translate}}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    bindings: {
        close: '&',
        dismiss: '&'
    },
    controller: class EulaDialogController implements IComponentController {

        settings: { eula: { value: string } };
        close: () => any;
        dismiss: (x: any) => any;

        constructor(private $http: angular.IHttpService) {
        }

        $onInit() {
            this.$http.get('/app/settings/agreement').then((resp: IHttpResponse<{value: string}>) =>
                this.settings = {eula: {value: resp.data.value}}
            ).catch(angular.noop);
        };

        cancel() {
            this.dismiss({$value: 'cancel'});
        }

        ok() {
            this.close();
        }

        static get $inject() {
            return ['$http'];
        }


    }

};
