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
import {IComponentController} from 'angular';

export const SelectRoleDialogComponent: angular.IComponentOptions = {
    template: require('./selectRoleDialog.template.html'),
    bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
    },
    controller: class SelectRoleDialogController implements IComponentController {

        user: any;
        resolve: any;
        close: (x: any) => any;
        dismiss: (x: any) => any;

        $onInit() {
            this.user = this.resolve.user;
        };

        ok(role) {
            this.close({$value: role});
        };

        cancel() {
            this.dismiss('cancel');
        };
    }
};
