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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamInspection } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';

@Component({
    selector: 'xm-r-inspection',
    template: `@if (inspection.user?.id !== user.id) {
            <span>
                @if (inspection.ready) {
                    <span class="text-success">
                        {{ inspection.user.firstName }} {{ inspection.user.lastName }}
                        {{ 'i18n_ready' | translate }}</span
                    >
                }
                @if (!inspection.ready) {
                    <span class="text-danger">
                        {{ inspection.user.firstName }} {{ inspection.user.lastName }}
                        {{ 'i18n_in_progress' | translate }}</span
                    >
                }
            </span>
        }
        @if (inspection.user?.id === user.id) {
            <div class="input-group-sm make-inline">
                <div class="make-inline">{{ inspection.user.firstName }} {{ inspection.user.lastName }}</div>
                <div class="make-inline ps-2">
                    <select
                        [(ngModel)]="inspection.ready"
                        class="form-select"
                        [disabled]="disabled"
                        (change)="setInspectionStatus()"
                    >
                        @for (rs of reviewStatuses; track rs) {
                            <option [ngValue]="rs.key">{{ rs.value }}</option>
                        }
                    </select>
                </div>
            </div>
        }`,
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class InspectionComponent implements OnInit {
    @Input() inspection!: ExamInspection;
    @Input() user!: User;
    @Input() disabled = false;
    @Output() inspected = new EventEmitter<void>();

    reviewStatuses: { key: boolean; value: string }[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.reviewStatuses = [
            {
                key: true,
                value: this.translate.instant('i18n_ready'),
            },
            {
                key: false,
                value: this.translate.instant('i18n_in_progress'),
            },
        ];
    }

    setInspectionStatus = () => {
        if (this.inspection.user.id === this.user.id) {
            this.http.put(`/app/exams/inspection/${this.inspection.id}`, { ready: this.inspection.ready }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_exam_updated'));
                    this.inspected.emit();
                },
                error: (err) => this.toast.error(err),
            });
        }
    };
}
