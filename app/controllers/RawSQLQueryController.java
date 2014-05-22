package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;

/**
 * Created by avainik on 5/22/14.
 */
public class RawSQLQueryController  extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result executeSQL() {
        DynamicForm df = Form.form().bindFromRequest();

        String query = df.get("query");
        return ok();
    }

}
