module.exports = {
  "exam_type": [
    {
      "id": 1,
      "object_version": 1,
      "type": "PARTIAL"
    },
    {
      "id": 2,
      "object_version": 1,
      "type": "FINAL"
    }
  ],
  "exam_execution_type": [
    {
      "id": 1,
      "type": "PUBLIC"
    }
  ],
  "exam": [
    {
      "id": 10001,
      "created": "2017-01-01",
      "creator_id": 10001,
      "modified": null,
      "modifier_id": null,
      "name": "Test exam 1",
      "course_id": 10001,
      "exam_type_id": 2,
      "instruction": null,
      "state": 1,
      "object_version": 1,
      "execution_type_id": 1,
      "shared": false
    },
    {
      "id": 10002,
      "created": "2017-01-02",
      "creator_id": 10001,
      "modified": null,
      "modifier_id": null,
      "name": "Test exam 2",
      "course_id": 10002,
      "exam_type_id": 2,
      "instruction": null,
      "state": 1,
      "object_version": 1,
      "execution_type_id": 1,
      "shared": false
    }
  ],
  "exam_owner": [
    {
      "exam_id": 10001,
      "user_id": 10001
    },
    {
      "exam_id": 10002,
      "user_id": 10001
    }
  ]
};
