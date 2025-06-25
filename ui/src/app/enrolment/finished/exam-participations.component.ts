// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ParticipationLike } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ExamParticipationComponent } from './exam-participation.component';

@Component({
    selector: 'xm-exam-participations',
    templateUrl: './exam-participations.component.html',
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
export class ExamParticipationsComponent implements OnInit, OnDestroy {
    filter = { ordering: 'ended', reverse: true, text: '' };
    pageSize = 10;
    currentPage = 0;
    participations: ParticipationLike[] = [];
    collaborative = false;
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();
    searchDone = false;

    constructor(
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
    ) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this._search);
    }

    ngOnInit() {
        this.search('');
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => this.filterChanged.next(text);

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);

    private _search = (text: string) => {
        this.filter.text = text;
        this.Enrolment.loadParticipations$(text).subscribe({
            next: (data) => {
                data.filter((p) => !p.ended).forEach(
                    (p) => (p.ended = p.reservation ? p.reservation.endAt : p.started),
                );
                this.participations = data.filter((d) => d.ended);
                this.searchDone = true;
            },
            error: (err) => this.toast.error(err),
        });
    };
}
