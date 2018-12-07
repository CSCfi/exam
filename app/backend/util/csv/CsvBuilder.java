package backend.util.csv;

import java.io.File;
import java.io.IOException;
import java.util.Collection;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.ImplementedBy;

import backend.models.Role;
import backend.models.User;

@ImplementedBy(CsvBuilderImpl.class)
public interface CsvBuilder {
    File build(Long startDate, Long endDate) throws IOException;
    File build(Long examId, Collection<Long> childIds) throws IOException;
    File build(JsonNode node) throws IOException;
    void parseGrades(File csvFile, User user, Role.Name role) throws IOException;


}
