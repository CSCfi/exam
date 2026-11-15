// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { execFileSync } from 'node:child_process';

// Runs SQL in the stack's database through the container (as run.sh seeds it), never through a
// host port, so a local development database cannot be touched. Returns the unaligned output.
export function sql(statement: string): string {
    return execFileSync(
        'docker',
        ['exec', 'exam-postgres', 'psql', '-U', 'exam', '-d', 'exam', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    ).trim();
}

// Every browser request comes from E2E-PC-01's IP; moving that machine elsewhere makes the browser
// a computer that is not an exam machine
export async function onNonExamComputer(run: () => Promise<void>): Promise<void> {
    const machineIp = sql(`SELECT ip_address FROM exam_machine WHERE id = 990001`);
    sql(`UPDATE exam_machine SET ip_address = '192.0.2.1' WHERE id = 990001`);
    try {
        await run();
    } finally {
        sql(`UPDATE exam_machine SET ip_address = '${machineIp}' WHERE id = 990001`);
    }
}
