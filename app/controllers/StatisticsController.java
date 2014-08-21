package controllers;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Exam;
import models.ExamEnrolment;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Play;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.util.Date;
import java.util.List;

/**
 * Created by avainik on 8/15/14.
 */

/*
SIT-349

Hakulausekkeita:

* Hae kaikki akvaariovaraukset tällä aikavälillä tästä akvaariosta: palautettavat tiedot ainakin opiskelija/varausaika/tenttikone/tentti mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae tämän tentin tiedot: palautettavat tiedot ainakin tentin nimi/opettaja/luontiaika/tentin kesto/status/voimassaoloaika/opintopistee/opintojakson tunnus/opettaja/arvosana-asteikko/ohjeteksti/kysymykset/kysymysten pistemäärä/liitteet mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae kaikki tenttivastaukset tällä aikavälillä: palautettavat tiedot ainakin opiskelija/vastausaika/vastauksen status/tentti/opintojaksontunnus/opettaja mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae kaikki suoritukset tällä aikavälillä: palautettavat tiedot ainakin opiskelija/tentti/ opintojakso/suoritusaika/arviointiaika/opettaja/opintopisteet/arvosana/suoritustyyppi/suorituskieli mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae tämän opettajan tiedot tällä aikavälillä: palautettavat tiedot ainakin tentti/luontiaika/status/opintojaksotunnus/voimassaoloaika/opintopistemäärä/suoritustyyppi/tenttivastaukset/suoritukset/ mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae tämän opiskelijan tiedot tällä aikavälillä: palautettavat tiedot ainakin oletuskieli/tenttivastaukset/status/suoritukset/akvaariovaraukset/ mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

Hae kaikki tähän tenttiin ilmoittautuneet: saa palauttaa kaikki tiedot jotka saatavilla


Pari muutoslauseketta:
Muuta tämän tentin vastuuopettajaksi tämä opettaja (vaihdetaan opettaja esim. poissaolojen takia)
Muuta tämän tentin statukseksi ei julkinen (tavoitteena ottaa joku tentti pois ilmoittautumisten piiristä)
 */
public class StatisticsController extends SitnetController {

    private static final String reportsPath = Play.application().configuration().getString("sitnet.reports.path");
    private static final String playPath = Play.application().path().getAbsolutePath();
    private static final String basePath = playPath + "/" + reportsPath +"/";

    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyy");

    public static Result getExamNames() {

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("parent")
                .where()
                .eq("parent", null) // only Exam prototypes
                .findList();

        if (exams == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, name, course");
            options.setPathProperties("course", "id, code, name");

            return ok(jsonContext.toJsonString(exams, true, options)).as("application/json");
        }
    }

    private static Cell dateCell(Workbook wb, Row row, int count, Timestamp timestamp, String format) {
        CellStyle style = wb.createCellStyle();
        CreationHelper creationHelper = wb.getCreationHelper();
        style.setDataFormat(creationHelper.createDataFormat().getFormat(format));

        Cell cell = row.createCell(count);
        cell.setCellValue(new Date(timestamp.getTime()));
        cell.setCellStyle(style);
        return cell;
    }

    /**
     *     Hae tämän tentin tiedot:
     *     nimi/opettaja/luontiaika/tentin kesto/status/voimassaoloaika/
     *     opintopistee/opintojakson tunnus/opettaja/arvosana-asteikko/
     *     ohjeteksti/kysymykset/kysymysten pistemäärä/liitteet
     *
     * @param id
     * @return
     */
    public static Result getExam(Long id, String type) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("creator")
                .fetch("course")
//                .fetch("course")
                .where()
                .eq("id", id)
                .findUnique();

        if(type.equals("xlsx")) {
            File file = new File(basePath + "tentti_" + exam.getName().toLowerCase().replace(" ", "-") + ".xlsx");
            FileOutputStream fileOut = null;
            try {
                fileOut = new FileOutputStream(file);
            } catch (FileNotFoundException e) {
                e.printStackTrace();
            }

            Workbook wb = new XSSFWorkbook();
            CreationHelper creationHelper = wb.getCreationHelper();
            Sheet sheet = wb.createSheet(exam.getName());
            CellStyle style = wb.createCellStyle();

            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Omistaja id");
            headerRow.createCell(1).setCellValue("Etunimi");
            headerRow.createCell(2).setCellValue("Sukunimi");

            headerRow.createCell(3).setCellValue("Opintojakso id");
            headerRow.createCell(4).setCellValue("Nimi");
            headerRow.createCell(5).setCellValue("Opintipisteet");
            headerRow.createCell(6).setCellValue("Tyyppi");
            headerRow.createCell(7).setCellValue("Taso");

            headerRow.createCell(8).setCellValue("luotu pvm");
            headerRow.createCell(9).setCellValue("alkaa");
            headerRow.createCell(10).setCellValue("loppuu");
            headerRow.createCell(11).setCellValue("kesto");
            headerRow.createCell(12).setCellValue("Arvosteluasteikko");
            headerRow.createCell(13).setCellValue("status");
            headerRow.createCell(14).setCellValue("liitetiedosto");
            headerRow.createCell(15).setCellValue("ohjeet");
            headerRow.createCell(16).setCellValue("jaettu");

            Row dataRow = sheet.createRow(1);
            dataRow.createCell(0).setCellValue(exam.getCreator().getId());
            dataRow.createCell(1).setCellValue(exam.getCreator().getFirstName());
            dataRow.createCell(2).setCellValue(exam.getCreator().getLastName());

            dataRow.createCell(3).setCellValue(exam.getCourse().getId());
            dataRow.createCell(4).setCellValue(exam.getCourse().getName());
            dataRow.createCell(5).setCellValue(exam.getCourse().getCredits());
            dataRow.createCell(6).setCellValue(exam.getCourse().getType() == null ? "NULL" : exam.getCourse().getType().getCode());   // what is this, after integratio ?
            dataRow.createCell(7).setCellValue(exam.getCourse().getLevel());

            dateCell(wb, dataRow, 8, exam.getCreated(), "dd.MM.yyyy");
            dateCell(wb, dataRow, 9, exam.getExamActiveStartDate(), "dd.MM.yyyy");
            dateCell(wb, dataRow, 10, exam.getExamActiveEndDate(), "dd.MM.yyyy");

            dataRow.createCell(11).setCellValue(exam.getDuration() == null ? "NULL" : exam.getDuration().toString());
            dataRow.createCell(12).setCellValue(exam.getGrading());
            dataRow.createCell(13).setCellValue(exam.getState());

            if (exam.getAttachment() == null)
                dataRow.createCell(14).setCellValue("");
            else
                dataRow.createCell(14).setCellValue(exam.getAttachment().getFilePath() + exam.getAttachment().getFileName());
            dataRow.createCell(15).setCellValue(exam.getInstruction());
            dataRow.createCell(16).setCellValue(exam.isShared());

            try {
                wb.write(fileOut);
                fileOut.close();
            } catch (IOException e) {
                e.printStackTrace();
            }

            File af = new File(file.getAbsolutePath());
            response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
            return ok(af);
        }
        else if(type.equals("json")) {
            if (exam == null) {
                return notFound();
            }
                JsonContext jsonContext = Ebean.createJsonContext();
                JsonWriteOptions options = new JsonWriteOptions();
                options.setRootPathProperties("id, name, course, parent, examType, instruction, shared, examSections, examActiveStartDate, examActiveEndDate, room, " +
                        "duration, grading, ,grade, otherGrading, totalScore, examLanguage, answerLanguage, state, examFeedback, creditType, expanded, attachment");
                options.setPathProperties("parent", "id");
                options.setPathProperties("course", "id, organisation, code, name, level, type, credits");
                options.setPathProperties("room", "id, name");
                options.setPathProperties("attachment", "id, fileName");
                options.setPathProperties("course.organisation", "id, code, name, nameAbbreviation, courseUnitInfoUrl, recordsWhitelistIp, vatIdNumber");
                options.setPathProperties("examType", "id, type");
                options.setPathProperties("examSections", "id, name, questions, exam, totalScore, expanded, lotteryOn, lotteryItemCount");
                options.setPathProperties("examSections.questions", "id, type, question, shared, instruction, maxScore, evaluationType, evaluatedScore, evaluationCriterias, options, answer");
                options.setPathProperties("examSections.questions.answer", "type, option, answer");
                options.setPathProperties("examSections.questions.answer.option", "id, option, correctOption, score");
                options.setPathProperties("examSections.questions.options", "id, option" );
                options.setPathProperties("examSections.questions.comments", "id, comment");
                options.setPathProperties("examFeedback", "id, comment");

                return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
        }
        else
            return ok("invalid type: "+ type);
    }


    // Hae kaikki akvaariovaraukset tällä aikavälillä tästä akvaariosta:
    // palautettavat tiedot ainakin opiskelija/varausaika/tenttikone/tentti
    // mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa
    //    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getReservationsForRoomByDate(Long roomId, String from, String to) {

        final DateTime start = DateTime.parse(from, dateFormat);
        final DateTime end = DateTime.parse(to, dateFormat);

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .gt("reservation.endAt", start)
                .lt("reservation.startAt", end)
                .eq("reservation.machine.room.id", roomId)
                .findList();

        // Excel examples see:
        // http://stackoverflow.com/questions/17470597/generate-export-excel-file-from-java-play-framework-2-0-listobject
        // https://svn.apache.org/repos/asf/poi/trunk/src/examples/src/org/apache/poi/xssf/usermodel/examples/CreateCell.java

        File file = new File(basePath+"tilavaraukset_"+from.replace(".", "-") +"_"+to.replace(".", "-") +".xlsx");
        FileOutputStream fileOut = null;
        try {
            fileOut = new FileOutputStream(file);
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }

        Workbook wb = new XSSFWorkbook();
        CreationHelper creationHelper = wb.getCreationHelper();
        Sheet sheet = wb.createSheet("tilavaraukset");

        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("Ilmoittautuminen id");
        headerRow.createCell(1).setCellValue("Ilmoittautunut");

        headerRow.createCell(2).setCellValue("Käyttäjä id");
        headerRow.createCell(3).setCellValue("Etunimi");
        headerRow.createCell(4).setCellValue("Sukunimi");

        headerRow.createCell(5).setCellValue("Tentti id");
        headerRow.createCell(6).setCellValue("Nimi");

        headerRow.createCell(7).setCellValue("Varaus id");
        headerRow.createCell(8).setCellValue("Alkuaika");
        headerRow.createCell(9).setCellValue("loppuaika");

        headerRow.createCell(10).setCellValue("Tenttikone id");
        headerRow.createCell(11).setCellValue("Nimi");
        headerRow.createCell(12).setCellValue("IP-osoite");

        headerRow.createCell(13).setCellValue("Tenttitila id");
        headerRow.createCell(14).setCellValue("Nimi");
        headerRow.createCell(15).setCellValue("Tunnus");

        for(ExamEnrolment e: enrolments) {
            Row dataRow = sheet.createRow(enrolments.indexOf(e)+1);
            dataRow.createCell(0).setCellValue(e.getId());
            //date
            CellStyle style = wb.createCellStyle();
            style.setDataFormat(creationHelper.createDataFormat().getFormat("dd.MM.yyyy"));
            Cell cell = dataRow.createCell(1);
            cell.setCellValue(new Date(e.getEnrolledOn().getTime()));
            cell.setCellStyle(style);

            dataRow.createCell(2).setCellValue(e.getUser().getId());
            dataRow.createCell(3).setCellValue(e.getUser().getFirstName());
            dataRow.createCell(4).setCellValue(e.getUser().getLastName());

            dataRow.createCell(5).setCellValue(e.getExam().getId());
            dataRow.createCell(6).setCellValue(e.getExam().getName());

            dataRow.createCell(7).setCellValue(e.getReservation().getId());

            cell = dataRow.createCell(8);
            cell.setCellValue(new Date(e.getReservation().getStartAt().getTime()));
            cell.setCellStyle(style);

            cell = dataRow.createCell(9);
            cell.setCellValue(new Date(e.getReservation().getStartAt().getTime()));
            cell.setCellStyle(style);

            dataRow.createCell(10).setCellValue(e.getReservation().getMachine().getId());
            dataRow.createCell(11).setCellValue(e.getReservation().getMachine().getName());
            dataRow.createCell(12).setCellValue(e.getReservation().getMachine().getIpAddress());

            dataRow.createCell(13).setCellValue(e.getReservation().getMachine().getRoom().getId());
            dataRow.createCell(14).setCellValue(e.getReservation().getMachine().getRoom().getName());
            dataRow.createCell(15).setCellValue(e.getReservation().getMachine().getRoom().getRoomCode());
        }

        try {
            wb.write(fileOut);
            fileOut.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        File af = new File(file.getAbsolutePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
        return ok(af);

//        Do not remove this! Really handy for debugging
//
//        if (enrolments == null) {
//            return notFound();
//        } else {
//            JsonContext jsonContext = Ebean.createJsonContext();
//            JsonWriteOptions options = new JsonWriteOptions();
//            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
//            options.setPathProperties("user", "id, firstName, lastName");
//            options.setPathProperties("exam", "id, name");
//            options.setPathProperties("reservation", "id, startAt, endAt, machine");
//            options.setPathProperties("reservation.machine", "id, name, ipAddress, room");
//            options.setPathProperties("reservation.machine.room", "id, name, roomCode");
//
//            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
//        }
    }

    public static void createReportDirectory() {
        String reportsPath = Play.application().configuration().getString("sitnet.reports.path");
        String playPath = Play.application().path().getAbsolutePath();
        String basePath = playPath + "/" + reportsPath +"/";

        File dir = new File(basePath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }
}
