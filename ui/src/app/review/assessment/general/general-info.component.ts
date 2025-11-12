// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Reservation } from 'src/app/reservation/reservation.model';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { NoShowComponent } from './no-show.component';
import { ParticipationComponent } from './participation.component';

type Participation = Omit<ExamParticipation, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-r-general-info',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './general-info.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [ParticipationComponent, NoShowComponent, MathJaxDirective, DatePipe, TranslateModule, ApplyDstPipe],
})
export class GeneralInfoComponent implements OnInit {
    exam = input.required<Exam>();
    participation = input.required<Participation>();
    collaborative = input(false);

    student?: User;
    studentName = '';
    enrolment?: ExamEnrolment;
    reservation?: Reservation;
    participations = signal<ExamParticipation[]>([]);
    noShows = signal<ExamEnrolment[]>([]);

    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private Attachment = inject(AttachmentService);
    private DateTime = inject(DateTimeService);

    ngOnInit() {
        const participationValue = this.participation();
        const examValue = this.exam();
        const duration = DateTime.fromISO(participationValue.duration as string)
            .set({ second: 0, millisecond: 0 })
            .toJSDate();
        participationValue.duration = this.DateTime.formatInTimeZone(duration, 'UTC') as string;
        this.student = participationValue.user as User;
        this.studentName = this.student
            ? `${this.student.lastName} ${this.student.firstName}`
            : this.collaborative()
              ? (participationValue._id as string)
              : examValue.id.toString();
        this.enrolment = examValue.examEnrolments.length > 0 ? examValue.examEnrolments[0] : undefined;
        this.reservation = this.enrolment?.reservation;
        if (this.collaborative()) {
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
        const examValue = this.exam();
        if (this.collaborative() && examValue.attachment) {
            const attachment = examValue.attachment;
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId as string, attachment.fileName);
        } else {
            this.Attachment.downloadExamAttachment(examValue);
        }
    };

    private handleParticipations = (data: ExamParticipation[]) => {
        const participationValue = this.participation();
        const examValue = this.exam();
        if (this.collaborative()) {
            // TODO: Add collaborative support for noshows.
            this.participations.set(data);
            return;
        }
        // Filter out the participation we are looking into
        this.participations.set(data.filter((p) => p.id !== participationValue.id));
        this.http.get<ExamEnrolment[]>(`/app/usernoshows/${examValue.id}`).subscribe((enrolments) => {
            this.noShows.set(enrolments.map((ee) => ({ ...ee, exam: { ...ee.exam, state: 'no_show' } })));
        });
    };
}
