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
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-collaborative-exam-owner-selector',
    template: `<div class="row mt-2">
            <div class="col-md-3 ">
                {{ 'i18n_exam_owners' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_exam_owner_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="" />
                </sup>
            </div>
            <div class="col-md-9">
                <form #myForm="ngForm" name="myForm">
                    <input
                        type="email"
                        name="email"
                        placeholder="{{ 'i18n_write_exam_owner_email' | translate }}"
                        class="form-control w-50 make-inline"
                        [(ngModel)]="newOwner.email"
                        email
                    />
                    <button
                        [disabled]="!myForm.valid || !newOwner.email || !user.isAdmin"
                        (click)="addOwner()"
                        class="btn btn-success"
                    >
                        {{ 'i18n_add' | translate }}
                    </button>
                </form>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3 "></div>
            <div class="col-md-9">
                <!-- Owners for the exam -->
                @for (owner of exam.examOwners; track owner) {
                    {{ owner.email }}
                    <button
                        class="btn btn-sm btn-link px-0"
                        [disabled]="!user.isAdmin"
                        (click)="removeOwner(owner.id)"
                        title="{{ 'i18n_remove' | translate }}"
                    >
                        <i class="bi bi-x-lg" [ngClass]="!user.isAdmin ? 'text-danger' : 'text-success'"></i>
                    </button>
                }
            </div>
        </div>`,
    standalone: true,
    imports: [NgClass, NgbPopover, FormsModule, TranslateModule],
})
export class CollaborativeExamOwnerSelectorComponent {
    @Input() exam!: Exam;

    user: User;
    newOwner: { email: string | undefined } = { email: undefined };

    constructor(
        private http: HttpClient,
        private toast: ToastrService,
        private Session: SessionService,
    ) {
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
