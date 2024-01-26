import joi from "joi";

export const loginValidation = joi.object({
  emailMobUid: joi.string().optional(),
  password: joi.string().optional(),
  userRole: joi.string().trim().required(),
  macAddress: joi.string().trim().required(),
});

export const assessmentCreateValidation = joi.object({
  uId: joi.string().required(),
  assessmentName: joi.string().required(),
  assessmentDesc: joi.string().required(),
  subSkillId: joi.string().hex().length(24).required(),
});

export const assessmentEditValidation = joi.object({
  assessmentId: joi.string().hex().length(24).required(),
  assessmentName: joi.string(),
  assessmentDesc: joi.string(),
});

export const assessmentAssignToGradeValidation = joi.object({
  assessmentId: joi.string().hex().length(24).required(),
  assessmentName: joi.string().required(),
  gradeId: joi.string().hex().length(24).required(),
  originalAssessmentId: joi.string().hex().length(24).required(),
  uId: joi.string().required(),
});

export const assessmentAssignToDivisionValidation = joi.object({
  assessmentId: joi.string().hex().length(24).required(),
  assessmentName: joi.string().required(),
  divisionId: joi.string().hex().length(24).required(),
  originalAssessmentId: joi.string().hex().length(24).required(),
  uId: joi.string().required(),
});

export const LearnerAssessmentValidation = joi.object({
  learnerId: joi.string().hex().length(24).required(),
  assessmentId: joi.string().hex().length(24).required(),
  rubricsQts: joi
    .array()
    .items(
      joi.object({
        quesDesc: joi.string().trim().required(),
        quesMarks: joi.number().required(),
        eachObtainMarks: joi.number().required(),
      })
    )
    .min(1)
    .required(),
  teacherId: joi.string().hex().length(24).required(),
});

export const courseCreateValidation = joi.object({
  uId: joi.string().required(),
  courseName: joi.string().required(),
  about: joi.string().required(),
  coursePicture: joi.string(),
  courseDuration: joi.object({
    duration: joi
      .number()
      .required()
      .when("slot", {
        is: "days",
        then: joi.number().min(1).max(364),
        is: "months",
        then: joi.number().min(1).max(11),
        is: "years",
        then: joi.number().min(1).positive(),
        otherwise: joi.number().min(1),
      }),
    slot: joi.string().valid("days", "months", "years").required(),
  }),

  contentFolder: joi.string().hex().length(24).required(),
});

export const courseAssignToGradeValidation = joi.object({
  uId: joi.string().required(),
  courseName: joi.string().required(),
  courseId: joi.string().hex().length(24).required(),
  gradeId: joi.string().hex().length(24).required(),
});

export const courseAssignToDivisionValidation = joi.object({
  uId: joi.string().required(),
  courseName: joi.string().required(),
  courseId: joi.string().hex().length(24).required(),
  divisionIds: joi
    .array()
    .items(joi.string().hex().length(24).min(1).required())
    .required(),
});

export const courseAssignToLearnerValidation = joi.object({
  uId: joi.string().required(),
  courseName: joi.string().required(),
  courseId: joi.string().hex().length(24).required(),
  learnerIds: joi
    .array()
    .items(joi.string().hex().length(24).min(1).required())
    .required(),
});

export const courseAssignToTeacherValidation = joi.object({
  uId: joi.string().required(),
  courseName: joi.string().required(),
  courseId: joi.string().hex().length(24).required(),
  teacherIds: joi
    .array()
    .items(joi.string().hex().length(24).min(1).required())
    .required(),
});

export const divisionCreateValidation = joi.object({
  gradeId: joi.string().hex().length(24).required(),
  divisionUid: joi.string().trim().required(),
  divisionName: joi.string().trim().required(),
});

export const divisionEditValidation = joi.object({
  divisionName: joi.string().trim().required(),
  divisionId: joi.string().hex().length(24).required(),
});

export const divisionRemoveFromCourseValidation = joi.object({
  courseId: joi.string().hex().length(24).required(),
  divisionId: joi.string().hex().length(24).required(),
  originalCourseId: joi.string().hex().length(24).required(),
});

export const folderCreateValidation = joi.object({
  uId: joi.string().trim().required(),
  folderName: joi.string().trim().required(),
  description: joi.string(),
});

export const gradeCreateValidation = joi.object({
  schoolId: joi.string().hex().length(24).required(),
  gradeName: joi.string().trim().required(),
  gradeUid: joi.string().trim().required(),
});

export const gradeEditValidation = joi.object({
  gradeName: joi.string().trim().required(),
  gradeId: joi.string().hex().length(24).required(),
});

export const learnerCreateValidation = joi.object({
  uId: joi.string().trim().required(),
  firstName: joi.string().trim().required(),
  middleName: joi.string().trim(),
  surName: joi.string().trim(),
  dob: joi.string().optional(),
  email: joi.string().trim().required(),
  mobile: joi.number().required(),
  enrollmentDate: joi.string().optional(),
  divisionId: joi.string().hex().length(24).required(),
  gender: joi.string().required(),
  countryCode: joi.string().trim().required(),
});

export const learnerEditValidation = joi.object({
  learnerId: joi.string().hex().length(24).required(),
  firstName: joi.string().trim(),
  middleName: joi.string().trim(),
  surName: joi.string().trim(),
  dob: joi.string(),
  enrollmentDate: joi.string(),
  email: joi.string().trim(),
  mobile: joi.number(),
  gender: joi.string(),
  countryCode: joi.string().trim().optional(),
  schoolId: joi.string().hex().length(24),
  gradeId: joi.string().hex().length(24),
  divisionId: joi.string().hex().length(24),
});

export const schoolCreateValidation = joi.object({
  schoolUid: joi.string().trim().required(),
  schoolName: joi.string().trim().required(),
  mobile: joi.number().required(),
  email: joi.string().trim().required(),
  location: joi.string().trim().required(),
  pinCode: joi.number().required(),
  city: joi.string().trim().required(),
  state: joi.string().trim().required(),
  country: joi.string().trim().required(),
  websiteUrl: joi.string(),
  countryCode: joi.string().trim().required(),
});

export const schoolEditValidation = joi.object({
  schoolId: joi.string().hex().length(24).required(),
  mobile: joi.number(),
  schoolName: joi.string().trim(),
  email: joi.string().trim(),
  location: joi.string().trim(),
  pinCode: joi.number(),
  city: joi.string().trim(),
  state: joi.string().trim(),
  country: joi.string().trim(),
  websiteUrl: joi.string().trim(),
  countryCode: joi.string().trim().optional(),
});

export const skillCreateValidation = joi.object({
  uId: joi.string().trim().required(),
  skillName: joi.string().trim().required(),
  description: joi.string().trim().required(),
});

export const skillEditValidation = joi.object({
  skillId: joi.string().hex().length(24).required(),
  skillName: joi.string().trim(),
  description: joi.string().trim(),
});

export const subFolderCreateValidation = joi.object({
  uId: joi.string().required(),
  folderId: joi.string().hex().length(24).required(),
  subFolderName: joi.string().trim().required(),
});

export const subFolderTrackUpdateValidation = joi.object({
  subFolderId: joi.string().hex().length(24).required(),
  userId: joi.string().hex().length(24).required(),
  courseId: joi.string().hex().length(24).required(),
});

export const subSkillCreateValidation = joi.object({
  uId: joi.string().trim().required(),
  skillId: joi.string().hex().length(24).required(),
  subSkillName: joi.string().trim().required(),
  description: joi.string().trim().required(),
  rubricsQts: joi
    .array()
    .items(
      joi.object({
        quesDesc: joi.string().trim().required(),
      })
    )
    .min(1)
    .required(),
});

export const subSkillEditValidation = joi.object({
  subSkillId: joi.string().hex().length(24).required(),
  subSkillName: joi.string().trim(),
  description: joi.string().trim(),
  rubricsQts: joi.array().items(
    joi.object({
      quesDesc: joi.string().trim(),
      quesMarks: joi.number(),
      _id: joi.string().hex().length(24),
    })
  ),
});

export const teacherCreateValidation = joi.object({
  uId: joi.string().trim().required(),
  firstName: joi.string().trim().required(),
  middleName: joi.string().trim(),
  surName: joi.string().trim(),
  dob: joi.string().required(),
  email: joi.string().trim().required(),
  mobile: joi.number().required(),
  enrollmentDate: joi.string().required(),
  schoolId: joi.string().hex().length(24).required(),
  divisionId: joi.string().hex().length(24).required(),
  gender: joi.string().required(),
  countryCode: joi.string().trim().required(),
});

export const teacherEditValidation = joi.object({
  teacherId: joi.string().hex().length(24).required(),
  firstName: joi.string().trim(),
  middleName: joi.string().trim(),
  surName: joi.string().trim(),
  dob: joi.string(),
  email: joi.string().trim(),
  mobile: joi.number(),
  gender: joi.string(),
  countryCode: joi.string().trim().optional(),
  enrollmentDate: joi.string().trim().optional(),
});

export const assignDivisionToTeacherValidation = joi.object({
  teacherId: joi.string().hex().length(24).required(),
  schoolId: joi.string().hex().length(24).required(),
  divisionId: joi.string().hex().length(24).required(),
});

export const forgotPasswordValidationForLerner = joi.object({
  id: joi.string().trim().required(),
  password: joi.string().trim().required().min(5),
});

export const changePassValidationForLerner = joi.object({
  currentPassword: joi.string().trim().required(),
  newPassword: joi.string().trim().required().min(5),
});
// export const pdfUploadValidation = joi.object({
//   subFolderId: joi.string().hex().length(24).required(),
//   file: joi.object({
//     originalname: joi.string().required(),
//     mimetype: joi.string().valid("application/pdf").required(),
//     size: joi
//       .number()
//       .max(1024 * 1024 * 10)
//       .required(), // Maximum file size is 10 MB
//   }),
// });

export const getAssessmentForLernerById = joi.object({
  assessmentId: joi.string().hex().trim().required(),
  type: joi.string().trim().required(),
});

export const createMeeting = joi.object({
  meetingUid: joi.string().trim().optional(),
  schoolId: joi.string().hex().trim().required(),
  gradeId: joi.string().hex().trim().required(),
  divisionId: joi.string().trim().required(),
  meetingName: joi.string().trim().required(),
  startDate: joi.any().required(),
  startTime: joi.any().required(),
  durationInHours: joi.string().trim().required(),
  durationInMinutes: joi.string().trim().required(),
});

export const uploadLernerByCsv = joi.object({
  schoolId: joi.string().hex().trim().required(),
  gradeId: joi.string().hex().trim().required(),
  divisionId: joi.string().hex().trim().required(),
});

export const disableCourseForTeacherLearner = joi.object({
  courseId: joi.string().hex().trim().required(),
  userId: joi.string().hex().trim().required(),
  courseType: joi.string().trim().required().valid("library", "teach"),
  userType: joi.string().trim().required().valid("teacher", "learner"),
});

export const deletePersonalCourseFromLearnersAndTeacher = joi.object({
  courseId: joi.string().hex().trim().required(),
  userId: joi.string().hex().trim().required(),
  courseType: joi.string().trim().required().valid("library"),
  userType: joi.string().trim().required().valid("teacher", "learner"),
  originalCourseId: joi.string().hex().length(24).required(),
});

export const addNotificationTimingValidate = joi.object({
  duration: joi.string().trim().required(),
  dayHourMonth: joi.string().trim().required().valid("DAYS", "HOURS", "MONTHS"),
});
