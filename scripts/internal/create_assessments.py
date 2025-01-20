#!/usr/bin/python

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

import argparse
from datetime import datetime, timedelta
from hashlib import md5
from psycopg2 import connect
import random
import string

conn_string = "host='localhost' dbname='exam' user='exam' password='exam'"
conn = connect(conn_string)
cursor = conn.cursor()


def flatten(l):
    return [item for sublist in l for item in sublist]


def md5_hash(n):
    return md5(''.join(random.choice(string.ascii_lowercase) for _ in range(n)).encode('utf-8')).hexdigest()


def insert_stmt(obj, table, with_version=True):
    def prepare(val):
        if val is None:
            return 'null'
        if isinstance(val, datetime) or isinstance(val, str):
            return "'%s'" % val
        return val

    prepared = {k: prepare(obj[k]) for k in obj}
    if with_version:
        prepared.update({'object_version': 1})
    return 'INSERT INTO %s (%s) VALUES (%s)' % (
        table,
        ','.join(prepared.keys()),
        ','.join([str(x) for x in prepared.values()])
    )


def next_id(table):
    cursor.execute("SELECT nextval('%s_seq')" % table)
    return int(cursor.fetchone()[0])


def select(unique=False):
    names = [desc[0] for desc in cursor.description]
    result = map(dict, [[(names[i], row[i]) for (i, name) in enumerate(names)] for row in cursor])
    return list(result)[0] if unique else list(result)


def machine_id(room_id):
    cursor.execute('SELECT max(id) FROM exam_machine WHERE room_id=%s AND out_of_service=false' % room_id)
    return cursor.fetchone()[0]


def parent_question(question_id):
    cursor.execute('SELECT * FROM question WHERE id=%s' % question_id)
    return select(unique=True)


def parent_options(question_id):
    cursor.execute('SELECT * FROM multiple_choice_option WHERE question_id=%s' % question_id)
    return select()


def parent_section_questions(section_id):
    cursor.execute('SELECT * FROM exam_section_question WHERE exam_section_id=%s' % section_id)
    return select()


def parent_sections(exam_id):
    cursor.execute('SELECT * FROM exam_section WHERE exam_id=%s' % exam_id)
    return select()


def parent_section(section_id):
    cursor.execute('SELECT * FROM exam_section WHERE id=%s' % section_id)
    return select(unique=True)


def parent_section_question_options(section_question_id):
    cursor.execute('SELECT * FROM exam_section_question_option WHERE exam_section_question_id=%s' % section_question_id)
    return select()


def parent_exam(exam_id):
    cursor.execute('SELECT * FROM exam WHERE id=%s' % exam_id)
    return select(unique=True)


def create_reservation(user_id, room_id):
    data = {
        'id': next_id('reservation'),
        'start_at': datetime.now(),
        'end_at': datetime.now() + timedelta(minutes=45),
        'machine_id': machine_id(room_id),
        'user_id': user_id,
    }
    cursor.execute(insert_stmt(data, 'reservation'))
    return data


def create_enrolment(user_id, exam_id, room_id):
    reservation = create_reservation(user_id, room_id)
    data = {
        'id': next_id('exam_enrolment'),
        'user_id': user_id,
        'exam_id': exam_id,
        'reservation_id': reservation['id'],
        'enrolled_on': datetime.now()
    }
    cursor.execute(insert_stmt(data, 'exam_enrolment'))
    return data


def create_section(user_id, exam_id, parent):
    skipped = ['id', 'created', 'creator_id', 'modified', 'modifier_id', 'exam_id', 'object_version']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('exam_section'),
        'exam_id': exam_id,
        'created': datetime.now(),
        'creator_id': user_id,
        'modified': datetime.now(),
        'modifier_id': user_id
    })
    cursor.execute(insert_stmt(data, 'exam_section'))
    return data


def create_question(user_id, parent):
    skipped = ['id', 'created', 'creator_id', 'modified', 'modifier_id', 'parent_id', 'object_version']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('question'),
        'created': datetime.now(),
        'creator_id': user_id,
        'modified': datetime.now(),
        'modifier_id': user_id,
        'parent_id': parent['id'],
    })
    cursor.execute(insert_stmt(data, 'question'))
    return data


def create_question_option(question_id, parent):
    skipped = ['id', 'question_id', 'object_version']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('multiple_choice_option'),
        'question_id': question_id
    })
    cursor.execute(insert_stmt(data, 'multiple_choice_option'))
    return data


def option_map(question_id, options):
    return dict((o['id'], create_question_option(question_id, o)) for o in options)


def create_section_question_option(section_question_id, option_id, parent):
    skipped = ['id', 'exam_section_question_id', 'option_id', 'object_version']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('exam_section_question_option'),
        'exam_section_question_id': section_question_id,
        'option_id': option_id
    })
    cursor.execute(insert_stmt(data, 'exam_section_question_option'))
    return data


def find_parent_option(option_id, opts):
    return next(psq for psq in opts if psq['option_id'] == option_id)


def create_section_question(user_id, parent, section_id):
    pq = parent_question(parent['question_id'])
    pos = parent_options(parent['question_id'])
    psqos = parent_section_question_options(parent['id'])
    student_question = create_question(user_id, pq)

    skipped = ['id', 'exam_section_id', 'question_id', 'created', 'creator_id', 'modified', 'modifier_id',
               'object_version']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('exam_section_question'),
        'exam_section_id': section_id,
        'question_id': student_question['id'],
        'created': datetime.now(),
        'creator_id': user_id,
        'modified': datetime.now(),
        'modifier_id': user_id
    })
    cursor.execute(insert_stmt(data, 'exam_section_question'))

    om = option_map(student_question['id'], pos)

    options = [
        create_section_question_option(data['id'], om[k]['id'], find_parent_option(k, psqos)) for k in om
    ]

    student_question.update({'options': om.values()})
    data.update({
        'options': options,
        'question': student_question
    })
    return data


def create_student_exam(user_id, parent):
    skipped = ['id', 'hash', 'created', 'creator_id', 'modified', 'modifier_id', 'parent_id', 'object_version', 'state']
    data = {k: parent[k] for k in parent if k not in skipped}
    data.update({
        'id': next_id('exam'),
        'hash': md5_hash(30),
        'created': datetime.now(),
        'creator_id': user_id,
        'modified': datetime.now(),
        'modifier_id': user_id,
        'state': 4,  # STUDENT_STARTED
        'parent_id': parent['id']
    })
    cursor.execute(insert_stmt(data, 'exam'))
    cursor.execute(insert_stmt({'exam_id': data['id'], 'language_code': 'fi'}, 'exam_language', with_version=False))
    return data


def create_participation(enrolment, n):
    data = {
        'id': next_id('exam_participation'),
        'user_id': enrolment['user_id'],
        'exam_id': enrolment['exam_id'],
        'started': datetime.now() + timedelta(minutes=n),
        'reservation_id': enrolment['reservation_id']
    }
    cursor.execute(insert_stmt(data, 'exam_participation'))
    return data


def answer_multi_choice(section_question, weighted=False):
    options = section_question['options']
    if len(options) > 0:
        ids = [options[0]['id']]
        if weighted:
            ids.append(options[-1]['id'])
        cursor.execute(
            'UPDATE exam_section_question_option SET answered=true WHERE id IN(%s)' % ','.join([str(x) for x in ids])
        )


def answer_essay(section_question):
    data = {
        'id': next_id("essay_answer"),
        'answer': "----autogenerated--- Lorem ipsum dolor etc",
        'creator_id': section_question['creator_id'],
        'created': datetime.now(),
        'modifier_id': section_question['modifier_id'],
        'modified': datetime.now(),
    }
    cursor.execute(insert_stmt(data, 'essay_answer'))
    cursor.execute(
        'UPDATE exam_section_question SET essay_answer_id=%s WHERE id=%s' % (data['id'], section_question['id'])
    )


def answer_cloze_test(section_question):
    data = {
        'id': next_id('cloze_test_answer'),
        'answer': '{"foo": "bar"}',
    }
    cursor.execute(insert_stmt(data, 'cloze_test_answer'))
    cursor.execute(
        'UPDATE exam_section_question SET cloze_test_answer_id=%s WHERE id=%s' % (data['id'], section_question['id'])
    )


def answer_question(section_question):
    if section_question['question']['type'] == 1:
        answer_multi_choice(section_question)
    elif section_question['question']['type'] == 2:
        answer_essay(section_question)
    elif section_question['question']['type'] == 3:
        answer_multi_choice(section_question, weighted=True)
    else:
        answer_cloze_test(section_question)


def turn_exam(participation, exam):
    duration_minutes = 40
    duration = datetime(1970, 1, 1, 0, duration_minutes)
    ended = participation['started'] + timedelta(minutes=duration_minutes)
    deadline = ended + timedelta(days=14)
    cursor.execute(
        "UPDATE exam_participation SET duration='%s', ended='%s', deadline='%s' WHERE id=%s"
        % (duration, ended, deadline, participation['id'])
    )
    cursor.execute('UPDATE exam SET state=5 WHERE id=%s' % exam['id'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-e', '--exam-id', required=True,
                    help="exam ID")
    ap.add_argument('-u', '--user-id', required=True,
                    help='user ID')
    ap.add_argument('-r', '--room-id', required=True,
                    help='room ID')
    ap.add_argument('-n', '--amount', required=True,
                    help='number of assessments to create')
    args = vars(ap.parse_args())

    exam_id = int(args['exam_id'])
    user_id = int(args['user_id'])
    room_id = int(args['room_id'])
    n = int(args['amount'])

    pe = parent_exam(exam_id)
    pss = parent_sections(exam_id)

    for i in range(n):
        student_exam = create_student_exam(user_id, pe)
        student_section_questions = []
        for ps in pss:
            ss = create_section(user_id, student_exam['id'], ps)
            for psq in parent_section_questions(ps['id']):
                student_section_questions.append(create_section_question(user_id, psq, ss['id']))

        enrolment = create_enrolment(user_id, student_exam['id'], room_id)
        participation = create_participation(enrolment, i)
        [answer_question(sq) for sq in student_section_questions]
        turn_exam(participation, student_exam)

    conn.commit()


if __name__ == "__main__":
    main()
