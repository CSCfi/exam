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
import { Component, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import type { Exam } from '../../exam.model';

@Component({
    selector: 'collaborative-exam-owner-selector',
    templateUrl: './collaborativeExamOwnerSelector.component.html',
})
export class CollaborativeExamOwnerSelectorComponent {
    @Input() exam!: Exam;

    user: User;
    newOwner: { email: string | undefined } = { email: undefined };

    constructor(private http: HttpClient, private toast: ToastrService, private Session: SessionService) {
        this.user = this.Session.getUser();
    }

    addOwner = () => {
        const exists = this.exam.examOwners.some((o) => o.email === this.newOwner.email);
        if (!exists) {
            this.http.post<User>(`/app/iop/exams/${this.exam.id}/owners`, this.newOwner).subscribe({
                next: (user) => {
                    this.exam.examOwners.push(user);
                    delete this.newOwner.email;
                },
                error: this.toast.error,
            });
        }
    };

    removeOwner = (id: number) => {
        this.http.delete(`/app/iop/exams/${this.exam.id}/owners/${id}`).subscribe({
            next: () => (this.exam.examOwners = this.exam.examOwners.filter((o) => o.id !== id)),
            error: this.toast.error,
        });
    };
}
