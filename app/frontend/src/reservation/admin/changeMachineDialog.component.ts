/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

import * as angular from 'angular';
import * as toast from 'toastr';
import { IHttpResponse } from 'angular';
import { Option } from '../../utility/select/dropDownSelect.component';

export const ChangeMachineDialogComponent: angular.IComponentOptions = {
    template: require('./changeMachineDialog.template.html'),
    bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&',
    },
    controller: class ChangeMachineDialogController implements angular.IComponentController {
        resolve: { reservation: { id: number } };
        close: (_: any) => void;
        dismiss: () => void;

        selection: { id: number };
        availableMachineOptions: Option[];
        reservation: { id: number };

        constructor(private $http: angular.IHttpService, private $translate: angular.translate.ITranslateService) {
            'ngInject';
        }

        $onInit() {
            this.reservation = this.resolve.reservation;
            this.$http
                .get(`/app/reservations/${this.reservation.id}/machines`)
                .then((resp: IHttpResponse<any[]>) => {
                    this.availableMachineOptions = resp.data.map(o => {
                        return {
                            id: o.id,
                            label: o.name,
                            value: o,
                        };
                    });
                })
                .catch(angular.noop);
        }

        machineChanged = machine => (this.selection = machine);

        ok() {
            this.$http
                .put(`/app/reservations/${this.reservation.id}/machine`, { machineId: this.selection.id })
                .then((resp: angular.IHttpResponse<any>) => {
                    toast.info(this.$translate.instant('sitnet_updated'));
                    this.close({
                        $value: {
                            msg: 'Accepted',
                            machine: resp.data,
                        },
                    });
                })
                .catch(resp => toast.error(resp.data));
        }

        cancel() {
            this.close({ $value: 'Dismissed' });
        }
    },
};
