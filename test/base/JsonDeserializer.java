package base;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.gson.*;
import models.answers.AbstractAnswer;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import play.Logger;

import java.lang.reflect.Type;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

public final class JsonDeserializer {

    private static GsonBuilder gsonBuilder = new GsonBuilder();
    static {
        gsonBuilder.registerTypeAdapter(Date.class, new DateDeserializer());
        gsonBuilder.registerTypeAdapter(AbstractQuestion.class, new QuestionDeserializer());
        gsonBuilder.registerTypeAdapter(AbstractAnswer.class, new AnswerDeserializer());
    }
    private static Gson gson = gsonBuilder.create();

    private static class DateDeserializer implements com.google.gson.JsonDeserializer<Date> {

        @Override
        public Date deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) {
            try {
                return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").parse(json.getAsString());
            } catch (ParseException e) {
                Logger.warn("Failed to parse date " + json.getAsString());
            }
            return null;
        }
    }

    private static class QuestionDeserializer implements com.google.gson.JsonDeserializer<AbstractQuestion> {

        @Override
        public AbstractQuestion deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) {
            JsonObject object = json.getAsJsonObject();
            String type = object.get("type").getAsString();
            if (type.equals("EssayQuestion")) {
                return context.deserialize(json, EssayQuestion.class);
            }
            if (type.equals("MultipleChoiceQuestion")) {
                return context.deserialize(json, MultipleChoiceQuestion.class);
            }
            return null;
        }
    }

    private static class AnswerDeserializer implements com.google.gson.JsonDeserializer<AbstractAnswer> {

        @Override
        public AbstractAnswer deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) {
            JsonObject object = json.getAsJsonObject();
            String type = object.get("type").getAsString();
            if (type.equals("EssayAnswer")) {
                return context.deserialize(json, EssayAnswer.class);
            }
            if (type.equals("MultipleChoiseAnswer")) {
                return context.deserialize(json, MultipleChoiseAnswer.class);
            }
            return null;
        }
    }

    public static <T> T deserialize(Class<T> model, JsonNode node) {
        return gson.fromJson(node.toString(), model);
    }
}
