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
import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import type { Software } from '../../exam/exam.model';
import type { ExamMachine } from '../../reservation/reservation.model';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { MachineService } from './machines.service';

interface SoftwareWithClass extends Software {
    class: string;
}

@Component({
    templateUrl: './machine.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    selector: 'xm-machine',
    standalone: true,
    imports: [FormsModule, NgClass, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class MachineComponent implements OnInit {
    machine!: ExamMachine;
    software: SoftwareWithClass[] = [];

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private Confirmation: ConfirmationDialogService,
        private machines: MachineService,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.machines.getMachine(this.route.snapshot.params.id).subscribe({
            next: (machine) => {
                this.machine = machine;
                this.machines.getSoftware().subscribe(
                    (data) =>
                        (this.software = data.map((s) => ({
                            ...s,
                            class:
                                this.machine.softwareInfo.map((si) => si.id).indexOf(s.id) > -1
                                    ? 'bg-success'
                                    : 'bg-secondary',
                        }))),
                );
            },
            error: (err) => this.toast.error(err),
        });
    }

    removeMachine = (machine: ExamMachine) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_machine'),
        ).subscribe({
            next: () =>
                this.machines.removeMachine(machine.id).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('i18n_machine_removed'));
                        this.router.navigate(['staff/rooms']);
                    },
                    error: (err) => this.toast.error(err),
                }),
            error: (err) => this.toast.error(err),
        });

    toggleSoftware = (software: SoftwareWithClass) => {
        this.machines.toggleMachineSoftware(this.machine.id, software.id).subscribe({
            next: (response) => (software.class = response.turnedOn === true ? 'bg-success' : 'bg-secondary'),
            error: (err) => this.toast.error(err),
        });
    };

    updateMachine = (cb?: () => void) =>
        this.machines.updateMachine(this.machine).subscribe({
            next: () => this.toast.info(this.translate.instant('i18n_machine_updated')),
            error: (err) => this.toast.error(this.translate.instant(err)),
            complete: () => {
                if (cb) cb();
            },
        });

    updateMachineAndExit = () => this.updateMachine(() => this.router.navigate(['staff/rooms']));

    setReason = () => {
        if (!this.machine.outOfService) {
            delete this.machine.statusComment;
        }
    };
}
