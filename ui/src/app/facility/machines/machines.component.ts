// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamMachine, ExamRoom } from 'src/app/reservation/reservation.model';

@Component({
    templateUrl: './machines.component.html',
    selector: 'xm-machines',
    imports: [NgbPopover, NgClass, RouterLink, TranslateModule],
    styleUrls: ['./machines.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineListComponent {
    room = input.required<ExamRoom>();

    showMachines = signal(false);
    machines = signal<ExamMachine[]>([]);

    countMachineAlerts = computed(() => {
        const currentRoom = this.room();
        return currentRoom ? currentRoom.examMachines.filter((m) => m.outOfService).length : 0;
    });

    countMachineNotices = computed(() => {
        const currentRoom = this.room();
        return currentRoom ? currentRoom.examMachines.filter((m) => !m.outOfService && m.statusComment).length : 0;
    });

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    constructor() {
        effect(() => {
            const currentRoom = this.room();
            this.showMachines.set(false);
            this.machines.set(this.sort([...currentRoom.examMachines]));
        });
    }

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
