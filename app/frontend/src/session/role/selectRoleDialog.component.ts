/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import * as angular from 'angular';
import { IComponentController } from 'angular';
import { Role, User } from '../session.service';

export const SelectRoleDialogComponent: angular.IComponentOptions = {
    template: `
    <div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <h1 class="student-enroll-title">
                    <i class="fa fa-user"></i>&nbsp;&nbsp;{{'sitnet_select_role' | translate}}</i>
                </h1>
            </div>
            <div class="modal-body">
                <span class="dropdown pointer" uib-dropdown>
                    <button uib-dropdown-toggle class="btn btn-default dropdown-toggle" type="button" id="dropDownMenu1"
                            data-toggle="dropdown" aria-expanded="true">
                        {{'sitnet_choose' | translate}}&nbsp;<span class="caret"></span>
                    </button>
                    <ul class="dropdown-menu">
                        <li ng-repeat="role in $ctrl.user.roles">
                            <a role="menuitem" title="{{role.displayName | translate}}" ng-click="$ctrl.ok(role)">
                                <i class="fa pull-right" ng-class="role.icon"></i>
                                {{role.displayName | translate}}
                            </a>
                        </li>
                    </ul>
                </span>
            </div>
            <div class="modal-footer">
                <div class="col-md-12">
                    <button class="btn btn-sm btn-danger pull-right" ng-click="$ctrl.cancel()">
                        {{'sitnet_button_decline' | translate}}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
    },
    controller: class SelectRoleDialogController implements IComponentController {

        user: User;
        resolve: { user: User };
        close: (x: { $value: Role }) => any;
        dismiss: () => any;

        $onInit() {
            this.user = this.resolve.user;
        }

        ok(role: Role) {
            this.close({ $value: role });
        }

        cancel() {
            this.dismiss();
        }
    }
};
