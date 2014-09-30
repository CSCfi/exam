package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Expr;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.User;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.springframework.util.CollectionUtils;
import play.Play;
import play.mvc.Result;
import util.java.StatisticsUtils;

import java.io.*;
import java.util.*;

import static util.java.StatisticsUtils.*;

/**
 * Created by avainik on 8/15/14.
 */

/*
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

    @Restrict({@Group("ADMIN")})
    public static Result getStudents() {

        List<User> students = Ebean.find(User.class)
                .where()
                .eq("roles.name", "STUDENT")
                .findList();

        if (students == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, firstName, lastName");

            return ok(jsonContext.toJsonString(students, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
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

    /**
     *     Hae tämän tentin tiedot:
     *     nimi/opettaja/luontiaika/tentin kesto/status/voimassaoloaika/
     *     opintopistee/opintojakson tunnus/opettaja/arvosana-asteikko/
     *     ohjeteksti/kysymykset/kysymysten pistemäärä/liitteet
     *
     * @param id
     * @return
     */
    @Restrict({@Group("ADMIN")})
    public static Result getExam(Long id, String reportType) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("creator")
                .fetch("course")
                .where()
                .eq("id", id)
                .findUnique();

        if(reportType.equals("xlsx")) {

            File file = new File(basePath + "tentti_" + exam.getName().toLowerCase().replace(" ", "-") + ".xlsx");

            Workbook wb = new XSSFWorkbook();
            Sheet sheet = wb.createSheet(exam.getName());

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
            if(exam.getCreator() != null) {
                dataRow.createCell(0).setCellValue(exam.getCreator().getId() != null ? exam.getCreator().getId().toString() : "");
                dataRow.createCell(1).setCellValue(exam.getCreator().getFirstName() != null ? exam.getCreator().getFirstName() : "");
                dataRow.createCell(2).setCellValue(exam.getCreator().getLastName() != null ? exam.getCreator().getLastName() : "");
            } else {
                dataRow.createCell(0).setCellValue("");
                dataRow.createCell(1).setCellValue("");
                dataRow.createCell(2).setCellValue("");
            }
            if(exam.getCourse() != null) {
                dataRow.createCell(3).setCellValue(exam.getCourse().getId() == null ? "" : exam.getCourse().getId().toString());
                dataRow.createCell(4).setCellValue(exam.getCourse().getName() == null ? "" : exam.getCourse().getName());
                dataRow.createCell(5).setCellValue(exam.getCourse().getCredits() == null ? "" : Integer.toString(exam.getCourse().getCredits().intValue()));
                dataRow.createCell(6).setCellValue(exam.getCourse().getType() == null ? "NULL" : exam.getCourse().getType().getCode());   // what is this, after integratio ?
                dataRow.createCell(7).setCellValue(exam.getCourse().getLevel() == null ? "" : exam.getCourse().getLevel());
            } else {
                dataRow.createCell(3).setCellValue("");
                dataRow.createCell(4).setCellValue("");
                dataRow.createCell(5).setCellValue("");
                dataRow.createCell(6).setCellValue("");   // what is this, after integratio ?
                dataRow.createCell(7).setCellValue("");
            }
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

            response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

            return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));

        } else if(reportType.equals("json")) {
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

            File file = new File(basePath + "tentti_" + exam.getName().toLowerCase().replace(" ", "-") + ".json");
            ByteArrayOutputStream bos = new ByteArrayOutputStream();

            try {
                FileWriter writer = new FileWriter(file);
                String content = jsonContext.toJsonString(exam, true, options);
                writer.write(content);
                InputStream fis = new FileInputStream(file);

                byte[] buf = new byte[1024];

                for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                    bos.write(buf, 0, readNum);
                }

                fis.close();
            } catch (IOException ex) {
                ex.printStackTrace();
            }

            response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
            return ok(com.ning.http.util.Base64.encode(bos.toByteArray()));
            //return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
        }
        else
            return ok("invalid type: "+ reportType);
    }

    /**
     * Hae kaikki opettajna luomat tentit aikavälillä
     * @param from alkupäivä
     * @param to loppupäivä
     * @return excel
     */
    @Restrict({@Group("ADMIN")})
    public static Result getTeacherExamsByDate(Long uid, String from, String to) {

        final DateTime start = DateTime.parse(from, dateFormat);
        final DateTime end = DateTime.parse(to, dateFormat);

        String s = from.toString().replace(".", "-");
        String t = to.toString().replace(".", "-");
        String name = "luodut_tentit_" + s + "_" + t;

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("creator")
                .fetch("parent")
                .fetch("examType")
                .fetch("course")
                .where()
                .between("created", start, end)
                .isNull("parent")
                .eq("creator.id", uid)
                .orderBy("created")
                .findList();

        List<Exam> childs = Ebean.find(Exam.class)
                .fetch("creator")
                .fetch("parent")
                .fetch("parent.examType")
                .fetch("course")
                .where()
                .between("parent.created", start, end)
                .isNotNull("parent")
                .eq("parent.creator.id", uid)
                .orderBy("created")
                .findList();

        exams.addAll(childs);

        File file = new File(basePath + name + ".xlsx");

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet(name);

        final int COLUMNS = 10;

        String[] headers = {
                "tentti",           // 0
                "luontiaika",       // 1
                "status",           // 2
                "opintojaksotunnus",// 3
                "voimassaoloaika",  // 4
                "opintopistemäärä", // 5
                "suoritustyyppi",   // 6
                "tenttivastaukset", // 7
                "suoritukset",       // 8
                "kirjatut suoritukset"// 9
        };

        StatisticsUtils.addHeader(sheet, headers, 0, COLUMNS);

        if(!CollectionUtils.isEmpty(exams)) {

            CreationHelper creationHelper = wb.getCreationHelper();
            CellStyle style = wb.createCellStyle();
            style.setDataFormat(creationHelper.createDataFormat().getFormat("dd.MM.yyyy"));

            Map<Long,Integer> review = new HashMap<>();
            Map<Long,Integer> graded = new HashMap<>();
            Map<Long,Integer> graded_logged = new HashMap<>();

            // counting and removing childs ->
            Iterator iterator = exams.iterator();
            while(iterator.hasNext()) {
                Exam e = (Exam) iterator.next();
                if(e.getParent() != null) {

                    switch(e.getState()) {
                        case "REVIEW":
                            incrementResult(e.getParent().getId(), review);
                            break;
                        case "GRADED":
                            incrementResult(e.getParent().getId(), graded);
                            break;
                        case "GRADED_LOGGED":
                            incrementResult(e.getParent().getId(), graded_logged);
                            break;
                    }

                    // removes the child after counting
                    iterator.remove();
                }
            }

            if(!CollectionUtils.isEmpty(exams)) {
                for (Exam e : exams) {

                    Row dataRow = sheet.createRow(exams.indexOf(e)+1);

                    for(int i = 0; i < COLUMNS; i++) {

                        sheet.autoSizeColumn(i,true);

                        String type = "",
                               code = "",
                               state = "",
                               examname = "",
                               credits = "";

                        // null checking to prevent excel from failing ->
                        type = e.getExamType() != null && e.getExamType().getType() != null ? e.getExamType().getType() : "";
                        code = e.getCourse() != null && e.getCourse().getCode() != null ? e.getCourse().getCode() : "";
                        state = e.getState() != null ? e.getState() : "";
                        examname = e.getName() != null ? e.getName() : "";
                        credits = e.getCourse() != null && e.getCourse().getCredits() != null ? Integer.toString(e.getCourse().getCredits().intValue()) : "";

                        switch(i) {
                            case 0: addCell(dataRow, i, examname); break;
                            case 1: addDateCell(style, dataRow, i, e.getCreated()); break;
                            case 2: addCell(dataRow, i, state); break;
                            case 3: addCell(dataRow, i, code); break;
                            case 4: addDateBetweenCell(dataRow, i, e.getExamActiveStartDate(), e.getExamActiveEndDate()); break;
                            case 5: addCell(dataRow, i, credits); break;
                            case 6: addCell(dataRow, i, type); break;
                            case 7: addCell(dataRow, i, getMapResult(e.getId(), review) + ""); break;
                            case 8: addCell(dataRow, i, getMapResult(e.getId(), graded) + ""); break;
                            case 9: addCell(dataRow, i, getMapResult(e.getId(), graded_logged) + ""); break;
                        }
                    }
                }
            }

        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));
    }

    /**
     * Opiskelijan nimi,
     * opiskelijanumero,
     * hakatunnus,
     * varausslotti:pvm
     * ja klon aika,
     * suoritusaika
     * (vastauksen tallettumisen pvm ja klo).

     Kysymys: löytyykö tietoa varauksen peruuttamisesta,
     eli jos joku on varannut tietylle tentille paikan mutta peruuttanut sen?
     Jos löytyy niin siitäkin olisi kiva saada varauksen statustieto: peruutettu.

     Tällä olisi tarpeen saada kiinni myös sellaiset jotka ovat varanneet tenttiin paikan mutta eivät ole peruneet sitä eivätkä tule tenttiin lainkaan.
     * @param id
     * @return
     */
    @Restrict({@Group("ADMIN")})
    public static Result getExamEnrollments(Long id) {

        String name = "tentti_ilmoittautumiset";

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("exam.course")
                .where()
                .eq("exam.id", id)
                .orderBy("user.id")
                .findList();

        File file = new File(basePath + name + ".xlsx");

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet(name);

        final int COLUMNS = 5;

        String[] headers = {
                "opiskelijan nimi",     // 0
                "opiskelijan numero",   // 1
                "hakatunnus",           // 2
                "varaus",               // 3
                "suoritusaika"         // 4
        };

        addHeader(sheet, headers, 0, COLUMNS);

        if(!CollectionUtils.isEmpty(enrolments)) {

            CreationHelper creationHelper = wb.getCreationHelper();
            CellStyle style = wb.createCellStyle();
            style.setDataFormat(creationHelper.createDataFormat().getFormat("dd.MM.yyyy"));

            for (ExamEnrolment e : enrolments) {

                Row dataRow = sheet.createRow(enrolments.indexOf(e)+1);

                for(int i = 0; i < COLUMNS; i++) {

                    sheet.autoSizeColumn(i,true);

                    if(e.getUser() != null) {
                        switch(i) {
                            case 0: addCell(dataRow, i, e.getUser().getFirstName() + " " + e.getUser().getLastName()); break;
                            case 1: addCell(dataRow, i, e.getUser().getIdentifier() == null ? "" : e.getUser().getIdentifier()); break;
                            case 2: addCell(dataRow, i, e.getUser().getEppn() == null ? "" : e.getUser().getEppn()); break;
                            case 3:
                                if(e.getReservation() == null || e.getReservation().getStartAt() == null) {
                                    addCell(dataRow, i, "");
                                } else {
                                    addDateCell(style, dataRow, i, e.getReservation().getStartAt());
                                }
                                break;
                            case 4:
                                if(e.getEnrolledOn() == null) {
                                    addCell(dataRow, i, "");
                                } else {
                                    addDateCell(style, dataRow, i, e.getEnrolledOn());
                                }
                                break;
                        }
                    } else {
                        switch(i) {
                            case 0: case 1: case 2: addCell(dataRow, i, ""); break;

                            case 3:
                                if(e.getReservation() == null || e.getReservation().getStartAt() == null) {
                                    addCell(dataRow, i, "");
                                } else {
                                    addDateCell(style, dataRow, i, e.getReservation().getStartAt());
                                }
                                break;
                            case 4:
                                if(e.getEnrolledOn() == null) {
                                    addCell(dataRow, i, "");
                                } else {
                                    addDateCell(style, dataRow, i, e.getEnrolledOn());
                                }
                                break;
                        }
                    }
                }
            }
        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));
    }

    /**
     * Hae kaikki suoritukset aikavälillä
     * @param from alkupäivä
     * @param to loppupäivä
     * @return excel
     */
    @Restrict({@Group("ADMIN")})
    public static Result getReviewsByDate(String from, String to) {

        final DateTime start = DateTime.parse(from, dateFormat);
        final DateTime end = DateTime.parse(to, dateFormat);

        String s = from.toString().replace(".", "-");
        String t = to.toString().replace(".", "-");
        String name = "suoritukset_" + s + "_" + t;

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("exam.course")
                .where()
                .and(
                        Expr.between("exam.gradedTime", start, end),
                        Expr.or(
                                Expr.eq("exam.state", "GRADED"),
                                Expr.eq("exam.state", "GRADED_LOGGED")
                        )
                )
                .orderBy("user.id")
                .findList();

        File file = new File(basePath + name + ".xlsx");

        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet(name);

        final int COLUMNS = 10;

        String[] headers = {
                "opiskelija",       // 0
                "tentti",           // 1
                "opintojakso",      // 2
                "suoritusaika",     // 3
                "arviointiaika",    // 4
                "opettaja",         // 5
                "opintopisteet",    // 6
                "arvosana",         // 7
                "suoritustyyppi",   // 8
                "suorituskieli"     // 9
        };

        addHeader(sheet, headers, 0, COLUMNS);

        if(!CollectionUtils.isEmpty(enrolments)) {

            CreationHelper creationHelper = wb.getCreationHelper();
            CellStyle style = wb.createCellStyle();
            style.setDataFormat(creationHelper.createDataFormat().getFormat("dd.MM.yyyy"));

            for (ExamEnrolment e : enrolments) {

                Row dataRow = sheet.createRow(enrolments.indexOf(e)+1);

                for(int i = 0; i < COLUMNS; i++) {

                    sheet.autoSizeColumn(i,true);

                    String code = "",
                           courseName = "",
                           credits = "";

                    code = e.getExam().getCourse() == null || e.getExam().getCourse().getCode() == null ? "" : e.getExam().getCourse().getCode();
                    courseName = e.getExam().getCourse() == null || e.getExam().getCourse().getName() == null ? "" : e.getExam().getCourse().getName();
                    credits = e.getExam().getCourse() == null || e.getExam().getCourse().getCredits() == null ? "" : Integer.toString(e.getExam().getCourse().getCredits().intValue());

                    switch(i) {
                        case 0: addCell(dataRow, i, e.getUser().getFirstName() + " " + e.getUser().getLastName()); break;
                        case 1: addCell(dataRow, i, e.getExam().getName() == null ? "" : e.getExam().getName()); break;
                        case 2: addCell(dataRow, i, code + " - " + courseName); break;
                        case 3:
                            if(e.getEnrolledOn() == null) {
                                addCell(dataRow, i, "");
                            } else {
                                addDateCell(style, dataRow, i, e.getEnrolledOn());
                            }
                            break;
                        case 4:
                            if(e.getExam().getGradedTime() == null) {
                                addCell(dataRow, i, "");
                            } else {
                                addDateCell(style, dataRow, i, e.getExam().getGradedTime());
                            }
                            break;
                        case 5:
                            if(e.getExam().getGradedByUser() != null)
                                addCell(dataRow, i, e.getExam().getGradedByUser().getFirstName() + " " + e.getExam().getGradedByUser().getLastName());
                            else
                                addCell(dataRow, i, "");
                            break;
                        case 6: addCell(dataRow, i, credits); break;
                        case 7: addCell(dataRow, i, e.getExam().getGrade() != null ? e.getExam().getGrade() : ""); break;
                        case 8: addCell(dataRow, i, e.getExam().getCreditType() != null ? e.getExam().getCreditType() : ""); break;
                        case 9: addCell(dataRow, i, e.getExam().getExamLanguage() != null ? e.getExam().getExamLanguage() : ""); break;
                    }
                }
            }
        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));
    }

    // Hae kaikki akvaariovaraukset tällä aikavälillä tästä akvaariosta:
    // palautettavat tiedot ainakin opiskelija/varausaika/tenttikone/tentti
    // mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa
    @Restrict({@Group("ADMIN")})
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

            if(e.getReservation() == null) {
                dataRow.createCell(10).setCellValue("");
                dataRow.createCell(11).setCellValue("");
                dataRow.createCell(12).setCellValue("");

                dataRow.createCell(13).setCellValue("");
                dataRow.createCell(14).setCellValue("");
                dataRow.createCell(15).setCellValue("");
            } else {
                dataRow.createCell(10).setCellValue(e.getReservation().getMachine().getId());
                dataRow.createCell(11).setCellValue(e.getReservation().getMachine().getName());
                dataRow.createCell(12).setCellValue(e.getReservation().getMachine().getIpAddress());

                dataRow.createCell(13).setCellValue(e.getReservation().getMachine().getRoom().getId());
                dataRow.createCell(14).setCellValue(e.getReservation().getMachine().getRoom().getName());
                dataRow.createCell(15).setCellValue(e.getReservation().getMachine().getRoom().getRoomCode());
            }
        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));

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

// Hae kaikki tenttivastaukset tällä aikavälillä: palautettavat tiedot ainakin opiskelija/vastausaika/vastauksen status/tentti/opintojaksontunnus/opettaja mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa
    @Restrict({@Group("ADMIN")})
    public static Result reportAllExams(String from, String to) {

        final DateTime start = DateTime.parse(from, dateFormat);
        final DateTime end = DateTime.parse(to, dateFormat);

        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .select("")
                .where()
                .gt("started", start)
                .lt("ended", end)

                // not interested in these
                .ne("exam.state", "SAVED")
                .ne("exam.state", "PUBLISHED")
                .ne("exam.state", "STUDENT_STARTED")
                .ne("exam.state", "REVIEW")
                /*  we ARE interested in these
                GRADED,
                GRADED_LOGGED,
                ABORTED,
                ARCHIVED
                */
                .findList();

        File file = new File(basePath + "tenttivastaukset" + from.replace(".", "-") + "_" + to.replace(".", "-") + ".xlsx");
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("tenttisuoritukset");

        // Table headings
        Row headerRow = sheet.createRow(0);

        int i = 0;
        
        // student
        headerRow.createCell(i++).setCellValue("Opiskelija id");  // Todo: should probaly be schacPersonalUniqueCode, opiskelijanumero
        headerRow.createCell(i++).setCellValue("Etunimi");
        headerRow.createCell(i++).setCellValue("Sukunimi");
        headerRow.createCell(i++).setCellValue("Email");

        // graded by teacher
        headerRow.createCell(i++).setCellValue("Opiskelija id");
        headerRow.createCell(i++).setCellValue("Etunimi");
        headerRow.createCell(i++).setCellValue("Sukunimi");
        headerRow.createCell(i++).setCellValue("Email");

        headerRow.createCell(i++).setCellValue("varaus id");
        headerRow.createCell(i++).setCellValue("varauksen pvm");
        headerRow.createCell(i++).setCellValue("tentti alkoi");
        headerRow.createCell(i++).setCellValue("tentti loppui");
        headerRow.createCell(i++).setCellValue("suoritus kesti");

        headerRow.createCell(i++).setCellValue("Tenttitila id");
        headerRow.createCell(i++).setCellValue("Nimi");
        headerRow.createCell(i++).setCellValue("Tunnus");

        headerRow.createCell(i++).setCellValue("Tenttikone id");
        headerRow.createCell(i++).setCellValue("Nimi");
        headerRow.createCell(i++).setCellValue("IP-osoite");

        headerRow.createCell(i++).setCellValue("Opintojakson nimi");
        headerRow.createCell(i++).setCellValue("Opintojakson koodi");

        headerRow.createCell(i++).setCellValue("Tentti id");
        headerRow.createCell(i++).setCellValue("Nimi");
        headerRow.createCell(i++).setCellValue("kesto");
        headerRow.createCell(i++).setCellValue("status");
        headerRow.createCell(i++).setCellValue("pisteet");
        headerRow.createCell(i++).setCellValue("arvosana-asteikko");
        headerRow.createCell(i++).setCellValue("arvosana");
        headerRow.createCell(i++).setCellValue("arvioitu pvm");
        headerRow.createCell(i++).setCellValue("Suoritustyyppi");

        if(!CollectionUtils.isEmpty(participations)) {
            for (ExamParticipation p : participations) {

                int j = 0;

                ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                        .fetch("user")
                        .fetch("exam")
                        .fetch("exam.gradedByUser")
                        .fetch("reservation")
                        .fetch("reservation.machine")
                        .fetch("reservation.machine.room")
                        .where()
                        .eq("user.id", p.getUser().getId())
                        .eq("exam.id", p.getExam().getId())
                        .findUnique();

                Row dataRow = sheet.createRow(participations.indexOf(p) + 1);

                // student
                if (p.getUser() != null) {
                    dataRow.createCell(j++).setCellValue(p.getUser().getId());
                    dataRow.createCell(j++).setCellValue(p.getUser().getFirstName());
                    dataRow.createCell(j++).setCellValue(p.getUser().getLastName());
                    dataRow.createCell(j++).setCellValue(p.getUser().getEmail());
                }
                // teacher
                if (p.getExam().getGradedByUser() != null) {
                    dataRow.createCell(j++).setCellValue(p.getExam().getGradedByUser().getId());
                    dataRow.createCell(j++).setCellValue(p.getExam().getGradedByUser().getFirstName());
                    dataRow.createCell(j++).setCellValue(p.getExam().getGradedByUser().getLastName());
                    dataRow.createCell(j++).setCellValue(p.getExam().getGradedByUser().getEmail());
                } else {
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                }
                // reservation
                if (enrolment.getReservation() != null) {
                    dataRow.createCell(j++).setCellValue(enrolment.getReservation().getId());
                } else {
                    dataRow.createCell(j++).setCellValue("");
                }

                // varauksen pvm
                if (enrolment.getEnrolledOn() == null) {
                    dataRow.createCell(j++).setCellValue("");
                } else {
                    dateCell(wb, dataRow, j++, enrolment.getEnrolledOn(), "dd.MM.yyyy");
                }
                // tentti alkoi
                if (p.getStarted() == null) {
                    dataRow.createCell(j++).setCellValue("");
                } else {
                    dateCell(wb, dataRow, j++, p.getStarted(), "HH:mm");
                }
                // tentti loppui
                if (p.getEnded() == null) {
                    dataRow.createCell(j++).setCellValue("");
                } else {
                    dateCell(wb, dataRow, j++, p.getEnded(), "HH:mm");
                }

                // suoritus kesti
                if (p.getDuration() == null) {
                    dataRow.createCell(j++).setCellValue("");
                } else {
                    dateCell(wb, dataRow, j++, p.getDuration(), "HH.mm");
                }

                // tenttitila
                if (enrolment.getReservation() != null) {
                    if (enrolment.getReservation().getMachine() == null || enrolment.getReservation().getMachine().getRoom() == null) {
                        dataRow.createCell(j++).setCellValue("");
                        dataRow.createCell(j++).setCellValue("");
                        dataRow.createCell(j++).setCellValue("");

                        dataRow.createCell(j++).setCellValue("");
                        dataRow.createCell(j++).setCellValue("");
                        dataRow.createCell(j++).setCellValue("");
                    } else {
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getRoom().getId().toString());
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getRoom().getName() == null ? "" : enrolment.getReservation().getMachine().getRoom().getName());
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getRoom().getRoomCode() == null ? "" : enrolment.getReservation().getMachine().getRoom().getRoomCode());

                        // tenttikone
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getId());
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getName() == null ? "" : enrolment.getReservation().getMachine().getName());
                        dataRow.createCell(j++).setCellValue(enrolment.getReservation().getMachine().getIpAddress() == null ? "" : enrolment.getReservation().getMachine().getIpAddress());
                    }
                } else {
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                    // tenttikone
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                }

                if (p.getExam().getCourse() == null) {
                    dataRow.createCell(j++).setCellValue("");
                    dataRow.createCell(j++).setCellValue("");
                } else {
                    dataRow.createCell(j++).setCellValue(p.getExam().getCourse().getName() == null ? "" : p.getExam().getCourse().getName());
                    dataRow.createCell(j++).setCellValue(p.getExam().getCourse().getCode() == null ? "" : p.getExam().getCourse().getCode());
                }
                dataRow.createCell(j++).setCellValue(p.getExam().getId());
                dataRow.createCell(j++).setCellValue(p.getExam().getName() == null ? "" : p.getExam().getName());
                dataRow.createCell(j++).setCellValue(p.getExam().getDuration() == null ? "" : p.getExam().getDuration().toString());
                dataRow.createCell(j++).setCellValue(p.getExam().getState() == null ? "" : p.getExam().getState());
                dataRow.createCell(j++).setCellValue(p.getExam().getTotalScore() == null ? "" : p.getExam().getTotalScore().toString());
                dataRow.createCell(j++).setCellValue(p.getExam().getGrading() == null ? "" : p.getExam().getGrading());
                dataRow.createCell(j++).setCellValue(p.getExam().getGrade() == null ? "" : p.getExam().getGrade());

                // arvosana annettu pvm
                if (p.getExam().getGradedTime() != null) {
                    dateCell(wb, dataRow, j++, p.getExam().getGradedTime(), "dd.MM.yyyy");
                } else {
                    dataRow.createCell(j++).setCellValue("");
                }

                dataRow.createCell(j++).setCellValue(p.getExam().getCreditType() == null ? "" : p.getExam().getCreditType());

            }
        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));
    }

    // no route to this method
    public static void createReportDirectory() {
        String reportsPath = Play.application().configuration().getString("sitnet.reports.path");
        String playPath = Play.application().path().getAbsolutePath();
        String basePath = playPath + "/" + reportsPath +"/";

        File dir = new File(basePath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result reportStudentActivity (Long studentId, String from, String to) {

        final DateTime start = DateTime.parse(from, dateFormat);
        final DateTime end = DateTime.parse(to, dateFormat);

        User student = Ebean.find(User.class, studentId);


        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .gt("enrolledOn", start)
                .lt("enrolledOn", end)
                .eq("user.id", studentId)
                .findList();




        /*
        *     lista varauksen tehneistä opiskelijoista (nimi (linkki sähköpostimahdollisuuteen), tentin nimi (linkki tentin tietoihin), yksikkö, pvm, klo, paikka/kone, suorituskerran numero)
                lista opiskelijoista, jotka ovat tentissä parhaillaan
                lista suoritetuista tenteistä
                lista arvioiduista tenteistä
                lista arkistoiduista tenteistä
        * */


        //palautettavat tiedot ainakin oletuskieli/tenttivastaukset/status/suoritukset/akvaariovaraukset/ mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa
        //Joo, raportti kuudessa piti hakea melkolailla samat jutu kuin jossain muussa (en muista mikä), sillä haluttiin nähdä opiskelijan perustiedot (eka sheetti) ja sen aktiviteetit eli tenttisuoritukset + ilmoittautumiset (toinen sheetti)

        File file = new File(basePath+"tenttivastaukset"+from.replace(".", "-") +"_"+to.replace(".", "-") +".xlsx");
        Workbook wb = new XSSFWorkbook();
        Sheet student_sheet = wb.createSheet("opiskelija");
        Sheet partiticipations_sheet = wb.createSheet("tenttisuoritukset");

        //**************************************************************
        //Student sheet
        int index = 0;

        //Table heading
        Row headerRow = student_sheet.createRow(0);

        // student
        headerRow.createCell(index++).setCellValue("Opiskelija id");  // Todo: should probably be PersonalUniqueCode, opiskelijanumero
        headerRow.createCell(index++).setCellValue("Etunimi");
        headerRow.createCell(index++).setCellValue("Sukunimi");
        headerRow.createCell(index++).setCellValue("Email");
        headerRow.createCell(index++).setCellValue("Kieli");

        Row dataRow = student_sheet.createRow(1);

        index = 0;

        // student
        dataRow.createCell(index++).setCellValue(student.getId());
        dataRow.createCell(index++).setCellValue(student.getFirstName());
        dataRow.createCell(index++).setCellValue(student.getLastName());
        dataRow.createCell(index++).setCellValue(student.getEmail());
        dataRow.createCell(index++).setCellValue(student.getUserLanguage().getNativeLanguageName());

        //***************************************************************
        //Participations sheet

        // Table headings
        headerRow = partiticipations_sheet.createRow(0);

        index = 0;

        // student
        headerRow.createCell(index++).setCellValue("Opiskelija id");  // Todo: should probably be PersonalUniqueCode, opiskelijanumero
        headerRow.createCell(index++).setCellValue("Etunimi");
        headerRow.createCell(index++).setCellValue("Sukunimi");
        headerRow.createCell(index++).setCellValue("Email");

        // graded by teacher
        headerRow.createCell(index++).setCellValue("Opiskelija id");
        headerRow.createCell(index++).setCellValue("Etunimi");
        headerRow.createCell(index++).setCellValue("Sukunimi");
        headerRow.createCell(index++).setCellValue("Email");

        headerRow.createCell(index++).setCellValue("varaus id");
        headerRow.createCell(index++).setCellValue("varauksen pvm");
        headerRow.createCell(index++).setCellValue("tentti alkoi");
        headerRow.createCell(index++).setCellValue("tentti loppui");
        headerRow.createCell(index++).setCellValue("suoritus kesti");

        headerRow.createCell(index++).setCellValue("Tenttitila id");
        headerRow.createCell(index++).setCellValue("Nimi");
        headerRow.createCell(index++).setCellValue("Tunnus");

        headerRow.createCell(index++).setCellValue("Tenttikone id");
        headerRow.createCell(index++).setCellValue("Nimi");
        headerRow.createCell(index++).setCellValue("IP-osoite");

        headerRow.createCell(index++).setCellValue("Opintojakson nimi");
        headerRow.createCell(index++).setCellValue("Opintojakson koodi");

        headerRow.createCell(index++).setCellValue("Tentti id");
        headerRow.createCell(index++).setCellValue("Nimi");
        headerRow.createCell(index++).setCellValue("kesto");
        headerRow.createCell(index++).setCellValue("status");
        headerRow.createCell(index++).setCellValue("pisteet");
        headerRow.createCell(index++).setCellValue("arvosana-asteikko");
        headerRow.createCell(index++).setCellValue("arvosana");
        headerRow.createCell(index++).setCellValue("arvioitu pvm");
        headerRow.createCell(index++).setCellValue("Suoritustyyppi");


        for(ExamEnrolment rol : enrolments) {

            ExamParticipation pa = Ebean.find(ExamParticipation.class)
                    .where()
                    .eq("exam.id", rol.getExam().getId())
                    .findUnique();

            index = 0;

            dataRow = partiticipations_sheet.createRow(enrolments.indexOf(rol)+1);

            dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getUser().getId() + "");
            dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getUser().getFirstName() + "");
            dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getUser().getLastName());
            dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getUser().getEmail());

            // teacher
            if (pa != null && pa.getExam().getGradedByUser() != null) {
                dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getExam().getGradedByUser().getId() + "");
                dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getExam().getGradedByUser().getFirstName());
                dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getExam().getGradedByUser().getLastName());
                dataRow.createCell(index++).setCellValue(pa == null ? "" : pa.getExam().getGradedByUser().getEmail());
            } else {
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
            }
            // reservation
            if(rol.getReservation() != null) {
                dataRow.createCell(index++).setCellValue(rol.getReservation().getId());
            }
            else {
                dataRow.createCell(index++).setCellValue("");
            }

            // varauksen pvm
            dateCell(wb, dataRow, index++, rol.getEnrolledOn(), "dd.MM.yyyy");

            // tentti alkoi
            if (pa == null) {
                index++;
            } else {
                dateCell(wb, dataRow, index++, pa.getStarted(), "HH:mm");
            }
            // tentti loppui
            if (pa == null) {
                index++;
            } else {
                dateCell(wb, dataRow, index++, pa.getEnded(), "HH:mm");
            }
            // suoritus kesti
            if (pa == null) {
                index++;
            } else {
                dateCell(wb, dataRow, index++, pa.getDuration(), "HH.mm");
            }

            // tenttitila
            if (rol.getReservation() != null) {
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getRoom().getId());
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getRoom().getName());
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getRoom().getRoomCode());
                // tenttikone
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getId());
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getName());
                dataRow.createCell(index++).setCellValue(rol.getReservation().getMachine().getIpAddress());
            } else {
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
                // tenttikone
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
                dataRow.createCell(index++).setCellValue("");
            }



            dataRow.createCell(index++).setCellValue(rol.getExam().getCourse().getName());
            dataRow.createCell(index++).setCellValue(rol.getExam().getCourse().getCode());
            dataRow.createCell(index++).setCellValue(rol.getExam().getId());
            dataRow.createCell(index++).setCellValue(rol.getExam().getName());
            dataRow.createCell(index++).setCellValue(rol.getExam().getDuration() == null ? "" : rol.getExam().getDuration()+"");
            dataRow.createCell(index++).setCellValue(rol.getExam().getState());
            dataRow.createCell(index++).setCellValue(rol.getExam().getTotalScore());
            dataRow.createCell(index++).setCellValue(rol.getExam().getGrading());
            dataRow.createCell(index++).setCellValue(rol.getExam().getGrade());

            // arvosana annettu pvm
            if(rol.getExam().getGradedTime() != null)
                dateCell(wb, dataRow, index++, rol.getExam().getGradedTime(), "dd.MM.yyyy");
            else {
                dataRow.createCell(index++).setCellValue("");
            }
            dataRow.createCell(index++).setCellValue(rol.getExam().getCreditType());

        }

        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

        return ok(com.ning.http.util.Base64.encode(setData(wb, file).toByteArray()));
    }
}
