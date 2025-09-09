// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input, inject } from '@angular/core';
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
})
export class MachineListComponent implements OnInit {
    @Input() room!: ExamRoom;

    showMachines = false;
    machines: ExamMachine[] = [];

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    ngOnInit() {
        this.showMachines = false;
        this.machines = this.sort(this.room.examMachines);
    }

    toggleShow = () => (this.showMachines = !this.showMachines);

    countMachineAlerts = (): number => (this.room ? this.room.examMachines.filter((m) => m.outOfService).length : 0);

    countMachineNotices = (): number =>
        this.room ? this.room.examMachines.filter((m) => !m.outOfService && m.statusComment).length : 0;

    addNewMachine = () =>
        this.http.post<ExamMachine>(`/app/machines/${this.room.id}`, {}).subscribe({
            next: (resp) => {
                this.toast.info(this.translate.instant('i18n_machine_added'));
                this.room.examMachines.push(resp);
                this.machines = this.sort(this.room.examMachines);
            },
            error: (err) => this.toast.error(err.data),
        });

    private sort = (machines: ExamMachine[]) => machines.sort((a, b) => ('' + a.name).localeCompare(b.name));
}
