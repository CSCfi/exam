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
      "type": "PUBLIC",
      "active": true
    },
    {
      "id": 2,
      "type": "PRIVATE",
      "active": true
    }
  ],
  "grade_scale": [
    {
      "id": 1,
      "description": "ZERO_TO_FIVE",
    }
  ],
  "grade": [
    {
      "id": 1,
      "grade_scale_id": 1,
      "name": "1",
      "marks_rejection": false
    },
    {
      "id": 2,
      "grade_scale_id": 1,
      "name": "2",
      "marks_rejection": false
    },
    {
      "id": 3,
      "grade_scale_id": 1,
      "name": "3",
      "marks_rejection": false
    },
    {
      "id": 4,
      "grade_scale_id": 1,
      "name": "4",
      "marks_rejection": false
    },
    {
      "id": 5,
      "grade_scale_id": 1,
      "name": "6",
      "marks_rejection": false
    },
    {
      "id": 6,
      "grade_scale_id": 1,
      "name": "0",
      "marks_rejection": false
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
