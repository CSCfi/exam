import play.GlobalSettings;
import play.Logger;
import play.api.Application;

public class Global extends GlobalSettings {

    public void onStart(Application app) {
        Logger.info("Application has started");
        InitialData.insert(app);
    }

    public void onStop(Application app) {
        Logger.info("Application shutdown...");
    }

    static class InitialData {


        public static void insert(Application app) {


            /*

            //todo: initial data!
            //see: http://stackoverflow.com/questions/12013099/load-initial-data-in-play-2-0
            if (Ebean.find(User.class).findRowCount() == 0) {

                @SuppressWarnings("unchecked")
                Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");

                // Insert users first
                Ebean.save(all.get("users"));

                // Insert projects
                Ebean.save(all.get("projects"));
                for (Object project : all.get("projects")) {
                    // Insert the project/user relation
                    Ebean.saveManyToManyAssociations(project, "members");
                }

                // Insert tasks
                Ebean.save(all.get("tasks"));

            }

            */
        }

    }

}