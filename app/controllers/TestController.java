package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.questions.EssayQuestion;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.util.Arrays;
import java.util.Map;

/**
 * Created by avainik on 3/6/14.
 */
public class TestController extends SitnetController {


    //  @Authenticate
//    @BodyParser.Of(BodyParser.Json.class)
    public static Result addQuestion() throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();

        Logger.debug("q id: " + df.get("id"));
        Logger.debug("q name: " + df.get("name"));
        Logger.debug("q type: " + df.get("type"));


        try {
            Class<?> ass = Class.forName("models.questions."+df.get("type"));
            Object question = ass.newInstance();

            question = bindForm(question.getClass());


            EssayQuestion es = new EssayQuestion();
            es.getId();


            Ebean.save(question);
            return ok(Json.toJson(question.toString()));

        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        return ok("fail");
    }


    public static Result shibbolethHeaders()
    {
        String MetadisplayName = request().getHeader("Meta-displayName");
        String cn = request().getHeader("cn");
        String displayName = request().getHeader("displayName");
        String eppn = request().getHeader("eppn");
        String homeorg = request().getHeader("homeorg");
        String logouturl = request().getHeader("logouturl");
        String orgtype = request().getHeader("orgtype");
        String sn = request().getHeader("sn");

        Logger.debug(MetadisplayName);
        Logger.debug(cn);
        Logger.debug(displayName);
        Logger.debug(eppn);
        Logger.debug(homeorg);
        Logger.debug(logouturl);
        Logger.debug(orgtype);
        Logger.debug(sn);

//        Attributes
//        Meta-displayName: 1 value(s)
//        cn: 1 value(s)
//        displayName: 1 value(s)
//        eppn: 1 value(s)
//        homeorg: 1 value(s)
//        logouturl: 1 value(s)
//        orgtype: 1 value(s)
//        sn: 1 value(s)

        Logger.debug("*****************************");

        Map<String, String[]> headers = request().headers();

        for (Map.Entry<String, String[]> entry : headers.entrySet())
        {
            Logger.debug("key: "+ entry.getKey());

            String[] asdasd = entry.getValue();
            Logger.debug("value: "+ Arrays.toString(asdasd));
        }
        Logger.debug("##############################");
        Logger.debug("##############################");


        return ok();
    }
}

