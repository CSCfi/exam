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
import { Injectable } from '@angular/core';
import type { Software } from 'src/app/exam/exam.model';
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
