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
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../session/session.service';

export enum UserRole {
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN',
}

@Injectable()
export class UserResourceService {
    constructor(private http: HttpClient) {}

    private userRolesApi = (id: number, role: UserRole) => `/app/users/${id}/roles/${role}`;
    private usersByRoleApi = (role: UserRole) => `/app/users/byrole/${role}`;
    private filterUsersByExamApi = (eid: number, role: UserRole) => `/app/users/filter/${role}/${eid}`;
    private filterOwnersByExamApi = (eid: number, role: UserRole) => `/app/users/exam/owners/${role}/${eid}`;
    private filterOwnersByQuestionApi = (role: UserRole) => `/app/users/question/owners/${role}`;
    private updateAgreementAcceptedApi = () => '/app/users/agreement';
    private unenrolledStudentsApi = (eid: number) => `/app/students/${eid}`;

    updateUserRoles = (id: number, role: UserRole, body: any) => this.http.put(this.userRolesApi(id, role), body);
    usersByRole = (role: UserRole) => this.http.get<User[]>(this.usersByRoleApi(role));
    filterUsersByExam = (eid: number, role: UserRole) => this.http.get(this.filterUsersByExamApi(eid, role));
    filterOwnersByExam = (eid: number, role: UserRole) => this.http.get(this.filterOwnersByExamApi(eid, role));
    filterOwnersByQuestion = (role: UserRole) => this.http.get(this.filterOwnersByQuestionApi(role));
    updateAgreementAccepted = (body: any) => this.http.put(this.updateAgreementAcceptedApi(), body);
    unenrolledStudents = (eid: number) => this.http.get(this.unenrolledStudentsApi(eid));
}
