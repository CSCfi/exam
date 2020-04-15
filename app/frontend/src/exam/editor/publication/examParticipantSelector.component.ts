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
import { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { from, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { ExamEnrolment } from '../../../enrolment/enrolment.model';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import { User } from '../../../session/session.service';
import { Exam } from '../../exam.model';

@Component({
    selector: 'exam-participant-selector',
    template: require('./examParticipantSelector.component.html'),
})
export class ExamParticipantSelectorComponent implements OnInit {
    @Input() exam: Exam;
    newParticipant: { id?: number; name?: string } = {};
    participants: User[];
    enrolments: ExamEnrolment[];

    constructor(private http: HttpClient, private translate: TranslateService, private Enrolment: EnrolmentService) {}

    ngOnInit() {
        this.enrolments = this.exam.examEnrolments.filter(ee => !ee.preEnrolledUserEmail);
        this.participants = _.flatten(this.exam.children.map(c => c.examEnrolments)).map(e => e.user);
    }

    private findUsers$ = (criteria: string) =>
        this.http.get<User[]>(`/app/students/${this.exam.id}`, { params: { q: criteria } });

    listStudents$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap(name => (this.newParticipant.name = name)),
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap(s => (s.length < 2 ? from([]) : this.findUsers$(s))),
            take(15),
        );

    idFormat = (u: User) => u.id;
    nameFormat = (u: User & { name: string }) => {
        return u.name;
    };

    setExamParticipant = (event: NgbTypeaheadSelectItemEvent) => {
        this.newParticipant.id = event.item.id;
    };

    addParticipant = () =>
        this.Enrolment.enrollStudent(this.exam, this.newParticipant).subscribe(
            enrolment => {
                // push to the list
                this.enrolments.push(enrolment);
                // nullify input fields
                delete this.newParticipant.name;
                delete this.newParticipant.id;
            },
            err => toast.error(err.data),
        );

    removeParticipant = (id: number) =>
        this.http.delete(`/app/enrolments/student/${id}`).subscribe(
            () => {
                this.exam.examEnrolments = this.exam.examEnrolments.filter(ee => ee.id !== id);
                toast.info(this.translate.instant('sitnet_participant_removed'));
            },
            err => toast.error(err.data),
        );

    renderParticipantLabel = (enrolment: ExamEnrolment) =>
        enrolment.preEnrolledUserEmail
            ? enrolment.preEnrolledUserEmail
            : enrolment.user?.firstName + ' ' + enrolment?.user.lastName;
}
