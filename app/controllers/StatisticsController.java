package controllers;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Attachment;
import models.ExamEnrolment;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Play;
import play.mvc.Result;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Created by avainik on 8/15/14.
 */

/*
SIT-349

Hakulausekkeita:

Hae kaikki akvaariovaraukset tällä aikavälillä tästä akvaariosta: palautettavat tiedot ainakin opiskelija/varausaika/tenttikone/tentti mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa

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

    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyy");


    // Hae kaikki akvaariovaraukset tällä aikavälillä tästä akvaariosta:
    // palautettavat tiedot ainakin opiskelija/varausaika/tenttikone/tentti
    // mutta saa palauttaa kaikki tiedot jotka luontevasti tästä kohteesta saa
    //    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getReservationsByDateForRoom(Long roomId, String from, String to) {

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


        String reportsPath = Play.application().configuration().getString("sitnet.reports.path");
        String playPath = Play.application().path().getAbsolutePath();

        // TODO move to Global.java   or some other initialization code
        // TODO Use smarter config
        String basePath = playPath + "/" + reportsPath +"/";
        File dir = new File(basePath);
        if (!dir.exists()) {
            dir.mkdirs();
        }



        // http://stackoverflow.com/questions/17470597/generate-export-excel-file-from-java-play-framework-2-0-listobject

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

        Row row = sheet.createRow(0);
        row.createCell(1).setCellValue("Ilmoittautuminen id");
        row.createCell(2).setCellValue("Ilmoittautunut");

        row.createCell(3).setCellValue("Käyttäjä id");
        row.createCell(4).setCellValue("etunimi");
        row.createCell(5).setCellValue("sukunimi");

        row.createCell(6).setCellValue("Tentti id");
        row.createCell(7).setCellValue("nimi");

        row.createCell(8).setCellValue("Varaus id");
        row.createCell(9).setCellValue("alkuaika");
        row.createCell(10).setCellValue("loppuaika");

        row.createCell(11).setCellValue("Tenttikone id");
        row.createCell(12).setCellValue("nimi");
        row.createCell(13).setCellValue("IP-osoite");

        row.createCell(14).setCellValue("Tenttitila id");
        row.createCell(15).setCellValue("nimi");
        row.createCell(16).setCellValue("tunnus");

        for(ExamEnrolment e: enrolments) {
            Row dataRow = sheet.createRow(enrolments.indexOf(e)+1);
            dataRow.createCell(1).setCellValue(e.getId());
            dataRow.createCell(2).setCellValue(e.getEnrolledOn());

            dataRow.createCell(3).setCellValue(e.getUser().getId());
            dataRow.createCell(4).setCellValue(e.getUser().getFirstName());
            dataRow.createCell(5).setCellValue(e.getUser().getLastName());

            dataRow.createCell(6).setCellValue(e.getExam().getId());
            dataRow.createCell(7).setCellValue(e.getExam().getName());

            dataRow.createCell(8).setCellValue(e.getReservation().getId());
            dataRow.createCell(9).setCellValue(e.getReservation().getStartAt());
            dataRow.createCell(10).setCellValue(e.getReservation().getEndAt());

            dataRow.createCell(11).setCellValue(e.getReservation().getMachine().getId());
            dataRow.createCell(12).setCellValue(e.getReservation().getMachine().getName());
            dataRow.createCell(13).setCellValue(e.getReservation().getMachine().getIpAddress());

            dataRow.createCell(14).setCellValue(e.getReservation().getMachine().getRoom().getId());
            dataRow.createCell(15).setCellValue(e.getReservation().getMachine().getRoom().getName());
            dataRow.createCell(16).setCellValue(e.getReservation().getMachine().getRoom().getRoomCode());
        }

        try {
            wb.write(fileOut);
            fileOut.close();
        } catch (IOException e) {
            e.printStackTrace();
        }

        File af = new File(file.getAbsolutePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + file.getAbsolutePath() + "\"");
        return ok(af);


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

}
