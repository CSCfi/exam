// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamMachine, ExamRoom } from 'src/app/reservation/reservation.model';

@Component({
    templateUrl: './machines.component.html',
    selector: 'xm-machines',
    imports: [NgbPopover, RouterLink, TranslateModule],
    styleUrls: ['./machines.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineListComponent {
    readonly room = input.required<ExamRoom>();

    readonly showMachines = linkedSignal<boolean>(() => {
        void this.room();
        return false;
    });
    readonly machines = linkedSignal(() => this.sort([...this.room().examMachines]));

    readonly countMachineAlerts = computed(() => {
        const currentRoom = this.room();
        return currentRoom ? currentRoom.examMachines.filter((m) => m.outOfService).length : 0;
    });

    readonly countMachineNotices = computed(() => {
        const currentRoom = this.room();
        return currentRoom ? currentRoom.examMachines.filter((m) => !m.outOfService && m.statusComment).length : 0;
    });

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    toggleShow() {
        this.showMachines.update((v) => !v);
    }

    addNewMachine() {
        const currentRoom = this.room();
        this.http.post<ExamMachine>(`/app/machines/${currentRoom.id}`, {}).subscribe({
            next: (resp) => {
                this.toast.info(this.translate.instant('i18n_machine_added'));
                // Update room object for backward compatibility
                currentRoom.examMachines.push(resp);
                // Update local machines signal
                this.machines.set(this.sort([...currentRoom.examMachines]));
            },
            error: (err) => this.toast.error(err.data),
        });
    }

    private sort(machines: ExamMachine[]): ExamMachine[] {
        return [...machines].sort((a, b) => ('' + a.name).localeCompare(b.name));
    }
}
