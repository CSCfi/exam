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
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamMachine, ExamRoom } from 'src/app/reservation/reservation.model';

@Component({
    templateUrl: './machines.component.html',
    selector: 'xm-machines',
    standalone: true,
    imports: [NgbPopover, NgClass, RouterLink, TranslateModule],
    styleUrls: ['./machines.component.scss'],
})
export class MachineListComponent implements OnInit {
    @Input() room!: ExamRoom;

    showMachines = false;
    machines: ExamMachine[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

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
