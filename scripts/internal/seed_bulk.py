#!/usr/bin/env python3

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

"""
Bulk data seeder for performance testing.

Populates an EXAM database with users, rooms, courses, prototype exams and a large number of
student exams (deep copies of the prototypes, as ExaminationRepository.doCreateExam does), along
with enrolments, reservations, participations, answers, grades and exam records.

Rows are streamed with COPY and primary keys are assigned by the script, so THE APPLICATION MUST
NOT BE RUNNING against the target database while seeding (Ebean caches pre-allocated sequence
values). Sequences are advanced past the loaded ids at the end.

Target a dedicated database, never the dev one. One way to create it (as a superuser):

    createdb -O exam exam_perf
    pg_dump -h localhost -U exam --schema-only exam | psql -h localhost -U exam exam_perf
    pg_dump -h localhost -U exam --data-only -t play_evolutions -t role -t language \\
        -t exam_type -t exam_execution_type -t grade_scale -t grade -t permission exam \\
        | psql -h localhost -U exam exam_perf

Requirements: pip install -r scripts/internal/requirements.txt

Example:

    python3 scripts/internal/seed_bulk.py --dsn "host=localhost dbname=exam_perf user=exam \\
        password=exam" --allow-db exam_perf --attempts 1000000

Seeded users log in (dev login) as perfs<N> / perft<N> / perfa<N> with password "pwd".

A full run takes about half an hour, so back up the seeded database once (in parallel, directory
format) and restore that instead of seeding again. Stop the application first, and refresh the
planner statistics after a restore, which pg_restore does not carry over:

    pg_dump -h localhost -U exam -Fd -j 4 -f ~/backups/exam_perf_seed exam_perf
    pg_restore -h localhost -U exam -d exam_perf --clean --if-exists -j 4 ~/backups/exam_perf_seed
    vacuumdb -h localhost -U exam --analyze-only -j 4 exam_perf
"""

import argparse
import bisect
import hashlib
import json
import random
import sys
import time
import uuid
from datetime import date, datetime, time as dtime, timedelta, timezone
from zoneinfo import ZoneInfo

import psycopg
from faker import Faker

UTC = timezone.utc
EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
ROOM_TZ = 'Europe/Helsinki'
PASSWORD_MD5 = hashlib.md5(b'pwd').hexdigest()

# ExamState
DRAFT, PUBLISHED, STUDENT_STARTED, REVIEW, GRADED, GRADED_LOGGED, ABORTED, INITIALIZED = (
    1, 3, 4, 5, 7, 8, 10, 14
)
# QuestionType
MC, ESSAY, WEIGHTED, CLOZE, CLAIM = 1, 2, 3, 4, 5
# ExamImplementation
AQUARIUM, CLIENT_AUTH = 1, 2

# Tables written by the seeder, in FK-safe order. Each COPY checks FKs row by row, so a
# referenced table must be flushed before the table referencing it.
TABLES = {
    'organisation': ['id', 'code', 'name', 'name_abbreviation', 'object_version'],
    'mail_address': ['id', 'street', 'zip', 'city', 'object_version'],
    'exam_room': [
        'id', 'name', 'room_code', 'building_name', 'campus', 'organization_id', 'mail_address_id',
        'accessible', 'exam_machine_count', 'out_of_service', 'state', 'local_timezone',
        'object_version',
    ],
    'default_working_hours': [
        'id', 'start_time', 'end_time', 'weekday', 'room_id', 'timezone_offset', 'object_version',
    ],
    'exam_starting_hour': ['id', 'starting_hour', 'room_id', 'timezone_offset', 'object_version'],
    'exam_machine': [
        'id', 'name', 'ip_address', 'room_id', 'archived', 'out_of_service', 'object_version',
    ],
    'app_user': [
        'id', 'email', 'eppn', 'last_name', 'first_name', 'password', 'organisation_id',
        'user_agreement_accepted', 'user_identifier', 'employee_number', 'language_id',
        'last_login', 'object_version',
    ],
    'app_user_role': ['app_user_id', 'role_id'],
    'course': [
        'id', 'organisation_id', 'code', 'name', 'level', 'credits', 'identifier',
        'course_implementation', 'course_unit_type', 'grade_scale_id', 'start_date', 'end_date',
        'object_version',
    ],
    'examination_event': ['id', 'start', 'description', 'capacity', 'object_version'],
    'question': [
        'id', 'created', 'creator_id', 'modified', 'modifier_id', 'question', 'shared', 'state',
        'default_max_score', 'parent_id', 'type', 'default_evaluation_type',
        'default_negative_score_allowed', 'default_option_shuffling_on', 'object_version',
    ],
    'question_owner': ['question_id', 'user_id'],
    'multiple_choice_option': [
        'id', 'option', 'correct_option', 'default_score', 'question_id', 'claim_choice_type',
        'object_version',
    ],
    'essay_answer': [
        'id', 'created', 'creator_id', 'modified', 'modifier_id', 'answer', 'evaluated_score',
        'object_version',
    ],
    'cloze_test_answer': ['id', 'answer', 'object_version'],
    'exam': [
        'id', 'created', 'creator_id', 'modified', 'modifier_id', 'name', 'course_id',
        'exam_type_id', 'instruction', 'shared', 'parent_id', 'hash', 'exam_active_start_date',
        'exam_active_end_date', 'duration', 'answer_language', 'graded_by_user_id', 'graded_time',
        'grade_scale_id', 'grade_id', 'credit_type_id', 'execution_type_id', 'trial_count',
        'state', 'anonymous', 'implementation', 'grading_type', 'object_version',
    ],
    'exam_owner': ['exam_id', 'user_id'],
    'exam_language': ['exam_id', 'language_code'],
    'exam_inspection': ['id', 'exam_id', 'user_id', 'assigned_by_id', 'ready', 'object_version'],
    'examination_event_configuration': ['id', 'examination_event_id', 'exam_id', 'object_version'],
    'exam_section': [
        'id', 'created', 'creator_id', 'modified', 'modifier_id', 'name', 'exam_id', 'lottery_on',
        'lottery_item_count', 'sequence_number', 'optional', 'object_version',
    ],
    'exam_section_question': [
        'id', 'exam_section_id', 'question_id', 'sequence_number', 'creator_id', 'created',
        'modifier_id', 'modified', 'max_score', 'essay_answer_id', 'cloze_test_answer_id',
        'evaluation_type', 'expected_word_count', 'negative_score_allowed',
        'option_shuffling_on', 'object_version',
    ],
    'exam_section_question_option': [
        'id', 'exam_section_question_id', 'option_id', 'answered', 'score', 'object_version',
    ],
    'reservation': [
        'id', 'start_at', 'end_at', 'machine_id', 'user_id', 'reminder_sent', 'sent_as_no_show',
        'object_version',
    ],
    'exam_enrolment': [
        'id', 'user_id', 'exam_id', 'reservation_id', 'examination_event_configuration_id',
        'enrolled_on', 'reservation_canceled', 'retrial_permitted', 'no_show', 'delay',
        'object_version',
    ],
    'exam_participation': [
        'id', 'user_id', 'exam_id', 'started', 'ended', 'duration', 'deadline', 'reservation_id',
        'examination_event_id', 'object_version',
    ],
    'exam_score': [
        'id', 'student_id', 'student', 'identifier', 'course_unit_code', 'exam_date', 'credits',
        'credit_language', 'student_grade', 'grade_scale', 'course_unit_level',
        'course_unit_type', 'credit_type', 'lecturer', 'lecturer_id', 'registration_date',
        'course_implementation', 'exam_score', 'lecturer_employee_number', 'institution_name',
        'lecturer_first_name', 'lecturer_last_name', 'object_version',
    ],
    'exam_record': [
        'id', 'teacher_id', 'student_id', 'exam_id', 'exam_score_id', 'time_stamp', 'releasable',
        'object_version',
    ],
}
# Join tables without an id column / sequence
NO_SEQUENCE = {'app_user_role', 'question_owner', 'exam_owner', 'exam_language'}

WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
LOCAL_START_HOURS = [8, 10, 12, 14, 16]  # one reservation slot per machine per hour
DURATIONS = [60, 90, 120]
PROTOTYPE_WINDOW_DAYS = 120  # weekdays a prototype stays open for reservations
CAREER_MAX_DAYS = 6 * 260  # longest student study career, in weekdays
OUTCOMES = ['upcoming', 'noshow', 'aborted', 'review', 'graded', 'logged']


def log(msg):
    print(f'[{time.strftime("%H:%M:%S")}] {msg}', flush=True)


class Ids:
    """Hands out primary keys per table, starting above both max(id) and the sequence value."""

    def __init__(self, conn):
        self.next = {}
        with conn.cursor() as cur:
            for table in TABLES:
                if table in NO_SEQUENCE:
                    continue
                cur.execute(
                    f'SELECT greatest((SELECT coalesce(max(id), 0) FROM {table}), '
                    f'(SELECT last_value FROM {table}_seq))'
                )
                # Leave headroom above the sequence for ids a stopped app may have cached
                self.next[table] = cur.fetchone()[0] + 1000

    def take(self, table):
        i = self.next[table]
        self.next[table] = i + 1
        return i

    def finalize(self, conn):
        with conn.cursor() as cur:
            for table, nxt in self.next.items():
                cur.execute(f"SELECT setval('{table}_seq', %s)", (nxt + 1000,))


class Batch:
    def __init__(self):
        self.rows = {t: [] for t in TABLES}
        self.count = 0

    def add(self, table, row):
        self.rows[table].append(row)
        self.count += 1

    def flush(self, conn):
        with conn.cursor() as cur:
            for table, rows in self.rows.items():
                if not rows:
                    continue
                cols = ', '.join(f'"{c}"' for c in TABLES[table])
                with cur.copy(f'COPY {table} ({cols}) FROM STDIN') as copy:
                    for row in rows:
                        copy.write_row(row)
                rows.clear()
        conn.commit()
        n, self.count = self.count, 0
        return n


def check_schema(conn):
    """Fail early if the schema has drifted from what the seeder writes."""
    errors = []
    with conn.cursor() as cur:
        for table, cols in TABLES.items():
            cur.execute(
                'SELECT column_name, is_nullable, column_default FROM information_schema.columns '
                "WHERE table_schema = 'public' AND table_name = %s",
                (table,),
            )
            actual = {name: (nullable, default) for name, nullable, default in cur.fetchall()}
            if not actual:
                errors.append(f'missing table {table}')
                continue
            for c in cols:
                if c not in actual:
                    errors.append(f'{table}.{c} does not exist')
            for c, (nullable, default) in actual.items():
                if nullable == 'NO' and default is None and c not in cols:
                    errors.append(f'{table}.{c} is NOT NULL without default and is not seeded')
    if errors:
        sys.exit('Schema check failed:\n  ' + '\n  '.join(errors))


def check_target(conn, args):
    with conn.cursor() as cur:
        cur.execute('SELECT current_database()')
        db = cur.fetchone()[0]
        if db != args.allow_db:
            sys.exit(f'Connected to "{db}" but --allow-db is "{args.allow_db}"; refusing to seed.')
        cur.execute(
            'SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() '
            'AND pid <> pg_backend_pid()'
        )
        others = cur.fetchone()[0]
        if others and not args.force:
            sys.exit(
                f'{others} other connection(s) to "{db}". Stop the application first '
                '(or pass --force if they are not the app).'
            )
        cur.execute('SELECT count(*) FROM app_user WHERE eppn LIKE %s', (f'{args.prefix}%',))
        if cur.fetchone()[0]:
            sys.exit(f'Users with eppn prefix "{args.prefix}" already exist; use another --prefix.')


def load_reference(conn):
    ref = {}
    with conn.cursor() as cur:
        cur.execute('SELECT name, id FROM role')
        ref['roles'] = dict(cur.fetchall())
        cur.execute('SELECT type, id FROM exam_type')
        ref['exam_types'] = dict(cur.fetchall())
        cur.execute('SELECT type, id FROM exam_execution_type')
        ref['execution_types'] = dict(cur.fetchall())
        cur.execute('SELECT code FROM language')
        ref['languages'] = [r[0] for r in cur.fetchall()]
        cur.execute(
            "SELECT s.id, s.description, g.id, g.name, coalesce(g.marks_rejection, false) "
            "FROM grade_scale s JOIN grade g ON g.grade_scale_id = s.id "
            "WHERE s.description IN ('ZERO_TO_FIVE', 'LATIN', 'APPROVED_REJECTED') "
            'ORDER BY s.id, g.id'
        )
        scales = {}
        for sid, desc, gid, name, rejection in cur.fetchall():
            scales.setdefault(sid, {'description': desc, 'grades': []})['grades'].append(
                (gid, name, rejection)
            )
        ref['scales'] = scales
        cur.execute("SELECT value FROM general_settings WHERE name = 'review_deadline'")
        row = cur.fetchone()
        ref['review_deadline'] = int(row[0]) if row else 14
    missing = [
        what for what, ok in [
            ('roles ADMIN/STUDENT/TEACHER', {'ADMIN', 'STUDENT', 'TEACHER'} <= ref['roles'].keys()),
            ('exam types PARTIAL/FINAL', {'PARTIAL', 'FINAL'} <= ref['exam_types'].keys()),
            ('execution types PUBLIC/PRIVATE',
             {'PUBLIC', 'PRIVATE'} <= ref['execution_types'].keys()),
            ('languages fi/sv/en', {'fi', 'sv', 'en'} <= set(ref['languages'])),
            ('grade scales', len(scales) == 3),
        ] if not ok
    ]
    if missing:
        sys.exit('Reference data missing (did evolutions run?): ' + ', '.join(missing))
    return ref


def ordered_grades(scale):
    """Grades of a scale ordered from worst to best, for mapping a score percentage to a grade."""
    grades = scale['grades']
    if scale['description'] == 'APPROVED_REJECTED':
        return sorted(grades, key=lambda g: not g[2], reverse=False)  # REJECTED, APPROVED
    if scale['description'] == 'ZERO_TO_FIVE':
        return sorted(grades, key=lambda g: int(g[1]))
    order = ['I', 'A', 'B', 'N', 'C', 'M', 'E', 'L']
    return sorted(grades, key=lambda g: order.index(g[1]) if g[1] in order else 0)


class Seeder:
    def __init__(self, conn, args):
        self.conn = conn
        self.args = args
        self.rng = random.Random(args.seed)
        self.fake = Faker(['fi_FI', 'sv_SE', 'en_US'])
        self.fake.seed_instance(args.seed)
        self.ids = Ids(conn)
        self.ref = load_reference(conn)
        self.batch = Batch()
        self.total_rows = 0
        self.now = datetime.now(UTC).replace(microsecond=0)
        # DateTimeHandler.adjustDST shifts participation times by +1h when the room's zone is
        # currently (at write time) on DST; normalize() undoes it on read. Mirror that.
        tz = ZoneInfo(ROOM_TZ)
        self.dst_shift = timedelta(hours=1) if datetime.now(tz).dst() else timedelta(0)
        self.tz = tz
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' "
                        "AND table_name = 'exam' AND column_name = 'locked_at'")
            self.has_locked_at = cur.fetchone() is not None
        if self.has_locked_at:
            TABLES['exam'].append('locked_at')
        self.grade_orders = {sid: ordered_grades(s) for sid, s in self.ref['scales'].items()}
        # Text pools; generating Faker values per row is too slow at this scale
        self.paragraphs = [self.fake.paragraph(nb_sentences=6) for _ in range(300)]
        self.sentences = [self.fake.sentence(nb_words=10) for _ in range(500)]
        self.words = [self.fake.word() for _ in range(500)]

    # ----------------------------------------------------------------------------------- helpers

    def add(self, table, row):
        self.batch.add(table, row)

    def flush(self):
        self.total_rows += self.batch.flush(self.conn)

    def locked(self, value):
        """Value for exam.locked_at (retention branch, evolution 148) when the column exists."""
        return (value,) if self.has_locked_at else ()

    def local_dt(self, day, hour, minute=0):
        return datetime.combine(day, dtime(hour, minute), self.tz).astimezone(UTC)

    # ------------------------------------------------------------------------ static structure

    def seed_facilities(self):
        a = self.args
        self.orgs = []
        for i in range(a.organisations):
            oid = self.ids.take('organisation')
            name = f'{self.fake.city()} University {i + 1}'
            self.add('organisation', (oid, f'{a.prefix}org{i}.fi', name, f'U{i + 1}', 1))
            self.orgs.append((oid, name))

        std_offset_ms = int(datetime(2026, 1, 15, tzinfo=self.tz).utcoffset().total_seconds() * 1000)
        std_offset_h = std_offset_ms // 3_600_000
        self.machines = []  # (machine_id, room_id)
        for r in range(a.rooms):
            mid = self.ids.take('mail_address')
            self.add('mail_address', (mid, self.fake.street_address(), self.fake.postcode(),
                                      self.fake.city(), 1))
            rid = self.ids.take('exam_room')
            org = self.orgs[r % len(self.orgs)][0]
            self.add('exam_room', (rid, f'Exam room {r + 1}', f'R{r + 1:03d}',
                                   f'Building {r // 5 + 1}', 'Main campus', org, mid, True,
                                   a.machines_per_room, False, 'ACTIVE', ROOM_TZ, 1))
            # Working hours are stored as UTC time-of-day plus the zone's standard offset
            for wd in WEEKDAYS:
                self.add('default_working_hours', (
                    self.ids.take('default_working_hours'),
                    f'{7 - std_offset_h:02d}:00:00+00', f'{19 - std_offset_h:02d}:59:59.999+00',
                    wd, rid, std_offset_ms, 1,
                ))
            for h in LOCAL_START_HOURS:
                self.add('exam_starting_hour', (
                    self.ids.take('exam_starting_hour'), f'{h - std_offset_h:02d}:00:00+00', rid,
                    std_offset_ms, 1,
                ))
            for m in range(a.machines_per_room):
                eid = self.ids.take('exam_machine')
                ip = f'10.{r // 250}.{r % 250}.{m + 1}'
                self.add('exam_machine', (eid, f'R{r + 1:03d}-M{m + 1:02d}', ip, rid, False,
                                          False, 1))
                self.machines.append(eid)
        self.flush()
        log(f'{a.rooms} rooms, {len(self.machines)} machines')

    def seed_users(self):
        a = self.args
        roles = self.ref['roles']
        langs = ['fi'] * 7 + ['sv'] * 2 + ['en']
        first = [self.fake.first_name() for _ in range(400)]
        last = [self.fake.last_name() for _ in range(400)]
        n_students = a.users - a.teachers - a.admins
        if n_students <= 0:
            sys.exit('--users must exceed --teachers + --admins')
        self.students, self.teachers = [], []
        self.staff_first_id = self.ids.next['app_user']
        groups = [('a', a.admins, 'ADMIN'), ('t', a.teachers, 'TEACHER'),
                  ('s', n_students, 'STUDENT')]
        for kind, count, role in groups:
            for n in range(count):
                uid = self.ids.take('app_user')
                fn, ln = self.rng.choice(first), self.rng.choice(last)
                eppn = f'{a.prefix}{kind}{n}@funet.fi'
                org = self.rng.choice(self.orgs)[0]
                ident = f'{self.rng.randint(10_000_000, 99_999_999)}' if kind == 's' else None
                empno = f'E{uid}' if kind == 't' else None
                # last_login is filled in from the seeded activity at the end
                self.add('app_user', (uid, eppn, eppn, ln, fn, PASSWORD_MD5, org, True, ident,
                                      empno, self.rng.choice(langs), None, 1))
                self.add('app_user_role', (uid, roles[role]))
                if kind == 't':
                    self.teachers.append((uid, eppn, ident, empno, fn, ln))
                elif kind == 's':
                    # A study career of 3-6 years, starting anywhere so that careers cover the
                    # whole history evenly. Enrolments fall inside it, so old students go quiet.
                    length = self.rng.randint(3 * 260, CAREER_MAX_DAYS)
                    start = self.rng.randint(-length, len(self.days) - 1)
                    self.students.append((uid, eppn, ident, start, start + length))
        self.student_id_range = (min(st[0] for st in self.students), uid)
        self.students.sort(key=lambda st: st[3])
        self.student_starts = [st[3] for st in self.students]
        self.flush()
        log(f'{a.users} users ({n_students} students, {a.teachers} teachers, {a.admins} admins)')

    def seed_courses(self):
        a = self.args
        self.courses = []
        scale_ids = list(self.ref['scales'])
        for n in range(a.courses):
            cid = self.ids.take('course')
            org_id, org_name = self.rng.choice(self.orgs)
            code = f'{a.prefix.upper()}-{n:05d}'
            credits = float(self.rng.choice([1, 2, 3, 5, 5, 5, 10]))
            scale = self.rng.choice(scale_ids)
            level = self.rng.choice(['basic', 'intermediate', 'advanced'])
            course = {
                'id': cid, 'code': code, 'credits': credits, 'scale': scale, 'level': level,
                'identifier': f'{code}-ID', 'implementation': f'{code}-2026', 'type': 'study',
                'org_name': org_name,
            }
            self.add('course', (cid, org_id, code, f'Course {n} {self.rng.choice(self.words)}',
                                level, credits, course['identifier'], course['implementation'],
                                course['type'], scale, None, None, 1))
            self.courses.append(course)
        self.flush()
        log(f'{a.courses} courses')

    def build_calendar(self):
        """Weekday calendar from (now - years) to (now + upcoming days) used for slot picking."""
        start = (self.now - timedelta(days=int(365.25 * self.args.years))).date()
        end = (self.now + timedelta(days=self.args.upcoming_days)).date()
        today = self.now.date()
        self.days = []
        d = start
        while d <= end:
            if d.weekday() < 5:
                self.days.append(d)
            d += timedelta(days=1)
        self.today_idx = bisect.bisect_left(self.days, today)
        recent = bisect.bisect_left(self.days, today - timedelta(days=self.args.recent_days))
        last_past = self.today_idx - 1
        # Everything in the past spreads evenly over the history, like years of real use. Only
        # unassessed attempts (review/graded) lean recent: teachers finish most of them, but
        # --stale-share of them are left behind over the whole history.
        self.ranges = {
            'upcoming': (self.today_idx + 1, len(self.days) - 1),
            'past': (0, last_past),
            'recent': (recent, last_past),
        }

    def make_question(self, qtype):
        """Returns (question_row_fields, options) for a library question."""
        text = self.rng.choice(self.sentences)
        if qtype == MC:
            opts = [(self.rng.choice(self.words), i == 0, None, None) for i in range(3)]
            return f'<p>{text}</p>', float(self.rng.choice([1, 2, 3])), None, opts
        if qtype == WEIGHTED:
            scores = [1.0, 1.0, -0.5, -0.5]
            opts = [(self.rng.choice(self.words), s > 0, s, None) for s in scores]
            return f'<p>{text}</p>', 2.0, None, opts
        if qtype == CLAIM:
            opts = [('Totta', True, 1.0, 1), ('Tarua', False, -1.0, 2), ('En osaa sanoa', False,
                                                                        0.0, 3)]
            return f'<p>{text}</p>', 1.0, None, opts
        if qtype == CLOZE:
            w1, w2 = self.rng.choice(self.words), self.rng.choice(self.words)
            q = (f'<p><span cloze="true" id="1">{w1}</span> {text} '
                 f'<span cloze="true" id="2">{w2}</span></p>')
            return q, 4.0, None, []
        return f'<p>{text}</p>', 10.0, 1, []  # essay, evaluation type Points

    def seed_prototypes(self):
        a = self.args
        exec_public = self.ref['execution_types']['PUBLIC']
        exec_private = self.ref['execution_types']['PRIVATE']
        exam_types = list(self.ref['exam_types'].values())
        qtypes = [MC] * 4 + [ESSAY] * 2 + [WEIGHTED] * 2 + [CLOZE] + [CLAIM]
        self.prototypes = []
        first_start = -PROTOTYPE_WINDOW_DAYS
        last_start = len(self.days) - 1
        for n in range(a.exams):
            owner = self.rng.choice(self.teachers)
            inspector = self.rng.choice(self.teachers)
            course = self.rng.choice(self.courses)
            start_idx = self.rng.randint(first_start, last_start)
            active_start = self.days[max(start_idx, 0)]
            active_end = self.days[min(start_idx + PROTOTYPE_WINDOW_DAYS, len(self.days) - 1)]
            created = self.local_dt(active_start, 9) - timedelta(days=self.rng.randint(7, 60))
            byod = self.rng.random() < a.byod_share
            eid = self.ids.take('exam')
            proto = {
                'id': eid, 'start_idx': start_idx, 'owner': owner, 'course': course,
                'name': f'{course["code"]} exam {n}', 'duration': self.rng.choice(DURATIONS),
                'exam_type': self.rng.choice(exam_types),
                'execution_type': exec_private if self.rng.random() < 0.2 else exec_public,
                'active_start': self.local_dt(active_start, 0),
                'active_end': self.local_dt(active_end, 23, 59),
                'lang': self.rng.choice(['fi', 'fi', 'fi', 'sv', 'en']),
                'implementation': CLIENT_AUTH if byod else AQUARIUM,
                'inspectors': [owner[0]] + ([inspector[0]] if inspector != owner else []),
                'sections': [],
            }
            self.add('exam', (eid, created, owner[0], created, owner[0], proto['name'],
                              course['id'], proto['exam_type'], '<p>Instructions</p>', False,
                              None, uuid.uuid4().hex, proto['active_start'], proto['active_end'],
                              proto['duration'], proto['lang'], None, None, course['scale'], None,
                              proto['exam_type'], proto['execution_type'], 1, PUBLISHED, False,
                              proto['implementation'], 1, 1) + self.locked(None))
            self.add('exam_owner', (eid, owner[0]))
            self.add('exam_language', (eid, proto['lang']))
            for uid in proto['inspectors']:
                self.add('exam_inspection', (self.ids.take('exam_inspection'), eid, uid, owner[0],
                                             False, 1))
            per_section = [a.questions // a.sections] * a.sections
            for i in range(a.questions % a.sections):
                per_section[i] += 1
            for s, q_count in enumerate(per_section):
                sid = self.ids.take('exam_section')
                self.add('exam_section', (sid, created, owner[0], created, owner[0],
                                          f'Section {s + 1}', eid, False, 1, s, False, 1))
                section = {'name': f'Section {s + 1}', 'seq': s, 'questions': []}
                for qn in range(q_count):
                    qtype = self.rng.choice(qtypes)
                    qtext, max_score, eval_type, opts = self.make_question(qtype)
                    qid = self.ids.take('question')
                    self.add('question', (qid, created, owner[0], created, owner[0], qtext, False,
                                          'SAVED', max_score, None, qtype, eval_type, False,
                                          True, 1))
                    self.add('question_owner', (qid, owner[0]))
                    esq_id = self.ids.take('exam_section_question')
                    self.add('exam_section_question', (
                        esq_id, sid, qid, qn, owner[0], created, owner[0], created, max_score,
                        None, None, eval_type, 300 if qtype == ESSAY else None, False, True, 1,
                    ))
                    options = []
                    for text, correct, score, claim in opts:
                        oid = self.ids.take('multiple_choice_option')
                        self.add('multiple_choice_option', (oid, text, correct, score, qid, claim,
                                                            1))
                        self.add('exam_section_question_option', (
                            self.ids.take('exam_section_question_option'), esq_id, oid, False,
                            score, 1,
                        ))
                        options.append((text, correct, score, claim))
                    section['questions'].append({
                        'id': qid, 'type': qtype, 'text': qtext, 'max': max_score,
                        'eval_type': eval_type, 'options': options, 'seq': qn,
                    })
                proto['sections'].append(section)
            self.prototypes.append(proto)
            if self.batch.count > 50_000:
                self.flush()
        self.flush()
        self.prototypes.sort(key=lambda p: p['start_idx'])
        for i, proto in enumerate(self.prototypes):
            proto['idx'] = i
        self.proto_starts = [p['start_idx'] for p in self.prototypes]
        log(f'{a.exams} prototype exams ({a.questions} questions each)')

    # ------------------------------------------------------------------------- student exams

    def pick_prototype(self, day_idx):
        lo = bisect.bisect_left(self.proto_starts, day_idx - PROTOTYPE_WINDOW_DAYS)
        hi = bisect.bisect_right(self.proto_starts, day_idx)
        if lo >= hi:
            return None
        return self.prototypes[self.rng.randrange(lo, hi)]

    def event_for(self, proto, day_idx, hour_idx):
        key = (proto['id'], day_idx, hour_idx)
        ev = self.events.get(key)
        if ev is None:
            start = self.local_dt(self.days[day_idx], LOCAL_START_HOURS[hour_idx])
            ev_id = self.ids.take('examination_event')
            conf_id = self.ids.take('examination_event_configuration')
            self.add('examination_event', (ev_id, start, f'{proto["name"]} event', 1000, 1))
            self.add('examination_event_configuration', (conf_id, ev_id, proto['id'], 1))
            ev = self.events[key] = (ev_id, conf_id, start)
        return ev

    def pick_student(self, day_idx):
        """A student whose study career covers the day, or None."""
        lo = bisect.bisect_left(self.student_starts, day_idx - CAREER_MAX_DAYS)
        hi = bisect.bisect_right(self.student_starts, day_idx)
        for _ in range(20):
            if lo >= hi:
                return None
            i = self.rng.randrange(lo, hi)
            if self.students[i][4] >= day_idx:
                return i
        return None

    def pick_slot(self, outcome):
        """Picks (day, hour, machine, student, prototype) with no machine or student overlap."""
        if outcome == 'upcoming':
            period = 'upcoming'
        elif outcome in ('review', 'graded') and self.rng.random() >= self.args.stale_share:
            period = 'recent'
        else:
            period = 'past'
        lo, hi = self.ranges[period]
        n_hours, n_machines = len(LOCAL_START_HOURS), len(self.machines)
        for _ in range(100):
            d = self.rng.randint(lo, hi)
            h = self.rng.randrange(n_hours)
            proto = self.pick_prototype(d)
            if proto is None:
                continue
            student = self.pick_student(d)
            if student is None:
                continue
            student_key = (student * len(self.days) + d) * n_hours + h
            enrolled_key = student * len(self.prototypes) + proto['idx']
            if student_key in self.student_slots or enrolled_key in self.enrolled:
                continue
            m = None
            if proto['implementation'] == AQUARIUM:
                m = self.rng.randrange(n_machines)
                machine_key = (m * len(self.days) + d) * n_hours + h
                if machine_key in self.machine_slots:
                    continue
                self.machine_slots.add(machine_key)
            self.student_slots.add(student_key)
            self.enrolled.add(enrolled_key)
            return d, h, m, student, proto
        sys.exit(f'Could not find a free slot for a "{outcome}" enrolment; add rooms/machines or '
                 'widen --recent-days / --years.')

    def grade_for(self, scale_id, pct):
        grades = self.grade_orders[scale_id]
        if self.ref['scales'][scale_id]['description'] == 'APPROVED_REJECTED':
            return grades[1] if pct >= 0.5 else grades[0]
        return grades[min(int(pct * len(grades)), len(grades) - 1)]

    def copy_exam(self, proto, student_id, outcome, created, graded):
        """Deep-copies a prototype for a student and fills in answers. Returns (id, score, max)."""
        eid = self.ids.take('exam')
        answered = outcome in ('review', 'graded', 'logged', 'aborted')
        total, max_total = 0.0, 0.0
        for inspector in proto['inspectors']:
            self.add('exam_inspection', (self.ids.take('exam_inspection'), eid, inspector,
                                         proto['owner'][0], outcome == 'logged', 1))
        for section in proto['sections']:
            sid = self.ids.take('exam_section')
            self.add('exam_section', (sid, created, student_id, created, student_id,
                                      section['name'], eid, False, 1, section['seq'], False, 1))
            for q in section['questions']:
                qid = self.ids.take('question')
                self.add('question', (qid, created, student_id, created, student_id, q['text'],
                                      False, 'SAVED', q['max'], q['id'], q['type'],
                                      q['eval_type'], False, True, 1))
                esq_id = self.ids.take('exam_section_question')
                essay_id = cloze_id = None
                score = 0.0
                max_total += q['max']
                option_rows = []
                chosen = set()
                if answered and q['options']:
                    if q['type'] == WEIGHTED:
                        chosen = set(self.rng.sample(range(len(q['options'])),
                                                     self.rng.randint(1, 2)))
                    elif q['type'] == MC:
                        chosen = {0 if self.rng.random() < 0.7 else self.rng.randrange(3)}
                    else:
                        chosen = {self.rng.choice([0, 0, 0, 1, 2])}
                for i, (text, correct, opt_score, claim) in enumerate(q['options']):
                    oid = self.ids.take('multiple_choice_option')
                    self.add('multiple_choice_option', (oid, text, correct, opt_score, qid, claim,
                                                        1))
                    option_rows.append((self.ids.take('exam_section_question_option'), esq_id,
                                        oid, i in chosen, opt_score, 1))
                    if i in chosen:
                        score += q['max'] if q['type'] == MC and correct else (opt_score or 0.0)
                if answered and q['type'] == ESSAY:
                    essay_id = self.ids.take('essay_answer')
                    evaluated = float(self.rng.randint(0, int(q['max']))) if graded else None
                    self.add('essay_answer', (essay_id, created, student_id, created, student_id,
                                              f'<p>{self.rng.choice(self.paragraphs)}</p>',
                                              evaluated, 1))
                    score = evaluated or 0.0
                elif answered and q['type'] == CLOZE:
                    cloze_id = self.ids.take('cloze_test_answer')
                    right = self.rng.randint(0, 2)
                    self.add('cloze_test_answer', (cloze_id, json.dumps(
                        {'1': 'x' if right < 1 else '', '2': 'y' if right < 2 else ''}), 1))
                    score = q['max'] * right / 2
                total += score
                self.add('exam_section_question', (
                    esq_id, sid, qid, q['seq'], student_id, created, student_id, created,
                    q['max'], essay_id, cloze_id, q['eval_type'],
                    300 if q['type'] == ESSAY else None, False, True, 1,
                ))
                for row in option_rows:
                    self.add('exam_section_question_option', row)
        return eid, max(total, 0.0), max_total

    def seed_enrolments(self):
        a = self.args
        weights = [a.mix[o] for o in OUTCOMES]
        self.machine_slots, self.student_slots, self.enrolled = set(), set(), set()
        self.events = {}
        deadline_days = self.ref['review_deadline']
        started_at = time.time()
        n = attempts = 0
        while attempts < a.attempts:
            outcome = self.rng.choices(OUTCOMES, weights)[0]
            d, h, m, s_idx, proto = self.pick_slot(outcome)
            student_id, student_eppn, student_ident = self.students[s_idx][:3]
            n += 1
            byod = proto['implementation'] == CLIENT_AUTH
            if byod:
                ev_id, conf_id, start = self.event_for(proto, d, h)
                res_id = None
            else:
                ev_id = conf_id = None
                start = self.local_dt(self.days[d], LOCAL_START_HOURS[h])
                res_id = self.ids.take('reservation')
                past = outcome != 'upcoming'
                self.add('reservation', (res_id, start, start + timedelta(minutes=proto['duration']),
                                         self.machines[m], student_id, past, False, 1))
            enrolled_on = min(start - timedelta(days=self.rng.randint(1, 30),
                                                hours=self.rng.randint(0, 12)), self.now)
            if outcome in ('upcoming', 'noshow'):
                self.add('exam_enrolment', (self.ids.take('exam_enrolment'), student_id,
                                            proto['id'], res_id, conf_id, enrolled_on, False,
                                            False, outcome == 'noshow', 0, 1))
            else:
                self.seed_student_exam(proto, outcome, start, student_id, student_eppn,
                                       student_ident, res_id, ev_id, conf_id, enrolled_on,
                                       deadline_days, byod)
                attempts += 1
            if self.batch.count >= a.chunk_rows:
                self.flush()
                rate = attempts / (time.time() - started_at)
                log(f'{attempts}/{a.attempts} attempts, {n} enrolments, {self.total_rows} rows '
                    f'({rate:.0f} attempts/s)')
        self.flush()
        log(f'{attempts} attempts, {n} enrolments done')

    def update_last_logins(self):
        """Students last logged in a little after their last activity, staff recently."""
        lo, hi = self.student_id_range
        with self.conn.cursor() as cur:
            cur.execute('SELECT setseed(%s)', (self.args.seed % 1000 / 1000,))
            cur.execute(
                "UPDATE app_user u SET last_login = least(now(), x.t + random() * '30 days'::interval) "
                'FROM (SELECT e.user_id, greatest(max(e.enrolled_on), max(p.ended)) AS t '
                '      FROM exam_enrolment e '
                '      LEFT JOIN exam_participation p ON p.exam_id = e.exam_id '
                '      WHERE e.user_id BETWEEN %s AND %s GROUP BY e.user_id) x '
                'WHERE u.id = x.user_id',
                (lo, hi),
            )
            # Students who never enrolled: some time in the history
            cur.execute(
                "UPDATE app_user SET last_login = now() - random() * %s * '1 year'::interval "
                'WHERE id BETWEEN %s AND %s AND last_login IS NULL',
                (self.args.years, lo, hi),
            )
            # Staff log in regularly
            cur.execute(
                "UPDATE app_user SET last_login = now() - random() * '14 days'::interval "
                'WHERE id >= %s AND id < %s',
                (self.staff_first_id, lo),
            )
        self.conn.commit()
        log('last_login set')

    def seed_student_exam(self, proto, outcome, start, student_id, student_eppn, student_ident,
                          res_id, ev_id, conf_id, enrolled_on, deadline_days, byod):
        owner = proto['owner']
        course = proto['course']
        graded = outcome in ('graded', 'logged')
        started = start + timedelta(minutes=self.rng.randint(0, 5))
        if outcome == 'aborted':
            ended = started + timedelta(minutes=self.rng.randint(1, 20))
        else:
            ended = started + timedelta(minutes=self.rng.randint(proto['duration'] // 2,
                                                                 proto['duration']))
        # Children may be queued before the exam row: Batch.flush writes tables in FK order
        eid, score, max_score = self.copy_exam(proto, student_id, outcome, started, graded)
        state = {'aborted': ABORTED, 'review': REVIEW, 'graded': GRADED,
                 'logged': GRADED_LOGGED}[outcome]
        graded_time = grade_id = graded_by = None
        grade = None
        if graded:
            graded_time = min(ended + timedelta(days=self.rng.randint(1, deadline_days),
                                                hours=self.rng.randint(0, 8)), self.now)
            grade = self.grade_for(course['scale'], score / max_score if max_score else 0)
            grade_id, graded_by = grade[0], owner[0]
        # Registered (logged) assessments lock when the exam record is written
        stamp = None
        if outcome == 'logged':
            stamp = min(graded_time + timedelta(hours=self.rng.randint(0, 48)), self.now)
        self.add('exam', (
            eid, started, student_id, ended, student_id, proto['name'], course['id'],
            proto['exam_type'], '<p>Instructions</p>', False, proto['id'], uuid.uuid4().hex,
            proto['active_start'], proto['active_end'], proto['duration'], proto['lang'],
            graded_by, graded_time, course['scale'], grade_id, proto['exam_type'],
            proto['execution_type'], 1, state, False, proto['implementation'], 1, 1,
        ) + self.locked(stamp))
        self.add('exam_language', (eid, proto['lang']))
        self.add('exam_enrolment', (self.ids.take('exam_enrolment'), student_id, eid, res_id,
                                    conf_id, enrolled_on, False, False, False, 0, 1))
        shift = timedelta(0) if byod else self.dst_shift
        p_started, p_ended = started + shift, ended + shift
        self.add('exam_participation', (
            self.ids.take('exam_participation'), student_id, eid, p_started, p_ended,
            EPOCH + (ended - started), p_ended + timedelta(days=deadline_days), res_id, ev_id, 1,
        ))
        if outcome == 'logged':
            score_id = self.ids.take('exam_score')
            scale = self.ref['scales'][course['scale']]
            exam_type_name = next(k for k, v in self.ref['exam_types'].items()
                                  if v == proto['exam_type'])
            self.add('exam_score', (
                score_id, student_ident, student_eppn, course['identifier'], course['code'],
                started.astimezone(self.tz).strftime('%Y-%m-%d'), str(course['credits']),
                proto['lang'], grade[1], scale['description'], course['level'], course['type'],
                exam_type_name, owner[1], owner[2], stamp.astimezone(self.tz).strftime('%Y-%m-%d'),
                course['implementation'], str(round(score, 2)), owner[3], course['org_name'],
                owner[4], owner[5], 1,
            ))
            self.add('exam_record', (self.ids.take('exam_record'), owner[0], student_id, eid,
                                     score_id, stamp, True, 1))

    def run(self):
        t0 = time.time()
        self.build_calendar()
        self.seed_facilities()
        self.seed_users()
        self.seed_courses()
        self.seed_prototypes()
        self.seed_enrolments()
        self.update_last_logins()
        self.ids.finalize(self.conn)
        self.conn.commit()
        log(f'Sequences advanced. {self.total_rows} rows in {time.time() - t0:.0f}s')
        if not self.args.skip_analyze:
            log('ANALYZE ...')
            self.conn.autocommit = True
            with self.conn.cursor() as cur:
                for table in TABLES:
                    cur.execute(f'ANALYZE {table}')
        log('Done')


def parse_mix(value):
    mix = dict.fromkeys(OUTCOMES, 0.0)
    for part in value.split(','):
        key, _, weight = part.partition('=')
        if key.strip() not in mix:
            raise argparse.ArgumentTypeError(f'unknown outcome "{key}"; one of {OUTCOMES}')
        mix[key.strip()] = float(weight)
    if not any(mix.values()):
        raise argparse.ArgumentTypeError('all outcome weights are zero')
    return mix


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dsn', required=True, help='libpq connection string')
    ap.add_argument('--allow-db', required=True,
                    help='name of the target database; the seeder refuses any other')
    ap.add_argument('--force', action='store_true',
                    help='seed even if other sessions are connected to the database')
    ap.add_argument('--prefix', default='perf', help='prefix for eppns, course codes etc.')
    ap.add_argument('--seed', type=int, default=42, help='random seed')
    ap.add_argument('--users', type=int, default=20_000)
    ap.add_argument('--teachers', type=int, default=1_000)
    ap.add_argument('--admins', type=int, default=5)
    ap.add_argument('--organisations', type=int, default=5)
    ap.add_argument('--rooms', type=int, default=50)
    ap.add_argument('--machines-per-room', type=int, default=20)
    ap.add_argument('--courses', type=int, default=3_000)
    ap.add_argument('--exams', type=int, default=16_000, help='prototype (teacher) exams')
    ap.add_argument('--sections', type=int, default=3, help='sections per exam')
    ap.add_argument('--questions', type=int, default=10, help='questions per exam')
    ap.add_argument('--byod-share', type=float, default=0.05,
                    help='share of prototype exams that are BYOD (examination events)')
    ap.add_argument('--attempts', type=int, default=1_000_000,
                    help='number of exam attempts (participations) to create; no-show and '
                         'upcoming enrolments come on top of these, see --mix')
    ap.add_argument('--mix', type=parse_mix,
                    default=parse_mix('upcoming=2,noshow=3,aborted=3,review=10,graded=12,'
                                      'logged=70'),
                    help='relative weights of enrolment outcomes: ' + ', '.join(OUTCOMES))
    ap.add_argument('--years', type=float, default=10, help='history length')
    ap.add_argument('--recent-days', type=int, default=180,
                    help='most review/graded attempts fall within this many past days')
    ap.add_argument('--stale-share', type=float, default=0.2,
                    help='share of review/graded attempts spread over the whole history '
                         '(unassessed backlog)')
    ap.add_argument('--upcoming-days', type=int, default=60)
    ap.add_argument('--chunk-rows', type=int, default=500_000,
                    help='rows buffered before each COPY + commit')
    ap.add_argument('--skip-analyze', action='store_true')
    args = ap.parse_args()

    with psycopg.connect(args.dsn) as conn:
        check_target(conn, args)
        check_schema(conn)
        Seeder(conn, args).run()


if __name__ == '__main__':
    main()
