import com.avaje.ebean.Ebean;
import models.User;
import play.Logger;
import util.java.EmailComposer;

import java.util.List;

public class WeeklyEmailReport implements Runnable {
    @Override
    public void run() {
        Logger.info("Running weekly email report");
        try {

            List<User> teachers = Ebean.find(User.class)
                    .fetch("roles")
                    .where()
                    .eq("roles.name", "TEACHER")
                    .findList();

            for (User teacher : teachers) {
                EmailComposer.composeWeeklySummary(teacher);
            }

        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
