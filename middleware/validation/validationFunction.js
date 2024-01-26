import { log } from "console";
import {
  loginValidation,
  assessmentCreateValidation,
  assessmentEditValidation,
  assessmentAssignToGradeValidation,
  assessmentAssignToDivisionValidation,
  LearnerAssessmentValidation,
  courseCreateValidation,
  courseAssignToGradeValidation,
  courseAssignToDivisionValidation,
  courseAssignToLearnerValidation,
  courseAssignToTeacherValidation,
  divisionCreateValidation,
  divisionEditValidation,
  divisionRemoveFromCourseValidation,
  folderCreateValidation,
  gradeCreateValidation,
  gradeEditValidation,
  learnerCreateValidation,
  learnerEditValidation,
  skillCreateValidation,
  skillEditValidation,
  subFolderCreateValidation,
  subFolderTrackUpdateValidation,
  subSkillCreateValidation,
  subSkillEditValidation,
  schoolCreateValidation,
  schoolEditValidation,
  teacherCreateValidation,
  teacherEditValidation,
  // pdfUploadValidation,
  assignDivisionToTeacherValidation,
  forgotPasswordValidationForLerner,
  changePassValidationForLerner,
  getAssessmentForLernerById,
  createMeeting,
  uploadLernerByCsv,
  disableCourseForTeacherLearner,
  deletePersonalCourseFromLearnersAndTeacher,
  addNotificationTimingValidate,
} from "./validationSchema.js";

export const loginValidate = async (req, res, next) => {
  const { error } = loginValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const assessmentCreateValidate = async (req, res, next) => {
  const { error } = assessmentCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const assessmentEditValidate = async (req, res, next) => {
  const { error } = assessmentEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};
export const assessmentAssignToGradeValidate = async (req, res, next) => {
  const { error } = assessmentAssignToGradeValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};
export const assessmentAssignToDivisionValidate = async (req, res, next) => {
  const { error } = assessmentAssignToDivisionValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const LearnerAssessmentValidate = async (req, res, next) => {
  const { error } = LearnerAssessmentValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};
export const courseCreateValidate = async (req, res, next) => {
  const { error } = courseCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};
export const courseAssignToGradeValidate = async (req, res, next) => {
  const { error } = courseAssignToGradeValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const courseAssignToDivisionValidate = async (req, res, next) => {
  const { error } = courseAssignToDivisionValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const courseAssignToLearnerValidate = async (req, res, next) => {
  const { error } = courseAssignToLearnerValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const courseAssignToTeacherValidate = async (req, res, next) => {
  const { error } = courseAssignToTeacherValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const divisionRemoveFromCourseValidate = async (req, res, next) => {
  const { error } = divisionRemoveFromCourseValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const folderCreateValidate = async (req, res, next) => {
  const { error } = folderCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const divisionCreateValidate = async (req, res, next) => {
  const { error } = divisionCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const divisionEditValidate = async (req, res, next) => {
  const { error } = divisionEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const gradeCreateValidate = async (req, res, next) => {
  const { error } = gradeCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const gradeEditValidate = async (req, res, next) => {
  const { error } = gradeEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const learnerCreateValidate = async (req, res, next) => {
  const { error } = learnerCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const learnerEditValidate = async (req, res, next) => {
  const { error } = learnerEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const skillCreateValidate = async (req, res, next) => {
  const { error } = skillCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const skillEditValidate = async (req, res, next) => {
  const { error } = skillEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const subFolderCreateValidate = async (req, res, next) => {
  const { error } = subFolderCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const subFolderTrackUpdateValidate = async (req, res, next) => {
  const { error } = subFolderTrackUpdateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const subSkillCreateValidate = async (req, res, next) => {
  const { error } = subSkillCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const subSkillEditValidate = async (req, res, next) => {
  const { error } = subSkillEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const teacherCreateValidate = async (req, res, next) => {
  const { error } = teacherCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const teacherEditValidate = async (req, res, next) => {
  const { error } = teacherEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const schoolCreateValidate = async (req, res, next) => {
  const { error } = schoolCreateValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const schoolEditValidate = async (req, res, next) => {
  const { error } = schoolEditValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const assignDivisionToTeacherValidate = async (req, res, next) => {
  const { error } = assignDivisionToTeacherValidation.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const learnerForgotPasswordValidation = async (req, res, next) => {
  const { error } = forgotPasswordValidationForLerner.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  }
  next();
};

export const lernerChangePasswordValidation = async (req, res, next) => {
  const { error } = changePassValidationForLerner.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  }
  next();
};

export const getAssessmentByAssessmentIdForLerner = async (req, res, next) => {
  const { error } = getAssessmentForLernerById.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const createJioMeeting = async (req, res, next) => {
  const { error } = createMeeting.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const uploadLernerByCsvValidation = async (req, res, next) => {
  const { error } = uploadLernerByCsv.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const disableCourseForTeacherAndLearner = async (req, res, next) => {
  const { error } = disableCourseForTeacherLearner.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const PersonalCourseFromTeacherAndLearner = async (req, res, next) => {
  const { error } = deletePersonalCourseFromLearnersAndTeacher.validate(
    req.body
  );
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};

export const addNotificationTimingVali = async (req, res, next) => {
  const { error } = addNotificationTimingValidate.validate(req.body);
  if (error)
    return res
      .status(400)
      .json({ message: error?.details?.[0].message, status: false });
  next();
};
