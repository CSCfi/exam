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
    selector: 'xm-collaborative-exam-owner-selector',
    template: `<div class="row mt-2">
            <div class="col-md-3 exam-basic-title">
                {{ 'sitnet_exam_owners' | translate }}
                <sup
                    ngbPopover="{{ 'sitnet_exam_owner_description' | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img
                        src="/assets/images/icon_tooltip.svg"
                        alt=""
                        onerror="this.onerror=null;this.src='/assets/images/icon_tooltip.png'"
                    />
                </sup>
            </div>
            <div class="col-md-9">
                <form #myForm="ngForm" name="myForm">
                    <input
                        type="email"
                        name="email"
                        placeholder="{{ 'sitnet_write_exam_owner_email' | translate }}"
                        class="form-control wdth-30 make-inline"
                        [(ngModel)]="newOwner.email"
                        email
                    />
                    <button
                        [disabled]="!myForm.valid || !newOwner.email || !user.isAdmin"
                        (click)="addOwner()"
                        class="btn btn-primary green"
                    >
                        {{ 'sitnet_add' | translate }}
                    </button>
                </form>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3 exam-basic-title"></div>
            <div class="col-md-9">
                <ul class="list-group list-group-horizontal">
                    <!-- Owners for the exam -->
                    <li class="list-group-item" *ngFor="let owner of exam.examOwners">
                        {{ owner.email }}
                        <button
                            class="reviewer-remove"
                            [disabled]="!user.isAdmin"
                            (click)="removeOwner(owner.id)"
                            title="{{ 'sitnet_remove' | translate }}"
                        >
                            <img
                                [hidden]="exam.state === 'PUBLISHED'"
                                src="/assets/images/icon_remove.svg"
                                alt=""
                                onerror="this.onerror=null;this.src='/assets/images/icon_remove.png'"
                            />
                        </button>
                    </li>
                </ul>
            </div>
        </div> `,
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
                error: (err) => this.toast.error(err),
            });
        }
    };

    removeOwner = (id: number) => {
        this.http.delete(`/app/iop/exams/${this.exam.id}/owners/${id}`).subscribe({
            next: () => (this.exam.examOwners = this.exam.examOwners.filter((o) => o.id !== id)),
            error: (err) => this.toast.error(err),
        });
    };
}
