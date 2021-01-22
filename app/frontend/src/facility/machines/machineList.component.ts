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
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';
import { ExamMachine, ExamRoom } from '../../reservation/reservation.model';

@Component({
    template: require('./machineList.component.html'),
    selector: 'machine-list',
})
export class MachineListComponent implements OnInit {
    @Input() room: ExamRoom;
    showMachines: boolean;

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.showMachines = false;
    }

    toggleShow = () => (this.showMachines = !this.showMachines);

    countMachineAlerts = (): number => (this.room ? this.room.examMachines.filter(m => m.outOfService).length : 0);

    countMachineNotices = (): number =>
        this.room ? this.room.examMachines.filter(m => !m.outOfService && m.statusComment).length : 0;

    addNewMachine = () =>
        this.http.post<ExamMachine>(`/app/machines/${this.room.id}`, {}).subscribe(
            resp => {
                toast.info(this.translate.instant('sitnet_machine_added'));
                this.room.examMachines.push(resp);
            },
            err => toast.error(err.data),
        );
}
