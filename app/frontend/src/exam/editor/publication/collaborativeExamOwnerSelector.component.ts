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
import * as toast from 'toastr';

import { SessionService, User } from '../../../session/session.service';
import { Exam } from '../../exam.model';

@Component({
    selector: 'collaborative-exam-owner-selector',
    template: require('./collaborativeExamOwnerSelector.component.html'),
})
export class CollaborativeExamOwnerSelectorComponent implements OnInit {
    @Input() exam: Exam;

    user: User;
    newOwner: { email: string | null };

    constructor(private http: HttpClient, private Session: SessionService) {}

    ngOnInit() {
        this.user = this.Session.getUser();
    }

    addOwner = () => {
        const exists = this.exam.examOwners.some(o => o.email === this.newOwner.email);
        if (!exists) {
            this.http.post<User>(`/integration/iop/exams/${this.exam.id}/owners`, this.newOwner).subscribe(
                user => {
                    this.exam.examOwners.push(user);
                    delete this.newOwner.email;
                },
                resp => toast.error(resp.data),
            );
        }
    };

    removeOwner = (id: number) => {
        this.http.delete(`/integration/iop/exams/${this.exam.id}/owners/${id}`).subscribe(
            () => (this.exam.examOwners = this.exam.examOwners.filter(o => o.id !== id)),
            resp => toast.error(resp.data),
        );
    };
}
