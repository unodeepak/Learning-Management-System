import mongoose from "mongoose";

const jioMeet = mongoose.Schema({
  meetingUid: { type: String, required: true },
  schoolId: { type: mongoose.Types.ObjectId, ref: "School", required: false },
  gradeId: { type: mongoose.Types.ObjectId, ref: "Grade", required: false },
  divisionId: {
    type: mongoose.Types.ObjectId,
    ref: "Division",
    required: false,
  },
  createdById: { type: mongoose.Types.ObjectId, ref: "User", required: false },
  meetingName: { type: String, required: true },
  startDate: { type: String, required: true },
  startTime: { type: String, required: true },
  durationInHours: { type: String, required: false },
  durationInMinutes: { type: String, required: false },
  action: { type: Boolean, default: false, required: false },
  meetingCompletedStatus: { type: Boolean, default: false, required: false },
  meetingId: { type: Number, default: null, required: false },
  host_email: { type: String, required: false },
  start_url: { type: String, default: null, required: false },
  join_url: { type: String, default: null, required: false },
  pstn_password: { type: String, default: null, required: false },
  encrypted_password: { type: String, default: null, required: false },
  password: { type: String, default: null, required: false },
  createdBy: { type: String, required: true, enum: ["Admin", "Teacher"] },
  createdOn: { type: Number, default: null },
  updatedOn: { type: Number, default: null },
  startDateAndTime: { type: String, default: null },
  lernerParticipants: [
    {
      participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Learner" },
      meetingJoined: { type: Boolean, default: false, required: false },
      createdOn: { type: Number, default: null },
      updatedOn: { type: Number, default: null },
    },
  ],
  teacherParticipants: [
    {
      participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      meetingJoined: { type: Boolean, default: false, required: false },
      createdOn: { type: Number, default: null },
      updatedOn: { type: Number, default: null },
    },
  ],
  recording: [
    {
      recordingName: { type: String, required: false },
      fileSize: { type: String, required: false },
      createdOn: { type: Number, default: null },
      updatedOn: { type: Number, default: null },
    },
  ],
});

jioMeet.index(
  { schoolId: -1, gradeId: -1, divisionId: -1 },
  { background: true }
);

export default mongoose.model("JioMeet", jioMeet);
