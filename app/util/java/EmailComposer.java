package util.java;

import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.User;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;

import java.util.List;

/**
 * Created by alahtinen on 21.5.2014.
 */
public class EmailComposer {



    public static void composeChangeInspectorNotification(User inspector, User sender, Exam exam, String msg) {

        String examData = exam.getName() + "(" + exam.getCourse().getCode() + ")";
        String subject = examData + " -tentti on annettu arvioitavaksesi";
        String recipient = inspector.getFirstName() + " " + inspector.getLastName() + " <" + inspector.getEmail() + ">";
        String sndr = sender.getFirstName() + " " + sender.getLastName() + " <" + sender.getEmail() + ">";

        String oql = "find examInspection " +
                     "fetch exam where (exam.name=:examId and exam.state=:estate) ";
        //"where (state=:published or state=:saved or state=:draft) ";

        Query<ExamInspection> query = Ebean.createQuery(ExamInspection.class, oql);


        query.setParameter("examId", exam.getName());
        query.setParameter("estate", "REVIEW");

        List<ExamInspection> ers = query.findList();

        int notInspectedCount = ers.size();

        String content = "<html><body><div>" +
                         sender.getFirstName() + " " + sender.getLastName() +
                         " on merkinnyt sinut arvioijaksi seuraavalle tentille: " +
                         examData + "<br>" +
                         "Tentillä on " + notInspectedCount + " vastausta. <br><br>";

        if (notInspectedCount > 0 && notInspectedCount < 6) {

            content += "<ul>";

            for (ExamInspection usr : ers) {

                content += "<li>" + usr.getUser().getFirstName() + " " + usr.getUser().getLastName() + "</li>";

            }
            content += "</ul>";
        }
        /*
        Jos edellinen lukumäärä on suurempi kuin nolla generoidaan:

        • vastanneen opiskelijan/opiskelijoiden nimet <opiskelija> (listaus jos opiskelijoita esim. 1-5, muuten pelkkä lkm?)
        */

        content += "<div>" + msg + "</div><br><br>";

        final String domain = "localhost:9000";

        String linkToExam = "<a href=\"" + domain +"/#/home/\"" + ">Tenttinäkymään</a>";
        content += linkToExam;
        content += "</div></body></html>";

        EmailSender.sendInspectorNotification(recipient, sndr, subject, content);
    }
}
