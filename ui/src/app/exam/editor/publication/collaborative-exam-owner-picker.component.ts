// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { email, form, FormField } from '@angular/forms/signals';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-collaborative-exam-owner-selector',
    template: ` <div class="row mt-3">
            <div class="col-md-3">
                {{ 'i18n_exam_owners' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_exam_owner_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                    ><img src="/assets/images/icon_tooltip.svg" alt=""
                /></sup>
            </div>
            <div class="col-md-5">
                <div class="input-group">
                    <input
                        type="email"
                        placeholder="{{ 'i18n_write_exam_owner_email' | translate }}"
                        class="form-control"
                        [formField]="ownerForm.email"
                    />
                    <button
                        type="button"
                        [disabled]="!ownerForm.email().value() || ownerForm.email().invalid() || !user.isAdmin"
                        (click)="addOwner()"
                        class="input-group-text btn btn-success"
                    >
                        {{ 'i18n_add' | translate }}
                    </button>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-5 offset-md-3">
                @for (owner of exam().examOwners; track owner) {
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <small>{{ owner.email }}</small>
                        <button
                            type="button"
                            class="btn btn-outline-danger btn-sm ms-3 flex-shrink-0"
                            (click)="removeOwner(owner.id)"
                            [hidden]="!user.isAdmin"
                            [ariaLabel]="owner.email"
                        >
                            {{ 'i18n_remove' | translate }}
                        </button>
                    </div>
                }
            </div>
        </div>`,
    imports: [NgbPopover, FormField, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborativeExamOwnerSelectorComponent {
    readonly exam = input.required<Exam>();

    readonly ownerForm = form(signal({ email: '' }), (path) => {
        email(path.email);
    });
    readonly user: User;

    private readonly http = inject(HttpClient);
    private readonly toast = inject(ToastrService);
    private readonly Session = inject(SessionService);
    private readonly ExamTabs = inject(ExamTabService);

    constructor() {
        this.user = this.Session.getUser();
    }

    addOwner = () => {
        const currentExam = this.exam();
        const owners = currentExam.examOwners ?? [];
        const emailValue = this.ownerForm.email().value();
        const exists = owners.some((o) => o.email === emailValue);
        if (!exists) {
            this.http.post<User>(`/app/iop/exams/${currentExam.id}/owners`, { email: emailValue }).subscribe({
                next: (user) => {
                    this.ExamTabs.setExam({ ...currentExam, examOwners: [...owners, user] });
                    this.ownerForm.email().value.set('');
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    removeOwner = (id: number) => {
        const currentExam = this.exam();
        const owners = currentExam.examOwners ?? [];
        this.http.delete(`/app/iop/exams/${currentExam.id}/owners/${id}`).subscribe({
            next: () => {
                this.ExamTabs.setExam({
                    ...currentExam,
                    examOwners: owners.filter((o) => o.id !== id),
                });
            },
            error: (err) => this.toast.error(err),
        });
    };
}
