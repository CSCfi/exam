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
import { NgFor, NgIf, SlicePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { CollaborativeParticipation } from '../../exam/collaborative/collaborative-exam.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AutoFocusDirective } from '../../shared/select/auto-focus.directive';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import { EnrolmentService } from '../enrolment.service';
import { ExamParticipationComponent } from './exam-participation.component';

@Component({
    selector: 'xm-collaborative-exam-participations',
    templateUrl: './exam-participations.component.html',
    standalone: true,
    imports: [
        FormsModule,
        AutoFocusDirective,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        NgFor,
        ExamParticipationComponent,
        NgIf,
        PaginatorComponent,
        SlicePipe,
        TranslateModule,
        OrderByPipe,
    ],
})
export class CollaborativeParticipationsComponent implements OnInit, AfterViewInit {
    collaborative = true;
    originals: CollaborativeParticipation[] = [];
    participations: CollaborativeParticipation[] = [];
    pageSize = 10;
    currentPage = 0;
    filter = { ordering: 'ended', reverse: true, text: '' };

    constructor(
        private changeDetector: ChangeDetectorRef,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        this.Enrolment.listStudentParticipations$().subscribe({
            next: (participations: CollaborativeParticipation[]) => {
                participations
                    .filter((p) => typeof p.ended == 'number')
                    .forEach((p) => (p.ended = new Date(p.ended).toISOString()));
                this.originals = participations;
                this.search('');
            },
            error: (err) => this.toast.error(err),
        });
    }

    ngAfterViewInit() {
        this.changeDetector.detectChanges();
    }

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);

    search(text: string) {
        if (!text || text.length < 1) {
            this.participations = this.originals;
        } else {
            this.participations = this.originals.filter((participation) => {
                const exam = participation.exam;
                return exam.name && exam.name.indexOf(text) > -1;
            });
        }
    }
}
