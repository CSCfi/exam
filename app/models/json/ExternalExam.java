package models.json;

import io.ebean.annotation.DbJsonB;
import io.ebean.text.json.EJson;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.Exam;
import models.User;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import util.JsonDeserializer;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import java.io.IOException;
import java.util.Map;

@Entity
public class ExternalExam extends GeneratedIdentityModel {

    @Column
    private String externalRef; // REFERENCE TO PARENT EXAM ELSEWHERE

    @Column
    private String hash; // LOCAL EXAM REFERENCE

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime created;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime started;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime finished;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime sent;

    @OneToOne
    private User creator;

    @DbJsonB
    private Map<String, Object> content;

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
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

    public DateTime getSent() {
        return sent;
    }

    public void setSent(DateTime sent) {
        this.sent = sent;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
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
