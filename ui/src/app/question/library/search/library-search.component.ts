// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, Component, inject, OnDestroy, output, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip, Subject, takeUntil, tap } from 'rxjs';
import type { Course, Exam, ExamSection } from 'src/app/exam/exam.model';
import { LibraryService } from 'src/app/question/library/library.service';
import { LibraryQuestion, Tag } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import type { Option } from 'src/app/shared/select/select.model';
import { UserService } from 'src/app/shared/user/user.service';

interface Filterable<T> {
    id: number;
    filtered: boolean;
    object: T;
    name: string;
    code?: string;
    usage?: number;
    period?: string;
}

@Component({
    selector: 'xm-library-search',
    templateUrl: './library-search.component.html',
    imports: [DropdownSelectComponent, FormField, TranslateModule],
})
export class LibrarySearchComponent implements AfterViewInit, OnDestroy {
    readonly updated = output<LibraryQuestion[]>();

    readonly courses = signal<Filterable<Course>[]>([]);
    readonly filteredCourses = signal<Filterable<Course>[]>([]);
    readonly exams = signal<Filterable<Exam>[]>([]);
    readonly filteredExams = signal<Filterable<Exam>[]>([]);
    readonly sections = signal<Filterable<ExamSection>[]>([]);
    readonly filteredSections = signal<Filterable<ExamSection>[]>([]);
    readonly tags = signal<Filterable<Tag>[]>([]);
    readonly filteredTags = signal<Filterable<Tag>[]>([]);
    readonly owners = signal<Filterable<User>[]>([]);
    readonly filteredOwners = signal<Filterable<User>[]>([]);
    readonly searchForm = form(signal({ text: '' }));
    readonly user: User;

    private readonly questions = signal<LibraryQuestion[]>([]);
    private readonly filter = signal({ owner: '', text: '' });
    private readonly limitations = { course: '', exam: '', section: '', tag: '', owner: '' };
    private readonly searchText$ = toObservable(this.searchForm.text().value);

    private readonly ngUnsubscribe = new Subject<void>();
    private readonly Library = inject(LibraryService);
    private readonly Session = inject(SessionService);
    private readonly CourseCode = inject(CourseCodeService);
    private readonly User = inject(UserService);

    constructor() {
        this.user = this.Session.getUser();
    }

    ngAfterViewInit() {
        const storedData = this.Library.loadFilters('search');
        if (storedData.filters) {
            this.courses.set(storedData.filters.courses || []);
            this.filteredCourses.set(storedData.filters.courses || []);
            this.exams.set(storedData.filters.exams || []);
            this.filteredExams.set(storedData.filters.exams || []);
            this.sections.set(storedData.filters.sections || []);
            this.filteredSections.set(storedData.filters.sections || []);
            this.tags.set(storedData.filters.tags || []);
            this.filteredTags.set(storedData.filters.tags || []);
            this.owners.set(storedData.filters.owners || []);
            this.filteredOwners.set(storedData.filters.owners || []);
            this.filter().text = storedData.filters.text;
            this.filter().owner = storedData.filters.owner;
            this.searchForm.text().value.set(this.filter().text);
            this.query$().subscribe((questions) => {
                if (this.filter().text || this.filter().owner) {
                    this.applySearchFilter();
                } else {
                    this.updated.emit(questions);
                }
            });
        } else {
            this.query$().subscribe((resp) => this.updated.emit(resp));
        }
        this.searchText$
            .pipe(skip(1), debounceTime(300), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((value) => {
                this.filter().text = value || '';
                this.applySearchFilter();
            });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    applySearchFilter = () => {
        let results = this.Library.applyFreeSearchFilter(this.filter().text, this.questions());
        results = this.Library.applyOwnerSearchFilter(this.filter().owner, results);
        this.updated.emit(results);
        this.saveFilters();
    };
    applyOwnerSearchFilter = (user: Filterable<User>) => {
        user.filtered = !user.filtered;
        if (user.name) {
            this.filter().owner = user.name;
        } else {
            console.error('i18n_user_no_name');
        }
        this.applySearchFilter();
    };

    listCourses = () => {
        const courses = this.courses().filter((c) => c.filtered);
        return this.Library.listCourses$(this.getExamIds(), this.getSectionIds(), this.getTagIds(), this.getOwnerIds())
            .pipe(
                tap((resp) => {
                    const newCourses = this.union(
                        courses,
                        resp.map((r) => ({
                            id: r.id,
                            name: r.name,
                            code: r.code,
                            object: r,
                            filtered: false,
                        })),
                    ).sort((a, b) => a.name.localeCompare(b.name));
                    this.courses.set(newCourses);
                    if (this.limitations.course) {
                        this.filterCourses();
                    } else {
                        this.filteredCourses.set(newCourses);
                    }
                }),
            )
            .subscribe();
    };

    listExams$ = (): Observable<Exam[]> => {
        const exams = this.exams().filter((e) => e.filtered);
        return this.Library.listExams$(
            this.getCourseIds(),
            this.getSectionIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((resp) => {
                const newExams = this.union(
                    exams,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                        code: r.course?.code,
                        period: this.formatPeriod(r.periodStart, r.periodEnd),
                    })),
                ).sort((a, b) => a.name.localeCompare(b.name));
                this.exams.set(newExams);
                if (this.limitations.exam) {
                    this.filterExams();
                } else {
                    this.filteredExams.set(newExams);
                }
            }),
        );
    };

    listSections$ = (): Observable<ExamSection[]> => {
        const sections = this.sections().filter((s) => s.filtered);
        return this.Library.listSections$(
            this.getCourseIds(),
            this.getExamIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((resp) => {
                const newSections = this.union(
                    sections,
                    resp.map((r) => ({
                        id: r.id,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                    })),
                ).sort((a, b) => a.name.localeCompare(b.name));
                this.sections.set(newSections);
                if (this.limitations.section) {
                    this.filterSections();
                } else {
                    this.filteredSections.set(newSections);
                }
            }),
        );
    };

    listTags$ = () => {
        const tags = this.tags().filter((t) => t.filtered);
        return this.Library.listTags$(
            this.getCourseIds(),
            this.getExamIds(),
            this.getSectionIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((resp) => {
                const newTags = this.union(
                    tags,
                    resp.map((r) => ({
                        id: r.id as number,
                        name: r.name || '',
                        object: r,
                        filtered: false,
                        usage: r.questions.length,
                    })),
                ).sort((a, b) => a.name.localeCompare(b.name));
                this.tags.set(newTags);
                if (this.limitations.tag) {
                    this.filterTags();
                } else {
                    this.filteredTags.set(newTags);
                }
            }),
        );
    };

    listAllOwners$ = () => {
        if (this.user.isAdmin || this.user.isSupport) {
            const owners = this.owners().filter((o) => o.filtered);
            return this.User.listUsersByRoles$(['TEACHER', 'ADMIN', 'SUPPORT'])
                .pipe(
                    tap((resp) => {
                        const newOwners = this.union(
                            owners,
                            resp.map((r) => ({
                                id: r.id,
                                name: r.firstName + ' ' + r.lastName || '',
                                object: r,
                                filtered: false,
                            })),
                        ).sort((a, b) => a.name.localeCompare(b.name));
                        this.owners.set(newOwners);
                        if (this.limitations.owner) {
                            this.filterOwners();
                        } else {
                            this.filteredOwners.set(newOwners);
                        }
                    }),
                )
                .subscribe();
        } else {
            const questionOwners = this.questions().flatMap((q) => q.questionOwners);
            const uniqueMap: Record<number, User> = {};
            // Filter out duplicates based on the 'id' property
            const uniqueArray = questionOwners.filter((obj) => {
                if (!uniqueMap[obj.id]) {
                    uniqueMap[obj.id] = obj;
                    return true;
                }
                return false;
            });
            const commonOwners = uniqueArray.map((o) => {
                return {
                    id: o.id,
                    name: o.firstName + ' ' + o.lastName || '',
                    object: o,
                    filtered: false,
                } as Filterable<User>;
            });
            const result = this.filteredOwners().length == 0 ? commonOwners : this.filteredOwners();
            this.owners.set(result);
            this.filteredOwners.set(result);
            return result;
        }
    };

    courseOptions = (): Option<Filterable<Course>, number>[] =>
        this.filteredCourses()
            .filter((c) => !c.filtered)
            .map((c) => ({ id: c.id, label: (this.formatCourse(c) + ' ' + c.name).trim(), value: c }));
    examOptions = (): Option<Filterable<Exam>, number>[] =>
        this.filteredExams()
            .filter((e) => !e.filtered)
            .map((e) => ({
                id: e.id,
                label: (this.formatCourse(e) + ' ' + e.name + (e.period ? ' (' + e.period + ')' : '')).trim(),
                value: e,
            }));
    sectionOptions = (): Option<Filterable<ExamSection>, number>[] =>
        this.filteredSections()
            .filter((s) => !s.filtered)
            .map((s) => ({ id: s.id, label: s.name, value: s }));
    tagOptions = (): Option<Filterable<Tag>, number>[] =>
        this.filteredTags()
            .filter((t) => t.filtered === false && t.usage != null && t.usage > 0)
            .map((t) => ({ id: t.id, label: t.name + (t.usage != null ? ' (' + t.usage + ')' : ''), value: t }));
    ownerOptions = (): Option<Filterable<User>, number>[] =>
        this.filteredOwners()
            .filter((o) => !o.filtered)
            .map((o) => ({ id: o.id, label: o.name, value: o }));

    onCourseOpen = (open: boolean) => open && this.listCourses();
    onExamOpen = (open: boolean) => open && this.listExams$().subscribe();
    onSectionOpen = (open: boolean) => open && this.listSections$().subscribe();
    onTagOpen = (open: boolean) => open && this.listTags$().subscribe();
    onOwnerOpen = (open: boolean) => open && this.listAllOwners$();

    onFilterOptionSelected = (option: Option<Filterable<unknown>, number> | undefined) => {
        if (option?.value) this.applyFilter(option.value);
    };

    getFilters = () => {
        const courses = this.courses().filter((c) => c.filtered);
        const exams = this.exams().filter((e) => e.filtered);
        const sections = this.sections().filter((s) => s.filtered);
        const tags = this.tags().filter((t) => t.filtered);
        const owners = this.owners().filter((o) => o.filtered);
        const res: (
            | Filterable<Course>
            | Filterable<Exam>
            | Filterable<ExamSection>
            | Filterable<Tag>
            | Filterable<User>
        )[] = [];
        return res.concat(courses).concat(exams).concat(sections).concat(tags).concat(owners);
    };

    applyFilter = (f: Filterable<unknown>) => {
        f.filtered = !f.filtered;
        this.query$().subscribe(() => this.applySearchFilter());
    };

    filterCourses = () => {
        this.filteredCourses.set(
            this.courses().filter(
                (c) =>
                    c.name.toLowerCase().includes(this.limitations.course.toLowerCase()) ||
                    (c.code && c.code.toLowerCase().includes(this.limitations.course.toLowerCase())),
            ),
        );
    };

    filterExams = () => {
        this.filteredExams.set(
            this.exams().filter(
                (e) =>
                    e.name.toLowerCase().includes(this.limitations.exam.toLowerCase()) ||
                    (e.code && e.code.toLowerCase().includes(this.limitations.exam.toLowerCase())),
            ),
        );
    };

    filterSections = () => {
        this.filteredSections.set(
            this.sections().filter((s) => s.name.toLowerCase().includes(this.limitations.section.toLowerCase())),
        );
    };

    filterTags = () => {
        this.filteredTags.set(
            this.tags().filter((t) => t.name.toLowerCase().includes(this.limitations.tag.toLowerCase())),
        );
    };

    formatCourse = (f: Filterable<Course | Exam>) => (f.code ? this.CourseCode.formatCode(f.code) : '');

    formatPeriod = (s: string | null, e: string | null) =>
        s && e ? `${DateTime.fromISO(s).toFormat('dd.LL.yyyy')}-${DateTime.fromISO(e).toFormat('dd.LL.yyyy')}` : '';

    filterOwners = () => {
        this.filteredOwners.set(
            this.owners().filter((t) => t.name.toLowerCase().indexOf(this.limitations.owner.toLowerCase()) > -1),
        );
    };

    private saveFilters = () => {
        const filters = {
            courses: this.courses(),
            exams: this.exams(),
            sections: this.sections(),
            tags: this.tags(),
            owners: this.owners(),
            text: this.filter().text,
            owner: this.filter().owner,
        };
        this.Library.storeFilters(filters, 'search');
    };

    private getCourseIds = () =>
        this.courses()
            .filter((course) => course.filtered)
            .map((course) => course.id);
    private getExamIds = () =>
        this.exams()
            .filter((exam) => exam.filtered)
            .map((exam) => exam.id);
    private getTagIds = () =>
        this.tags()
            .filter((tag) => tag.filtered)
            .map((tag) => tag.id);
    private getSectionIds = () =>
        this.sections()
            .filter((section) => section.filtered)
            .map((section) => section.id);
    private getOwnerIds = () =>
        this.owners()
            .filter((owner) => owner.filtered)
            .map((owner) => owner.id);

    private union<T>(filtered: Filterable<T>[], tags: Filterable<T>[]): Filterable<T>[] {
        const filteredIds = filtered.map((f) => f.id);
        return filtered.concat(tags.filter((t) => filteredIds.indexOf(t.id) === -1));
    }

    private query$ = (): Observable<LibraryQuestion[]> =>
        this.Library.search(
            this.getCourseIds(),
            this.getExamIds(),
            this.getSectionIds(),
            this.getTagIds(),
            this.getOwnerIds(),
        ).pipe(
            tap((questions) => {
                this.questions.set(questions);
                this.saveFilters();
            }),
        );
}
