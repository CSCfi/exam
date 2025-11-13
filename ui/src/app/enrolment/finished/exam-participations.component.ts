// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
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
export class ExamParticipationsComponent implements OnDestroy {
    filter = signal({ ordering: 'ended' as 'exam.name' | 'ended', reverse: true, text: '' });
    pageSize = signal(10);
    currentPage = signal(0);
    participations = signal<ParticipationLike[]>([]);
    collaborative = false;
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject<void>();
    searchDone = signal(false);

    private toast = inject(ToastrService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this._search);

        this.search('');
    }

    // Getter/setter for filter.text to work with ngModel
    get filterText(): string {
        return this.filter().text;
    }
    set filterText(value: string) {
        this.filter.update((f) => ({ ...f, text: value }));
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    search(text: string) {
        this.filterChanged.next(text);
    }

    pageSelected($event: { page: number }) {
        this.currentPage.set($event.page);
    }

    updateFilterOrdering(ordering: 'exam.name' | 'ended', reverse: boolean) {
        this.filter.update((f) => ({ ...f, ordering, reverse }));
    }

    private _search = (text: string) => {
        this.filter.update((f) => ({ ...f, text }));
        this.Enrolment.loadParticipations$(text)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe({
                next: (data) => {
                    data.filter((p) => !p.ended).forEach(
                        (p) => (p.ended = p.reservation ? p.reservation.endAt : p.started),
                    );
                    this.participations.set(data.filter((d) => d.ended));
                    this.searchDone.set(true);
                },
                error: (err) => this.toast.error(err),
            });
    };
}
