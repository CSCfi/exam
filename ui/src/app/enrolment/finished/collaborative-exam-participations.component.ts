// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CollaborativeParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ExamParticipationComponent } from './exam-participation.component';

@Component({
    selector: 'xm-collaborative-exam-participations',
    templateUrl: './exam-participations.component.html',
    standalone: true,
    imports: [
        FormsModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        ExamParticipationComponent,
        PaginatorComponent,
        SlicePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class CollaborativeParticipationsComponent implements OnInit, AfterViewInit {
    collaborative = true;
    originals: CollaborativeParticipation[] = [];
    participations: CollaborativeParticipation[] = [];
    pageSize = 10;
    currentPage = 0;
    filter = { ordering: 'ended', reverse: true, text: '' };
    searchDone = false;

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
