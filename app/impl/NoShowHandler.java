// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import com.google.inject.ImplementedBy;
import java.util.List;
import models.enrolment.ExamEnrolment;
import models.enrolment.Reservation;

@ImplementedBy(NoShowHandlerImpl.class)
public interface NoShowHandler {
    void handleNoShows(List<ExamEnrolment> noShows, List<Reservation> reservations);
    void handleNoShowAndNotify(ExamEnrolment reservation);
}
