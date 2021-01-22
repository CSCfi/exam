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
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';
import { StateService, StateParams } from '@uirouter/angular';

import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { MachineService } from './machines.service';
import { Software } from '../../exam/exam.model';
import { ExamMachine } from '../../reservation/reservation.model';

interface SoftwareWithClass extends Software {
    class: string;
}

@Component({
    template: require('./machine.component.html'),
    selector: 'machine',
})
export class MachineComponent implements OnInit {
    machine: ExamMachine;
    software: SoftwareWithClass[];

    constructor(
        private Confirmation: ConfirmationDialogService,
        private machines: MachineService,
        private translate: TranslateService,
        private state: StateService,
        private stateParams: StateParams,
    ) {}

    ngOnInit() {
        this.machines.getMachine(this.stateParams.id).subscribe(
            machine => {
                this.machine = machine;
                this.machines.getSoftware().subscribe(data => {
                    this.software = (data as unknown) as SoftwareWithClass[];
                    this.software.forEach(function(s) {
                        s.class =
                            this.machine.softwareInfo
                                .map((si: any) => {
                                    return si.id;
                                })
                                .indexOf(s.id) > -1
                                ? 'btn-info'
                                : 'btn-default';
                    });
                });
            },
            error => {
                toast.error(error.data);
            },
        );
    }

    removeMachine = (machine: ExamMachine) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_machine'),
        );
        dialog.result.then(() => {
            this.machines.removeMachine(machine.id).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_machine_removed'));
                    this.state.go('rooms');
                },
                error => {
                    toast.error(error.data);
                },
            );
        });
    };

    toggleSoftware = (software: SoftwareWithClass) => {
        this.machines.toggleMachineSoftware(this.machine.id, software.id).subscribe(
            response => {
                software.class = response.turnedOn === true ? 'btn-info' : 'btn-default';
            },
            error => {
                toast.error(error.data);
            },
        );
    };

    updateMachine = () => {
        return new Promise((resolve, reject) => {
            this.machines.updateMachine(this.machine).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_machine_updated'));
                    resolve(null);
                },
                error => {
                    toast.error(error.data);
                    reject();
                },
            );
        });
    };

    updateMachineAndExit = () => {
        this.updateMachine().then(function() {
            this.state.go('rooms');
        });
    };
}
