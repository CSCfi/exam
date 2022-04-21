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
import { Component, Input, OnInit } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import { parseISO, roundToNearestMinutes } from 'date-fns';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import type { Exam, ExamParticipation } from '../../../exam/exam.model';
import type { Reservation } from '../../../reservation/reservation.model';
import type { User } from '../../../session/session.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { DateTimeService } from '../../../shared/date/date.service';

export type Participation = Omit<ExamParticipation, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-r-general-info',
    templateUrl: './general-info.component.html',
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
        private state: UIRouterGlobals,
        private Attachment: AttachmentService,
        private DateTime: DateTimeService,
    ) {}

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

    ngOnInit() {
        const duration = roundToNearestMinutes(parseISO(this.participation.duration as string));
        this.participation.duration = this.DateTime.formatInTimeZone(duration, 'UTC');
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
                .get<ExamParticipation[]>(
                    `/app/iop/reviews/${this.state.params.id}/participations/${this.state.params.ref}`,
                )
                .subscribe(this.handleParticipations);
        } else {
            this.http
                .get<ExamParticipation[]>(`app/examparticipations/${this.state.params.id}`)
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
}
