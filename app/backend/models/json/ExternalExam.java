/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models.json;

import java.io.IOException;
import java.util.Map;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ebean.annotation.DbJsonB;
import io.ebean.text.json.EJson;
import org.joda.time.DateTime;

import backend.models.Exam;
import backend.models.User;
import backend.models.base.GeneratedIdentityModel;
import backend.util.json.JsonDeserializer;

@Entity
public class ExternalExam extends GeneratedIdentityModel {

    @Column
    private String externalRef; // exam.hash of the remote parent exam

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
