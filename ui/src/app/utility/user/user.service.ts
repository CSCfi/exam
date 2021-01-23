/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the 'Licence');
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an 'AS IS' basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../session/session.service';

@Injectable()
export class UserService {
    constructor(private http: HttpClient) {}

    listUsersByRole$ = (role: string) => this.http.get<User[]>(`/app/users/byrole/${role}`);

    // was filterUsersByExam
    filterInspectorsByExam$ = (examId: number, role: string) =>
        this.http.get<User[]>(`/app/users/filter/${role}/${examId}`);

    filterOwnersByExam$ = (examId: number, role: string) =>
        this.http.get<User[]>(`/app/users/exam/owners/${role}/${examId}`);

    filterOwnersByQuestion$ = (role: string) => this.http.get<User[]>(`/app/users/question/owners/${role}`);

    getUnenrolledStudents$ = (examId: number) => this.http.get<User[]>(`/app/students/${examId}`);
}
