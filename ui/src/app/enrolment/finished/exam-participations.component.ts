// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
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
export class ExamParticipationsComponent {
    filter = signal({ ordering: 'ended' as 'exam.name' | 'ended', reverse: true, text: '' });
    pageSize = signal(10);
    currentPage = signal(0);
    collaborative = false;
    searchDone = signal(false);

    // Reactive search with debouncing - automatically cleans up on destroy
    participations = toSignal(
        toObservable(computed(() => this.filter().text)).pipe(
            debounceTime(500),
            distinctUntilChanged(),
            switchMap((text) => {
                return this.Enrolment.loadParticipations$(text).pipe(
                    map((data) => {
                        // Normalize ended dates
                        data.filter((p) => !p.ended).forEach(
                            (p) => (p.ended = p.reservation ? p.reservation.endAt : p.started),
                        );
                        // Filter to only participations with ended dates
                        return data.filter((d) => d.ended);
                    }),
                    tap(() => this.searchDone.set(true)),
                    catchError((err) => {
                        this.toast.error(err);
                        return EMPTY;
                    }),
                );
            }),
        ),
        { initialValue: [] as ParticipationLike[] },
    );

    private toast = inject(ToastrService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        // Trigger initial search with empty string
        this.filterText = '';
    }

    get filterText(): string {
        return this.filter().text;
    }
    set filterText(value: string) {
        this.filter.update((f) => ({ ...f, text: value }));
    }

    pageSelected($event: { page: number }) {
        this.currentPage.set($event.page);
    }

    updateFilterOrdering(ordering: 'exam.name' | 'ended', reverse: boolean) {
        this.filter.update((f) => ({ ...f, ordering, reverse }));
    }
}
