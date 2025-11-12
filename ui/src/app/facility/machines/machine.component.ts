// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Software } from 'src/app/facility/facility.model';
import type { ExamMachine } from 'src/app/reservation/reservation.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { MachineService } from './machines.service';

interface SoftwareWithClass extends Software {
    class: string;
}

@Component({
    templateUrl: './machine.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    selector: 'xm-machine',
    imports: [FormsModule, NgClass, TranslateModule, PageHeaderComponent, PageContentComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineComponent {
    machine = signal<ExamMachine | undefined>(undefined);
    software = signal<SoftwareWithClass[]>([]);

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private Confirmation = inject(ConfirmationDialogService);
    private machines = inject(MachineService);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    constructor() {
        this.machines.getMachine(this.route.snapshot.params.id).subscribe({
            next: (machine) => {
                this.machine.set(machine);
                this.machines.getSoftware().subscribe((data) => {
                    this.software.set(
                        data.map((s) => ({
                            ...s,
                            class:
                                machine.softwareInfo.map((si) => si.id).indexOf(s.id) > -1
                                    ? 'bg-success'
                                    : 'bg-light text-dark',
                        })),
                    );
                });
            },
            error: (err) => this.toast.error(err),
        });
    }

    updateMachineProperty<K extends keyof ExamMachine>(key: K, value: ExamMachine[K]) {
        const currentMachine = this.machine();
        if (currentMachine) {
            this.machine.set({ ...currentMachine, [key]: value });
        }
    }

    removeMachine(machine: ExamMachine) {
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
        });
    }

    toggleSoftware(software: SoftwareWithClass) {
        const currentMachine = this.machine();
        if (!currentMachine) return;

        this.machines.toggleMachineSoftware(currentMachine.id, software.id).subscribe({
            next: (response) => {
                const newClass = response.turnedOn === true ? 'bg-success' : 'bg-light text-dark';
                this.software.update((items) =>
                    items.map((item) => (item.id === software.id ? { ...item, class: newClass } : item)),
                );
            },
            error: (err) => this.toast.error(err),
        });
    }

    updateMachine(cb?: () => void) {
        const currentMachine = this.machine();
        if (!currentMachine) return;

        this.machines.updateMachine(currentMachine).subscribe({
            next: () => this.toast.info(this.translate.instant('i18n_machine_updated')),
            error: (err) => this.toast.error(this.translate.instant(err)),
            complete: () => {
                if (cb) cb();
            },
        });
    }

    updateMachineAndExit() {
        this.updateMachine(() => this.router.navigate(['staff/rooms']));
    }

    setReason() {
        const currentMachine = this.machine();
        if (!currentMachine) return;

        if (!currentMachine.outOfService) {
            this.machine.set({ ...currentMachine, statusComment: undefined });
        }
    }
}
