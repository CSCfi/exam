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
import { NgFor, NgIf, SlicePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AutoFocusDirective } from '../../shared/select/auto-focus.directive';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import type { ParticipationLike } from '../enrolment.service';
import { EnrolmentService } from '../enrolment.service';
import { ExamParticipationComponent } from './exam-participation.component';

@Component({
    selector: 'xm-exam-participations',
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
export class ExamParticipationsComponent implements OnInit, OnDestroy {
    filter = { ordering: 'ended', reverse: true, text: '' };
    pageSize = 10;
    currentPage = 0;
    participations: ParticipationLike[] = [];
    collaborative = false;
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();

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
            },
            error: (err) => this.toast.error(err),
        });
    };
}
