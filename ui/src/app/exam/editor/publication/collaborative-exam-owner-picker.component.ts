// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
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
                @for (owner of exam().examOwners; track owner) {
                    <div class="ms-1 row" [ngClass]="{ 'hover-grey': !user.isAdmin }">
                        <div class="row col-8">
                            {{ owner.email }}
                        </div>
                        <!-- Remove button -->
                        <button
                            class="btn btn-danger btn-sm ms-1 w-auto m-1"
                            (click)="removeOwner(owner.id)"
                            [hidden]="!user.isAdmin"
                            [attr.aria-label]="owner.email"
                        >
                            {{ 'i18n_remove' | translate }}
                        </button>
                    </div>
                }
            </div>
        </div>`,
    imports: [NgClass, NgbPopover, FormsModule, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborativeExamOwnerSelectorComponent {
    exam = input.required<Exam>();

    user: User;
    newOwner: { email: string | undefined } = { email: undefined };

    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private Session = inject(SessionService);

    constructor() {
        this.user = this.Session.getUser();
    }

    addOwner() {
        const currentExam = this.exam();
        const exists = currentExam.examOwners.some((o) => o.email === this.newOwner.email);
        if (!exists) {
            this.http.post<User>(`/app/iop/exams/${currentExam.id}/owners`, this.newOwner).subscribe({
                next: (user) => {
                    currentExam.examOwners.push(user);
                    this.newOwner.email = undefined;
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    removeOwner(id: number) {
        const currentExam = this.exam();
        this.http.delete(`/app/iop/exams/${currentExam.id}/owners/${id}`).subscribe({
            next: () => {
                currentExam.examOwners = currentExam.examOwners.filter((o) => o.id !== id);
            },
            error: (err) => this.toast.error(err),
        });
    }
}
