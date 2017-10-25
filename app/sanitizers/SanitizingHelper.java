package sanitizers;

import com.fasterxml.jackson.databind.JsonNode;
import play.libs.typedmap.TypedKey;
import play.mvc.Http;

import java.util.Optional;

public final class SanitizingHelper {

    private SanitizingHelper() {
    }

    ;

    public static <E extends Enum<E>> Optional<E> parseEnum(String fieldName, JsonNode node, Class<E> type) {
        JsonNode field = node.get(fieldName);
        if (field != null && field.isTextual()) {
            return Optional.of(Enum.valueOf(type, node.get(fieldName).asText()));
        }
        return Optional.empty();
    }

    public static <T> Optional<T> parse(String fieldName, JsonNode node, Class<T> type) {
        JsonNode field = node.get(fieldName);
        T value = null;
        if (field != null && !field.isNull()) {
            if (type.equals(Long.class) && field.canConvertToLong()) {
                value = type.cast(field.asLong());
            }
            if (type.equals(Integer.class) && field.canConvertToInt()) {
                value = type.cast(field.asInt());
            }
            if (field.isTextual()) {
                value = type.cast(field.asText());
            }
            if (field.isDouble() || type.equals(Double.class)) {
                value = type.cast(field.asDouble());
            }
            if (field.isBoolean()) {
                value = type.cast(field.asBoolean());
            }
        }
        return Optional.ofNullable(value);
    }

    public static <T> T parse(String fieldName, JsonNode node, Class<T> type, T defaultValue) {
        Optional<T> value = parse(fieldName, node, type);
        return value.orElse(defaultValue);
    }

    // Exception thrown if value is null or not found
    static <T> Http.Request sanitize(String key, JsonNode node, Class<T> type, TypedKey<T> attr,
                                     Http.Request request) throws SanitizingException {
        T value = parse(key, node, type)
                .orElseThrow(() -> new SanitizingException("Missing or invalid data for key: " + key));
        return request.addAttr(attr, value);
    }

    // If value is null or not present, it will not be added as an attribute.
    static <T> Http.Request sanitizeOptional(String key, JsonNode node, Class<T> type, TypedKey<T> attr,
                                             Http.Request request) {
        Optional<T> value = parse(key, node, type);
        return value.isPresent() ? request.addAttr(attr, value.get()) : request;
    }


}
