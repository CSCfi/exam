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
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import type { ParticipationLike } from './examParticipation.component';

@Component({
    selector: 'exam-participations',
    templateUrl: './examParticipations.component.html',
})
export class ExamParticipationsComponent implements OnInit, OnDestroy {
    filter = { ordering: 'ended', reverse: true, text: '' };
    pageSize = 10;
    currentPage = 0;
    participations: ParticipationLike[] = [];
    collaborative = false;
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(private http: HttpClient, private toast: ToastrService) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this.doSearch);
    }

    ngOnInit() {
        this.search('');
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        this.filter.text = text;
        this.http.get<ParticipationLike[]>('/app/student/finishedexams', { params: { filter: text } }).subscribe({
            next: (data) => {
                data.filter((p) => !p.ended).forEach(
                    (p) => (p.ended = p.reservation ? p.reservation.endAt : p.started),
                );
                this.participations = data;
            },
            error: this.toast.error,
        });
    };

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);
}
