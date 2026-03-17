// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { NgbNavChangeEvent, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { ExamTabService } from './exam-tabs.service';

@Component({
    selector: 'xm-exam-tabs',
    templateUrl: './exam-tabs.component.html',
    imports: [
        NgbNavModule,
        RouterOutlet,
        LowerCasePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
    ],
    styleUrl: './exam-tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamTabsComponent {
    readonly exam = computed(() => this.Tabs.examSignal());
    readonly collaborative = signal(false);
    readonly examInfo = computed(() => ({
        title: this.computeTitle(this.exam()?.course?.code ?? null, this.exam()?.name ?? null),
    }));
    readonly activeTab = linkedSignal(() => this.Tabs.tabChangeSignal()?.tab ?? 1);
    readonly user: User;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly Session = inject(SessionService);
    private readonly Tabs = inject(ExamTabService);
    private readonly CourseCode = inject(CourseCodeService);

    constructor() {
        this.user = this.Session.getUser();
        this.collaborative.set(this.route.snapshot.queryParamMap.get('collaborative') === 'true');
        this.route.data.subscribe((data) => {
            this.Tabs.setExam(data.exam);
            this.initGradeScale();
            this.Tabs.setCollaborative(this.collaborative());
        });
    }

    isOwner() {
        const currentExam = this.exam();
        return (
            currentExam?.examOwners &&
            currentExam.examOwners.some(
                (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
            )
        );
    }

    navChanged(event: NgbNavChangeEvent) {
        this.router.navigate([event.nextId], {
            relativeTo: this.route,
            queryParams: { collaborative: this.collaborative() },
        });
    }

    private computeTitle(code: string | null, name: string | null): string {
        if (code && name) return `${this.CourseCode.formatCode(code)} ${name}`;
        if (code) return `${this.CourseCode.formatCode(code)} ${this.translate.instant('i18n_no_name')}`;
        if (name) return name;
        return this.translate.instant('i18n_no_name');
    }

    private initGradeScale() {
        // Set exam grade scale from course default if not specifically set for exam
        const currentExam = this.exam();
        if (!currentExam) return;
        if (!currentExam.gradeScale && currentExam.course && currentExam.course.gradeScale) {
            this.Tabs.setExam({ ...currentExam, gradeScale: currentExam.course.gradeScale });
        }
    }
}
