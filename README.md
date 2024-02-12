# Learning Management System (LMS) Project

This project is a Learning Management System (LMS) aimed at facilitating online education and course management. It provides functionalities for administrators, normal users, and teachers to manage various aspects of the system.

## Features

- **User Roles:**
  - **Admin:** Admin users have full control over the system, including user management, course creation, and content moderation.
  - **Normal User:** Normal users can enroll in courses, view content, and interact with teachers.
  - **Teacher:** Teachers have the ability to create courses, upload content, and interact with enrolled students.

- **Content Management:**
  - **Courses:** Create, update, and delete courses.
  - **Lessons:** Organize course content into lessons.
  - **Assignments:** Assign tasks and assessments to students.
  - **Skills and Sub-skills:** Define and categorize skills and sub-skills for better course organization.

## Technologies Used

- **Node.js:** JavaScript runtime for server-side development.
- **Express.js:** Web application framework for Node.js used for building APIs.
- **MongoDB:** NoSQL database for storing user data, course content, and system configurations.
- **RabbitMQ:** Message broker for handling asynchronous tasks such as notifications and background processing.
- **AWS (Amazon Web Services):** Cloud services provider for hosting the application, storing media files, and managing user authentication.

## Installation

1. Clone the repository: `git clone https://github.com/unodeepak/Learning-Management-System`
2. Install dependencies: `npm install`
3. Set up MongoDB and RabbitMQ instances.
4. Configure AWS credentials for file storage and authentication.
5. Start the application: `npm start`

## Usage

1. Access the application through the provided URL.
2. Sign up for an account and choose your user role (Admin, Normal User, or Teacher).
3. Depending on your role, explore the functionalities available such as creating courses, enrolling in courses, managing assignments, etc.

## Contributing

Contributions are welcome! Feel free to submit bug reports, feature requests, or pull requests.
