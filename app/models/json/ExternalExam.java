package models.json;

import com.avaje.ebean.Model;
import com.avaje.ebean.annotation.DbJsonB;
import com.avaje.ebean.text.json.EJson;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.Exam;
import models.User;
import org.joda.time.DateTime;
import util.java.JsonDeserializer;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import java.io.IOException;
import java.util.Map;

@Entity
public class ExternalExam extends Model {

    @Id
    String hash;

    @Temporal(TemporalType.TIMESTAMP)
    public DateTime created;

    @Temporal(TemporalType.TIMESTAMP)
    public DateTime started;

    @Temporal(TemporalType.TIMESTAMP)
    public DateTime finished;

    @OneToOne
    public User creator;

    @DbJsonB
    Map<String, Object> content;

    @Version
    private long objectVersion;

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public DateTime getCreated() {
        return created;
    }

    public void setCreated(DateTime created) {
        this.created = created;
    }

    public DateTime getStarted() {
        return started;
    }

    public void setStarted(DateTime started) {
        this.started = started;
    }

    public DateTime getFinished() {
        return finished;
    }

    public void setFinished(DateTime finished) {
        this.finished = finished;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
    }

    public long getObjectVersion() {
        return objectVersion;
    }

    public void setObjectVersion(long objectVersion) {
        this.objectVersion = objectVersion;
    }

    public Map<String, Object> getContent() {
        return content;
    }

    public void setContent(Map<String, Object> content) {
        this.content = content;
    }

    @Transient
    public Exam deserialize() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(content);
        JsonNode node = mapper.readTree(json);
        return JsonDeserializer.deserialize(Exam.class, node);
    }

    @Transient
    public void serialize(Exam content) throws IOException {
        ObjectMapper om = new ObjectMapper();
        String txt = om.writeValueAsString(content);
        Map<String, Object> map = EJson.parseObject(txt);
        setContent(map);
        update();
    }
}
