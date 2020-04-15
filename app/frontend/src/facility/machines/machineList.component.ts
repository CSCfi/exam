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

interface Software {
    id: number;
    name: string;
}

interface ExamMachine {
    id: number;
    name: string;
    outOfService: boolean;
    software: Software[];
    statusComment: string;
}

interface ExamRoom {
    id: number;
    examMachines: ExamMachine[];
}

export const MachineListComponent: angular.IComponentOptions = {
    template: require('./machineList.template.html'),
    bindings: {
        room: '<',
    },
    controller: class MachineListController implements angular.IComponentController, angular.IOnInit {
        room: ExamRoom;
        showMachines: boolean;

        constructor(private $http: angular.IHttpService, private $translate: angular.translate.ITranslateService) {
            'ngInject';
        }

        $onInit() {
            this.showMachines = false;
        }

        toggleShow = () => (this.showMachines = !this.showMachines);

        countMachineAlerts = (): number => (this.room ? this.room.examMachines.filter(m => m.outOfService).length : 0);

        countMachineNotices = (): number =>
            this.room ? this.room.examMachines.filter(m => !m.outOfService && m.statusComment).length : 0;

        addNewMachine = () =>
            this.$http
                .post(`/app/machines/${this.room.id}`, {})
                .then((resp: angular.IHttpResponse<ExamMachine>) => {
                    toast.info(this.$translate.instant('sitnet_machine_added'));
                    this.room.examMachines.push(resp.data);
                })
                .catch(err => toast.error(err.data));
    },
};

angular.module('app.facility.machines').component('machineList', MachineListComponent);
