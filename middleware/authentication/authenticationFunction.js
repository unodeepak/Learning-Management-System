import userModal from "../../modals/userModal.js";
import jwt from "jsonwebtoken";

export const accessAuthentication = async (req, res, next) => {
  const { userId } = req.user;
  const userExists = await userModal.findById(userId);
  if (!userExists) {
    return res.status(401).json({ message: "no user found", status: false });
  }

  if (
    !!userExists === true &&
    "disable" in userExists &&
    userExists["disable"] === true
  )
    return res.status(400).json({
      message: "Your access has been blocked, please contact the administrator",
      status: false,
      disable: true,
    });
  next();
};

export const tokenVerification = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.jwtKey, (err, user) => {
      if (err) {
        return res
          .status(403)
          .send({ message: "Access forbidden", status: false });
      }

      req.user = { userId: user.userId, userRole: user.userRole };

      next();
    });
  } else {
    res
      .status(400)
      .send({ status: false, message: "Authorization header missing" });
  }
};

export const isAdmin = async (req, res, next) => {
  const user = req.user;
  if (user) {
    if (user.userRole === 1) {
      next();
    } else {
      return res
        .status(403)
        .send({ message: "Only Admin can access this route", status: false });
    }
  } else {
    return res
      .status(403)
      .send({ message: "User is missing from request body", status: false });
  }
};

export const isTeacher = async (req, res, next) => {
  const user = req.user;

  if (user) {
    if (user.userRole === 2) {
      next();
    } else {
      return res
        .status(403)
        .send({ message: "Only Teacher can access this route", status: false });
    }
  } else {
    return res
      .status(403)
      .send({ message: "User is missing from request body", status: false });
  }
};

export const isLearner = async (req, res, next) => {
  const user = req.user;
  if (user) {
    if (user.userRole === 3) {
      next();
    } else {
      return res
        .status(403)
        .send({ message: "Only Learner can access this route", status: false });
    }
  } else {
    return res
      .status(403)
      .send({ message: "User is missing from request body", status: false });
  }
};

export const isAdmin_Teacher = async (req, res, next) => {
  const user = req.user;

  if (user) {
    if (user.userRole === 1 || user.userRole === 2) {
      next();
    } else {
      return res.status(403).send({
        message: "Only Admin/Teacher can access this route",
        status: false,
      });
    }
  } else {
    return res
      .status(403)
      .send({ message: "User is missing from request body", status: false });
  }
};

export const isAdmin_Teacher_Learner = async (req, res, next) => {
  const user = req.user;

  if (user) {
    if (user.userRole === 1 || user.userRole === 2 || user.userRole === 3) {
      next();
    } else {
      return res.status(403).send({
        status: false,
        message: "Only Admin/Teacher/Learner can access this route",
      });
    }
  } else {
    return res
      .status(403)
      .send({ status: false, message: "User is missing from request body" });
  }
};

export const Teacher_Learner = async (req, res, next) => {
  const user = req.user;

  if (user) {
    if (user.userRole === 2 || user.userRole === 3) {
      next();
    } else {
      return res.status(403).send({
        status: false,
        message: "Teacher/Learner can access this route",
      });
    }
  } else {
    return res
      .status(403)
      .send({ status: false, message: "User is missing from request body" });
  }
};
