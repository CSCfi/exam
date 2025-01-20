#!/usr/bin/python

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

from datetime import datetime
from psycopg import connect  # pip install "psycopg[binary]"

conn_string = "host='localhost' dbname='exam' user='exam' password='exam'"
conn = connect(conn_string)
cursor = conn.cursor()


def select():
    names = [desc[0] for desc in cursor.description]
    result = map(dict, [[(names[i], row[i]) for (i, name) in enumerate(names)] for row in cursor])
    return list(result)


def delete(ids):
    ids = ','.join([str(id) for id in ids])
    cursor.execute('UPDATE exam_enrolment SET reservation_id = NULL where reservation_id IN (%s)' % ids)
    cursor.execute('UPDATE exam_participation SET reservation_id = NULL where reservation_id IN (%s)' % ids)
    cursor.execute('DELETE FROM reservation WHERE id IN (%s)' % ids)


def reservations():
    cursor.execute("""
        SELECT r.*, ep.id AS ep_id FROM reservation AS r 
        LEFT JOIN exam_participation AS ep ON ep.reservation_id = r.id WHERE r.machine_id IS NOT NULL
        """)
    return select()


def find_overlapping(rs):
    overlapping_pairs = []
    rs.sort(key=lambda x: (x["machine_id"], x["start_at"]))
    for i, res1 in enumerate(rs):
        for j in range(i + 1, len(rs)):
            res2 = rs[j]
            # Stop checking if machine_id changes or start time exceeds res1's end time
            if res1["machine_id"] != res2["machine_id"] or res2["start_at"] > res1["end_at"]:
                break
            # Check for overlap
            if res1["end_at"] > res2["start_at"]:
                overlapping_pairs.append((res1, res2))
    return overlapping_pairs


def main():
    rs, removed, unresolved = reservations(), set(), set()
    print("Following overlapping reservation pairs found:")
    for r1, r2 in find_overlapping(rs):
        print(
            "r1_id: {id1} r2_id:{id2} r1_machine_id: {mid1} r2_machine_id: {mid2} r1_period: {s1} - {e1} r2_period {s2} - {e2}".format(
                id1=r1['id'], id2=r2['id'], mid1=r1['machine_id'], mid2=r2['machine_id'], s1=r1['start_at'],
                e1=r1['end_at'], s2=r2['start_at'], e2=r2['end_at']
            ))
        if r1['ep_id'] and not r2['ep_id']:
            print('Reservation #%s will be removed' % r2['id'])
            removed.add(r2['id'])
        elif r2['ep_id'] and not r1['ep_id']:
            print('Reservation #%s will be removed' % r1['id'])
            removed.add(r1['id'])
        elif not r1['ep_id'] and not r2['ep_id']:
            print('Reservation #%s will be removed' % r1['id'])
            print('Reservation #%s will be removed' % r2['id'])
            removed.update([r1['id'], r2['id']])
        else:
            print('Will not automatically remove reservations #%s and #%s as both are linked to some participation'
                  % (r1['id'], r2['id']))
            unresolved.update([r1['id'], r2['id']])
    print('Conclusion')
    print('The following reservations will be removed: \n%s' % removed)
    print('The following reservations must be removed by hand: \n%s' % unresolved)
    if len(removed) > 0:
        delete(removed)
    conn.commit()


if __name__ == "__main__":
    main()
