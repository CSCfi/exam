// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { disabled, form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Software } from 'src/app/facility/facility.model';
import type { ExamMachine } from 'src/app/reservation/reservation.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { MachineService } from './machines.service';

interface SoftwareWithActive extends Software {
    active: boolean;
}

@Component({
    templateUrl: './machine.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    selector: 'xm-machine',
    imports: [FormField, TranslateModule, PageHeaderComponent, PageContentComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineComponent {
    readonly machine = signal<ExamMachine | undefined>(undefined);
    readonly software = signal<SoftwareWithActive[]>([]);
    readonly machineForm = form(
        signal({
            name: '',
            otherIdentifier: '',
            surveillanceCamera: '',
            videoRecordings: '',
            ipAddress: '',
            outOfService: false,
            statusComment: '',
        }),
        (path) => {
            required(path.name);
            required(path.ipAddress);
            disabled(path.statusComment, ({ valueOf }) => !valueOf(path.outOfService));
        },
    );

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly machines = inject(MachineService);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    constructor() {
        this.machines.getMachine(this.route.snapshot.params.id).subscribe({
            next: (machine) => {
                this.machine.set(machine);
                this.machineForm.name().value.set(machine.name);
                this.machineForm.otherIdentifier().value.set(machine.otherIdentifier);
                this.machineForm.surveillanceCamera().value.set(machine.surveillanceCamera);
                this.machineForm.videoRecordings().value.set(machine.videoRecordings);
                this.machineForm.ipAddress().value.set(machine.ipAddress);
                this.machineForm.outOfService().value.set(machine.outOfService);
                this.machineForm.statusComment().value.set(machine.statusComment || '');
                this.machines.getSoftware().subscribe((data) => {
                    this.software.set(
                        data.map((s) => ({
                            ...s,
                            active: machine.softwareInfo.some((si) => si.id === s.id),
                        })),
                    );
                });
            },
            error: (err) => this.toast.error(err),
        });
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

    toggleSoftware(software: SoftwareWithActive) {
        const currentMachine = this.machine();
        if (!currentMachine) return;

        this.machines.toggleMachineSoftware(currentMachine.id, software.id).subscribe({
            next: (response) => {
                this.software.update((items) =>
                    items.map((item) =>
                        item.id === software.id ? { ...item, active: response.turnedOn === true } : item,
                    ),
                );
            },
            error: (err) => this.toast.error(err),
        });
    }

    updateMachine(cb?: () => void) {
        const currentMachine = this.machine();
        if (!currentMachine) return;
        const outOfService = this.machineForm.outOfService().value() === true;
        const updatedMachine: ExamMachine = {
            ...currentMachine,
            name: this.machineForm.name().value() || '',
            otherIdentifier: this.machineForm.otherIdentifier().value() || '',
            surveillanceCamera: this.machineForm.surveillanceCamera().value() || '',
            videoRecordings: this.machineForm.videoRecordings().value() || '',
            ipAddress: this.machineForm.ipAddress().value() || '',
            outOfService,
            statusComment: outOfService ? this.machineForm.statusComment().value() || '' : undefined,
        };
        this.machine.set(updatedMachine);

        this.machines.updateMachine(updatedMachine).subscribe({
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
        if (!this.machineForm.outOfService().value()) {
            this.machineForm.statusComment().value.set('');
        }
    }
}
