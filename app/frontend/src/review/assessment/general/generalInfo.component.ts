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
import { StateParams } from '@uirouter/core';
import * as angular from 'angular';
import * as moment from 'moment';

import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { ExaminationEventConfiguration } from '../../../exam/exam.model';
import { Examination } from '../../../examination/examination.service';
import { Reservation } from '../../../reservation/reservation.model';
import { User } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';

interface Participation {
    id: number;
    noShow: boolean;
    started: moment.MomentInput;
    duration: moment.MomentInput;
    user: User;
    _id?: string;
    exam: {
        state: string;
    };
}

export const GeneralInfoComponent: angular.IComponentOptions = {
    template: require('./generalInfo.template.html'),
    bindings: {
        exam: '<',
        participation: '<',
        collaborative: '<',
    },
    controller: class GeneralInfoController implements angular.IComponentController, angular.IOnInit {
        participation: Participation;
        exam: Examination;
        collaborative: boolean;
        student: User;
        studentName: string;
        enrolment: ExamEnrolment;
        reservation: Reservation;
        previousParticipations: Partial<Participation>[];

        constructor(
            private $http: angular.IHttpService,
            private stateParams: StateParams,
            private Attachment: AttachmentService,
        ) {
            'ngInject';
        }

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
            this.$http.get(`/app/usernoshows/${this.exam.id}`).then((resp: angular.IHttpResponse<ExamEnrolment[]>) => {
                const noShows: Partial<Participation>[] = resp.data.map(d => {
                    return {
                        id: d.id,
                        noShow: true,
                        user: d.user,
                        started: d.reservation
                            ? d.reservation.startAt
                            : (d.examinationEventConfiguration as ExaminationEventConfiguration).examinationEvent.start,
                        exam: { state: 'no_show' },
                    };
                });
                this.previousParticipations = previousParticipations.concat(noShows);
            });
        };

        $onInit() {
            const duration = moment.utc(new Date(this.participation.duration as string));
            if (duration.second() > 29) {
                duration.add(1, 'minutes');
            }
            this.participation.duration = duration.format('HH:mm');

            this.student = this.participation.user;
            this.studentName = this.student
                ? `${this.student.lastName} ${this.student.firstName}`
                : this.collaborative
                ? (this.participation._id as string)
                : this.exam.id.toString();
            this.enrolment = this.exam.examEnrolments[0];
            this.reservation = this.enrolment.reservation as Reservation;
            if (this.collaborative) {
                this.$http
                    .get(`/integration/iop/reviews/${this.stateParams.eid}/participations/${this.stateParams.ref}`)
                    .then((resp: angular.IHttpResponse<Participation[]>) => this.handleParticipations(resp.data));
            } else {
                this.$http
                    .get(`app/examparticipations/${this.stateParams.eid}`)
                    .then((resp: angular.IHttpResponse<Participation[]>) => this.handleParticipations(resp.data));
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
    },
};

angular.module('app.review').component('rGeneralInfo', GeneralInfoComponent);
