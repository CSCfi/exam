/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import controllers.RoomLike;
import io.ebean.Finder;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.ManyToMany;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Transient;
import models.base.GeneratedIdentityModel;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import util.datetime.DateTimeUtils;

@Entity
public class ExamRoom extends GeneratedIdentityModel implements RoomLike {

    public enum State {
        ACTIVE,
        INACTIVE,
    }

    private String name;

    private String roomCode;

    private String buildingName;

    private String campus;

    private String externalRef;

    @OneToOne(cascade = CascadeType.ALL)
    private MailAddress mailAddress;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room", fetch = FetchType.EAGER)
    private List<DefaultWorkingHours> defaultWorkingHours;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExceptionWorkingHours> calendarExceptionEvents;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    private List<ExamStartingHour> examStartingHours;

    // Accessibility info describes what accessibility issues there are regarding the room
    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "examRoom")
    @JsonManagedReference
    private List<Accessibility> accessibilities;

    // Checkbox indicating is there any accessibility issues concerning the room
    @Column(columnDefinition = "boolean default false")
    private boolean accessible;

    @Column(columnDefinition = "TEXT")
    private String roomInstruction;

    @Column(columnDefinition = "TEXT")
    private String roomInstructionEN;

    @Column(columnDefinition = "TEXT")
    private String roomInstructionSV;

    private String contactPerson;

    private String videoRecordingsURL;

    private String statusComment;

    @Column(columnDefinition = "boolean default false")
    private boolean outOfService;

    private String state;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExamMachine> examMachines;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    private String localTimezone;

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public MailAddress getMailAddress() {
        return mailAddress;
    }

    public void setMailAddress(MailAddress mailAddress) {
        this.mailAddress = mailAddress;
    }

    public List<DefaultWorkingHours> getDefaultWorkingHours() {
        return defaultWorkingHours;
    }

    public void setDefaultWorkingHours(List<DefaultWorkingHours> defaultWorkingHours) {
        this.defaultWorkingHours = defaultWorkingHours;
    }

    public List<ExceptionWorkingHours> getCalendarExceptionEvents() {
        return calendarExceptionEvents;
    }

    public void setCalendarExceptionEvents(List<ExceptionWorkingHours> calendarExceptionEvents) {
        this.calendarExceptionEvents = calendarExceptionEvents;
    }

    public List<ExamStartingHour> getExamStartingHours() {
        return examStartingHours;
    }

    public void setExamStartingHours(List<ExamStartingHour> examStartingHours) {
        this.examStartingHours = examStartingHours;
    }

    public List<Accessibility> getAccessibilities() {
        return accessibilities;
    }

    public void setAccessibilities(List<Accessibility> accessibilities) {
        this.accessibilities = accessibilities;
    }

    @Override
    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
    }

    @Override
    public String getRoomInstructionEN() {
        return roomInstructionEN;
    }

    public void setRoomInstructionEN(String roomInstructionEN) {
        this.roomInstructionEN = roomInstructionEN;
    }

    @Override
    public String getRoomInstructionSV() {
        return roomInstructionSV;
    }

    public void setRoomInstructionSV(String roomInstructionSV) {
        this.roomInstructionSV = roomInstructionSV;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<ExamMachine> getExamMachines() {
        return examMachines;
    }

    public void setExamMachines(List<ExamMachine> examMachines) {
        this.examMachines = examMachines;
    }

    public boolean getOutOfService() {
        return outOfService;
    }

    public void setOutOfService(boolean outOfService) {
        this.outOfService = outOfService;
    }

    public String getStatusComment() {
        return statusComment;
    }

    public void setStatusComment(String statusComment) {
        this.statusComment = statusComment;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public boolean getAccessible() {
        return accessible;
    }

    public void setAccessible(boolean accessible) {
        this.accessible = accessible;
    }

    public String getVideoRecordingsURL() {
        return videoRecordingsURL;
    }

    public void setVideoRecordingsURL(String videoRecordingsURL) {
        this.videoRecordingsURL = videoRecordingsURL;
    }

    public String getLocalTimezone() {
        return localTimezone;
    }

    public void setLocalTimezone(String localTimezone) {
        this.localTimezone = localTimezone;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExamRoom)) return false;
        ExamRoom examRoom = (ExamRoom) o;
        return new EqualsBuilder().append(id, examRoom.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

    @Transient
    public int getTimezoneOffset(LocalDate date) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        for (DefaultWorkingHours defaultHour : defaultWorkingHours) {
            if (defaultHour.getWeekday().equalsIgnoreCase(day)) {
                return defaultHour.getTimezoneOffset();
            }
        }
        return 0;
    }

    @Transient
    private List<OpeningHours> getDefaultWorkingHours(LocalDate date) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        List<OpeningHours> hours = new ArrayList<>();
        defaultWorkingHours
            .stream()
            .filter(dwh -> dwh.getWeekday().equalsIgnoreCase(day))
            .forEach(dwh -> {
                DateTime midnight = date.toDateTimeAtStartOfDay();
                DateTime start = midnight.withMillisOfDay(
                    DateTimeUtils.resolveStartWorkingHourMillis(
                        new DateTime(dwh.getStartTime()),
                        dwh.getTimezoneOffset()
                    )
                );
                DateTime end = midnight.withMillisOfDay(
                    DateTimeUtils.resolveEndWorkingHourMillis(new DateTime(dwh.getEndTime()), dwh.getTimezoneOffset())
                );
                Interval interval = new Interval(start, end);
                hours.add(new OpeningHours(interval, dwh.getTimezoneOffset()));
            });
        return hours;
    }

    @Transient
    public List<OpeningHours> getWorkingHoursForDate(LocalDate date) {
        List<OpeningHours> workingHours = getDefaultWorkingHours(date);
        List<Interval> extensionEvents = DateTimeUtils.mergeSlots(
            DateTimeUtils.getExceptionEvents(
                calendarExceptionEvents,
                date,
                DateTimeUtils.RestrictionType.NON_RESTRICTIVE
            )
        );
        List<Interval> restrictionEvents = DateTimeUtils.mergeSlots(
            DateTimeUtils.getExceptionEvents(calendarExceptionEvents, date, DateTimeUtils.RestrictionType.RESTRICTIVE)
        );
        List<OpeningHours> availableHours = new ArrayList<>();
        if (!extensionEvents.isEmpty()) {
            List<Interval> unifiedIntervals = DateTimeUtils.mergeSlots(
                Stream
                    .concat(workingHours.stream().map(OpeningHours::getHours), extensionEvents.stream())
                    .collect(Collectors.toList())
            );
            int tzOffset;
            if (workingHours.isEmpty()) {
                tzOffset = DateTimeZone.forID(localTimezone).getOffset(new DateTime(date));
            } else {
                tzOffset = workingHours.get(0).timezoneOffset;
            }
            workingHours.clear();
            workingHours.addAll(
                unifiedIntervals
                    .stream()
                    .map(interval -> new OpeningHours(interval, tzOffset))
                    .collect(Collectors.toList())
            );
        }
        if (!restrictionEvents.isEmpty()) {
            for (OpeningHours hours : workingHours) {
                Interval slot = hours.getHours();
                for (Interval gap : DateTimeUtils.findGaps(restrictionEvents, slot)) {
                    availableHours.add(new OpeningHours(gap, hours.getTimezoneOffset()));
                }
            }
        } else {
            availableHours = workingHours;
        }
        return availableHours;
    }

    public final class OpeningHours {

        private final Interval hours;
        private final int timezoneOffset;

        OpeningHours(Interval interval, int timezoneOffset) {
            this.hours = interval;
            this.timezoneOffset = timezoneOffset;
        }

        public int getTimezoneOffset() {
            return timezoneOffset;
        }

        public Interval getHours() {
            return hours;
        }
    }

    public static final Finder<Long, ExamRoom> find = new Finder<>(ExamRoom.class);
}
