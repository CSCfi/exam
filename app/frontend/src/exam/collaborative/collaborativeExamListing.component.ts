/*
 * Copyright (c) 2018 Exam Consortium
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
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import { SessionService, User } from '../../session/session.service';
import { CollaborativeExam } from '../exam.model';
import { CollaborativeExamService } from './collaborativeExam.service';

@Component({
    selector: 'collaborative-exam-listing',
    template: require('./collaborativeExamListing.component.html'),
})
export class CollaborativeExamListingComponent implements OnInit {
    exams: CollaborativeExam[];
    user: User;

    constructor(
        private state: StateService,
        private translate: TranslateService,
        private Session: SessionService,
        private CollaborativeExam: CollaborativeExamService,
    ) {}

    ngOnInit() {
        this.user = this.Session.getUser();
        this.CollaborativeExam.listExams().subscribe(
            (exams: CollaborativeExam[]) => (this.exams = exams),
            err => toast.error(err.data),
        );
    }

    createExam() {
        this.CollaborativeExam.createExam().subscribe(
            (exam: CollaborativeExam) => {
                toast.info(this.translate.instant('sitnet_exam_created'));
                this.state.go('collaborativeExamEditor', { id: exam.id, tab: 1 });
            },
            err => toast.error(err.data),
        );
    }
}
