module.exports = {
  "question": [
    {
      "id": 10001,
      "created": null,
      "creator_id": 10001,
      "modified": null,
      "modifier_id": 10001,
      "question": "Test multichoice question",
      "shared": false,
      "default_answer_instructions": null,
      "state": "SAVED",
      "default_max_score": 2,
      "parent_id": null,
      "default_evaluation_criteria": null,
      "attachment_id": null,
      "default_expected_word_count": null,
      "object_version": 1,
      "type": 1,
      "default_evaluation_type": null
    },
    {
      "id": 10002,
      "created": null,
      "creator_id": 10001,
      "modified": null,
      "modifier_id": 10001,
      "question": "Test essee question",
      "shared": false,
      "default_answer_instructions": null,
      "state": "SAVED",
      "default_max_score": 0,
      "parent_id": null,
      "default_evaluation_criteria": null,
      "attachment_id": null,
      "default_expected_word_count": 10000,
      "object_version": 1,
      "type": 2,
      "default_evaluation_type": 2
    },
    {
      "id": 10003,
      "created": null,
      "creator_id": 10001,
      "modified": null,
      "modifier_id": 10001,
      "question": "Test weighted multichoice question",
      "shared": false,
      "default_answer_instructions": null,
      "state": "SAVED",
      "default_max_score": 0,
      "parent_id": null,
      "default_evaluation_criteria": null,
      "attachment_id": null,
      "default_expected_word_count": null,
      "object_version": 1,
      "type": 3,
      "default_evaluation_type": null
    }
  ],
  "multiple_choice_option": [
    {
      "id": 10001,
      "option": "Option 1",
      "correct_option": false,
      "default_score": null,
      "question_id": 10001,
      "object_version": 1
    },
    {
      "id": 10002,
      "option": "Option 2",
      "correct_option": false,
      "default_score": null,
      "question_id": 10001,
      "object_version": 1
    },
    {
      "id": 10003,
      "option": "Option 3",
      "correct_option": false,
      "default_score": null,
      "question_id": 10001,
      "object_version": 1
    },
    {
      "id": 10004,
      "option": "Option 4",
      "correct_option": true,
      "default_score": null,
      "question_id": 10001,
      "object_version": 1
    },
    {
      "id": 10005,
      "option": "Wrong option",
      "correct_option": false,
      "default_score": -1,
      "question_id": 10003,
      "object_version": 1
    },
    {
      "id": 10006,
      "option": "Right option 1",
      "correct_option": false,
      "default_score": 1,
      "question_id": 10003,
      "object_version": 1
    },
    {
      "id": 10007,
      "option": "Right option 2",
      "correct_option": false,
      "default_score": 1,
      "question_id": 10003,
      "object_version": 1
    }
  ],
  "question_owner": [
    {
      "user_id": 10001,
      "question_id": 10001
    },
    {
      "user_id": 10001,
      "question_id": 10002
    },
    {
      "user_id": 10001,
      "question_id": 10003
    }
  ]
};
