// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-r-inspection',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@if (inspection().user?.id !== user().id) {
            <span>
                @if (inspection().ready) {
                    <span class="text-success">
                        {{ inspection().user.firstName }} {{ inspection().user.lastName }}
                        {{ 'i18n_ready' | translate }}</span
                    >
                }
                @if (!inspection().ready) {
                    <span class="text-danger">
                        {{ inspection().user.firstName }} {{ inspection().user.lastName }}
                        {{ 'i18n_in_progress' | translate }}</span
                    >
                }
            </span>
        }
        @if (inspection().user?.id === user().id) {
            <div class="input-group-sm make-inline">
                <div class="make-inline">{{ inspection().user.firstName }} {{ inspection().user.lastName }}</div>
                <div class="make-inline ps-2">
                    <select class="form-select" [disabled]="disabled()" (change)="onReadyChangeEvent($event)">
                        @for (rs of reviewStatuses; track rs) {
                            <option [value]="rs.key" [selected]="rs.key === inspection().ready">{{ rs.value }}</option>
                        }
                    </select>
                </div>
            </div>
        }`,
    imports: [TranslateModule],
})
export class InspectionComponent {
    readonly inspection = input.required<ExamInspection>();
    readonly user = input.required<User>();
    readonly disabled = input(false);
    readonly inspected = output<void>();

    readonly reviewStatuses: { key: boolean; value: string }[];

    private readonly translate = inject(TranslateService);
    private readonly http = inject(HttpClient);
    private readonly toast = inject(ToastrService);

    constructor() {
        this.reviewStatuses = [
            { key: true, value: this.translate.instant('i18n_ready') },
            { key: false, value: this.translate.instant('i18n_in_progress') },
        ];
    }

    setInspectionStatus = () => {
        const inspectionValue = this.inspection();
        const userValue = this.user();
        if (inspectionValue.user.id === userValue.id) {
            this.http.put(`/app/exams/inspection/${inspectionValue.id}`, { ready: inspectionValue.ready }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_exam_updated'));
                    this.inspected.emit();
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    onReadyChangeEvent = (event: Event) => this.onReadyChange((event.target as HTMLSelectElement).value === 'true');

    onReadyChange = (ready: boolean) => {
        const inspectionValue = this.inspection();
        inspectionValue.ready = ready;
        this.setInspectionStatus();
    };
}
