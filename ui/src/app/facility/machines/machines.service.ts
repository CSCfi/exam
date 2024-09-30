// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Software } from 'src/app/facility/facility.model';
import type { ExamMachine } from 'src/app/reservation/reservation.model';

@Injectable({ providedIn: 'root' })
export class MachineService {
    constructor(private http: HttpClient) {}

    softwareApi = () => '/app/softwares';
    machineSoftwareApi = (mid: number, sid: number) => `/app/machine/${mid}/software/${sid}`;
    machineApi = (id: number) => `/app/machines/${id}`;

    getSoftware = () => this.http.get<Software[]>(this.softwareApi());
    toggleMachineSoftware = (mid: number, sid: number) =>
        this.http.post<Software>(this.machineSoftwareApi(mid, sid), {});
    getMachine = (id: number) => this.http.get<ExamMachine>(this.machineApi(id));
    updateMachine = (body: ExamMachine) => this.http.put<ExamMachine>(this.machineApi(body.id), body);
    insertMachine = (id: number, body: ExamMachine) => this.http.post<ExamMachine>(this.machineApi(id), body);
    removeMachine = (id: number) => this.http.delete<ExamMachine>(this.machineApi(id));
}
