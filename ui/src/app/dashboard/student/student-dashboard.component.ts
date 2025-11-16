// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';
import { DashboardEnrolment } from 'src/app/dashboard/dashboard.model';
import { ActiveEnrolmentComponent } from 'src/app/enrolment/active/active-enrolment.component';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { StudentDashboardService } from './student-dashboard.service';

@Component({
    selector: 'xm-student-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ActiveEnrolmentComponent, TranslateModule, PageHeaderComponent, PageContentComponent],
    template: `<xm-page-header text="i18n_user_enrolled_exams_title" />
        <xm-page-content [content]="content"></xm-page-content>
        <ng-template #content>
            @for (enrolment of sortedEnrolments(); track enrolment) {
                <div class="row mb-2">
                    <div class="col-12">
                        <xm-active-enrolment
                            [enrolment]="enrolment"
                            (removed)="enrolmentRemoved($event)"
                        ></xm-active-enrolment>
                    </div>
                </div>
            } @empty {
                <div class="row">
                    <div class="col-12" role="note">
                        <img src="/assets/images/icon_info.png" alt="" />&nbsp;
                        {{ 'i18n_no_enrolments' | translate }}
                    </div>
                </div>
            }
        </ng-template>`,
})
export class StudentDashboardComponent {
    enrolments = signal<DashboardEnrolment[]>([]);
    sortedEnrolments = computed(() =>
        [...this.enrolments()].sort((a, b) => a.startAtAggregate.localeCompare(b.startAtAggregate)),
    );
    private StudentDashboard = inject(StudentDashboardService);

    constructor() {
        this.StudentDashboard.listEnrolments$()
            .pipe(take(1))
            .subscribe((data) => this.enrolments.set(data));
    }

    enrolmentRemoved = (id: number) => {
        this.enrolments.update((es) => es.filter((e) => e.id !== id));
    };
}
