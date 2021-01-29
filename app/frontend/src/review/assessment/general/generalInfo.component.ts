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
import { Component, Input } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as moment from 'moment';

import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { Exam, ExaminationEventConfiguration, ExamParticipation } from '../../../exam/exam.model';
import { Reservation } from '../../../reservation/reservation.model';
import { User } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';

export type Participation = Partial<Omit<ExamParticipation, 'exam'> & { exam: Partial<Exam> }>;

@Component({
    selector: 'r-general-info',
    templateUrl: './generalInfo.component.html',
})
export class GeneralInfoComponent {
    @Input() exam: Exam;
    @Input() participation: Participation;
    @Input() collaborative: boolean;

    student: User;
    studentName: string;
    enrolment: ExamEnrolment;
    reservation: Reservation;
    previousParticipations: Partial<Participation>[];

    constructor(private http: HttpClient, private state: StateService, private Attachment: AttachmentService) {}

    private handleParticipations = (data: Partial<Participation>[]) => {
        if (this.collaborative) {
            // TODO: Add collaborative support for noshows.
            this.previousParticipations = data;
            return;
        }
        // Filter out the participation we are looking into
        const previousParticipations = data.filter(p => {
            return p.id !== this.participation.id;
        });
        this.http.get<ExamEnrolment[]>(`/app/usernoshows/${this.exam.id}`).subscribe(enrolments => {
            const noShows: Partial<Participation>[] = enrolments.map(ee => {
                return {
                    id: ee.id,
                    noShow: true,
                    user: ee.user,
                    started: ee.reservation
                        ? ee.reservation.startAt
                        : (ee.examinationEventConfiguration as ExaminationEventConfiguration).examinationEvent.start,
                    exam: { state: 'no_show' },
                };
            });
            this.previousParticipations = previousParticipations.concat(noShows);
        });
    };

    ngOnInit() {
        const duration = moment.utc(new Date(this.participation.duration as string));
        if (duration.second() > 29) {
            duration.add(1, 'minutes');
        }
        this.participation.duration = duration.format();

        this.student = this.participation.user as User;
        this.studentName = this.student
            ? `${this.student.lastName} ${this.student.firstName}`
            : this.collaborative
            ? (this.participation._id as string)
            : this.exam.id.toString();
        this.enrolment = this.exam.examEnrolments[0];
        this.reservation = this.enrolment.reservation as Reservation;
        if (this.collaborative) {
            this.http
                .get<Participation[]>(
                    `/integration/iop/reviews/${this.state.params.eid}/participations/${this.state.params.ref}`,
                )
                .subscribe(this.handleParticipations);
        } else {
            this.http
                .get<Participation[]>(`app/examparticipations/${this.state.params.eid}`)
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
