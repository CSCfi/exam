// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-question-owners',
    templateUrl: './owners.component.html',
    imports: [TranslateModule, NgbTypeahead, NgbPopover],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnersComponent {
    currentOwners = input<User[]>([]);
    currentOwnersChange = output<User[]>();

    private http = inject(HttpClient);
    private newOwnerTemplate = signal<User | undefined>(undefined);

    get newOwner(): User | undefined {
        return this.newOwnerTemplate();
    }

    listQuestionOwners$ = (filter$: Observable<string>): Observable<User[]> => {
        const currentOwnersValue = this.currentOwners() ?? [];
        return filter$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<User[]>('/app/users/question/owners/TEACHER', { params: { q: term } }),
            ),
            map((users) => users.filter((u) => currentOwnersValue.map((o) => o.id).indexOf(u.id) === -1).slice(0, 15)),
        );
    };

    nameFormat = (u: User | string | null | undefined): string => {
        if (typeof u === 'string') {
            return u;
        }
        if (!u || typeof u !== 'object') {
            return '';
        }
        return `${u.firstName} ${u.lastName} <${u.email}>`;
    };

    setQuestionOwner(event: NgbTypeaheadSelectItemEvent) {
        this.newOwnerTemplate.set(event.item);
    }

    addQuestionOwner() {
        const template = this.newOwnerTemplate();
        if (template && template.id) {
            const currentOwnersValue = this.currentOwners() ?? [];
            const updatedOwners = [...currentOwnersValue, template];
            this.currentOwnersChange.emit(updatedOwners);

            // Clear template
            this.newOwnerTemplate.set(undefined);
        }
    }

    removeOwner(user: User) {
        const currentOwnersValue = this.currentOwners() ?? [];
        const updatedOwners = currentOwnersValue.filter((o) => o.id !== user.id);
        this.currentOwnersChange.emit(updatedOwners);
    }
}
