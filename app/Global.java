import java.lang.reflect.Method;
import java.sql.Connection;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import models.SNComment;
import models.User;
import play.Application;
import play.GlobalSettings;
import play.Logger;
import play.db.DB;
import play.mvc.Action;
import play.mvc.Http.Request;

import com.avaje.ebean.Ebean;

public class Global extends GlobalSettings {
    
    public void onStart(Application app) {
        InitialData.insert(app);
    }

    @Override
    public Action onRequest(Request request, Method actionMethod) {

    	Logger.debug(request.path());

    	return super.onRequest(request, actionMethod);
    }
    
    
    static class InitialData {
        
        public static void insert(Application app) {
            if(Ebean.find(User.class).findRowCount() == 0) {
                
            	

//            	DataSource ds = DB.getDataSource();
//            	Connection connection = DB.getConnection();
            	
            	SNComment comment = new SNComment(null, "text", "Hello ");
            	
            	List<User> all =  Ebean.find(User.class).findList();
                Ebean.save(all);

//                @SuppressWarnings("unchecked")
//				Map<String,List<Object>> all = (Map<String,List<Object>>)Yaml.load("initial-data.yml");
//
//                Ebean.save(all.get("users"));
//                Ebean.save(all.get("user_roles"));

//                // Insert projects
//                Ebean.save(all.get("projects"));
//                for(Object project: all.get("projects")) {
//                    // Insert the project/user relation
//                    Ebean.saveManyToManyAssociations(project, "members");
//                }
//
//                // Insert tasks
//                Ebean.save(all.get("tasks"));
                
            }
        }
        
    }
    
}