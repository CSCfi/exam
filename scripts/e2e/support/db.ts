// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
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
