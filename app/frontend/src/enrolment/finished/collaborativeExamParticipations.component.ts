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
 *
 */
import { Component, OnInit } from '@angular/core';

import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';
import { Participation } from '../../exam/exam.model';

interface Filter {
    ordering: string;
    text: string;
}

@Component({
    selector: 'collaborative-exam-participations',
    template: require('./examParticipations.component.html'),
})
export class CollaborativeExamParticipationsComponent implements OnInit {
    collaborative = true;
    originals: Participation[];
    participations: Participation[] = [];
    pageSize = 10;
    currentPage = 1;
    filter: Filter;

    constructor(private CollaborativeExam: CollaborativeExamService) {}

    ngOnInit() {
        this.filter = { ordering: '-ended', text: '' };
        this.CollaborativeExam.listStudentParticipations().subscribe(
            (participations: Participation[]) => {
                this.originals = Array.from(participations);
                this.participations = Array.from(participations);
            },
            err => toastr.error(err.data),
        );
    }

    pageSelected(page: number) {
        this.currentPage = page;
    }

    search() {
        const text = this.filter.text;
        if (!text || text.length < 1) {
            this.participations = this.originals;
            return;
        }
        this.participations = this.originals.filter((participation: Participation) => {
            const exam = participation.exam;
            return exam && exam.name && exam.name.indexOf(text) > -1;
        });
    }
}
