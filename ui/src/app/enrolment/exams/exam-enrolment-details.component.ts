// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

@Component({
    selector: 'xm-enrolment-details',
    templateUrl: './exam-enrolment-details.component.html',
    standalone: true,
    imports: [
        HistoryBackComponent,
        CourseCodeComponent,
        TeacherListComponent,
        MathJaxDirective,
        DatePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class EnrolmentDetailsComponent {
    @Input() exam!: EnrolmentInfo;

    constructor(
        private router: Router,
        private Exam: CommonExamService,
        private Enrolment: EnrolmentService,
        private DateTime: DateTimeService,
    ) {}
    getExpiration = (): boolean => {
        return new Date(this.exam.periodEnd || 0) < new Date();
    };

    enrollForExam = () => this.Enrolment.checkAndEnroll$(this.exam).subscribe();

    translateExamType = () => this.Exam.getExamTypeDisplayName(this.exam.examType.type);

    translateGradeScale = () =>
        this.Exam.getScaleDisplayName(
            this.exam.gradeScale || (this.exam.course ? this.exam.course.gradeScale : undefined),
        );

    printExamDuration = () => this.DateTime.printExamDuration(this.exam);

    makeReservation = () => {
        if (this.exam.implementation !== 'AQUARIUM') {
            this.router.navigate(['/dashboard']);
        } else {
            this.router.navigate(['/calendar', this.exam.id]);
        }
    };
}
