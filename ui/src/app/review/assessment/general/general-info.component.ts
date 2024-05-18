// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { parseISO, roundToNearestMinutes } from 'date-fns';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Exam, ExamParticipation } from 'src/app/exam/exam.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { NoShowComponent } from './no-show.component';
import { ParticipationComponent } from './participation.component';

export type Participation = Omit<ExamParticipation, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-r-general-info',
    templateUrl: './general-info.component.html',
    styleUrls: ['../assessment.shared.scss'],
    standalone: true,
    imports: [ParticipationComponent, NoShowComponent, MathJaxDirective, DatePipe, TranslateModule, ApplyDstPipe],
})
export class GeneralInfoComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() participation!: Participation;
    @Input() collaborative = false;

    student?: User;
    studentName = '';
    enrolment?: ExamEnrolment;
    reservation?: Reservation;
    participations: ExamParticipation[] = [];
    noShows: ExamEnrolment[] = [];

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private Attachment: AttachmentService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        const duration = roundToNearestMinutes(parseISO(this.participation.duration as string));
        this.participation.duration = this.DateTime.formatInTimeZone(duration, 'UTC') as string;
        this.student = this.participation.user as User;
        this.studentName = this.student
            ? `${this.student.lastName} ${this.student.firstName}`
            : this.collaborative
              ? (this.participation._id as string)
              : this.exam.id.toString();
        this.enrolment = this.exam.examEnrolments.length > 0 ? this.exam.examEnrolments[0] : undefined;
        this.reservation = this.enrolment?.reservation;
        if (this.collaborative) {
            this.http
                .get<
                    ExamParticipation[]
                >(`/app/iop/reviews/${this.route.snapshot.params.id}/participations/${this.route.snapshot.params.ref}`)
                .subscribe(this.handleParticipations);
        } else {
            this.http
                .get<ExamParticipation[]>(`app/examparticipations/${this.route.snapshot.params.id}`)
                .subscribe(this.handleParticipations);
        }
    }

    downloadExamAttachment = () => {
        if (this.collaborative && this.exam.attachment) {
            const attachment = this.exam.attachment;
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId as string, attachment.fileName);
        } else {
            this.Attachment.downloadExamAttachment(this.exam);
        }
    };

    private handleParticipations = (data: ExamParticipation[]) => {
        if (this.collaborative) {
            // TODO: Add collaborative support for noshows.
            this.participations = data;
            return;
        }
        // Filter out the participation we are looking into
        this.participations = data.filter((p) => p.id !== this.participation.id);
        this.http.get<ExamEnrolment[]>(`/app/usernoshows/${this.exam.id}`).subscribe((enrolments) => {
            this.noShows = enrolments.map((ee) => ({ ...ee, exam: { ...ee.exam, state: 'no_show' } }));
        });
    };
}
