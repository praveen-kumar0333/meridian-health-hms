Meridian Health HMS 🏥

Hospital Management System

Modern Healthcare. Connected Care.

Meridian Health is a web-based Hospital Management System designed to connect hospital administrators, doctors, and patients through a centralized platform. It simplifies hospital operations by providing dedicated dashboards, appointment management, medical records, billing, bed management, emergency coordination, and doctor–patient communication.

🌐 Live Application: https://meridian-health-hms.vercel.app

⚙️ Backend API: https://meridian-health-hms.onrender.com

📂 GitHub Repository: https://github.com/praveen-kumar0333/meridian-health-hms

---

✨ Key Features

👨‍💼 Admin Portal

- Admin dashboard with hospital activity overview.
- Patient and doctor management.
- Appointment monitoring and management.
- Medical records management.
- Billing and revenue analytics.
- Hospital bed inventory and allocation management.
- Emergency request monitoring and coordination.
- Notifications management.

🩺 Doctor Portal

- Dedicated doctor dashboard.
- View assigned patients.
- Manage appointments.
- Access patient medical records.
- Manage prescriptions.
- Manage doctor availability.
- Communicate with assigned patients.
- Receive notifications.

🧑‍⚕️ Patient Portal

- Patient registration and login.
- Personalized patient dashboard.
- Appointment booking.
- View medical records and prescriptions.
- Access billing information.
- Submit emergency assistance requests.
- Communicate with assigned doctors.
- Receive notifications.

🔐 Authentication & Security

- Role-based access control (RBAC).
- Separate Admin, Doctor, and Patient experiences.
- Secure password hashing using bcryptjs.
- JWT-based authentication.
- HTTP-only authentication cookies.
- Backend-protected API routes.
- Patient data ownership restrictions.
- Doctor assignment-based access restrictions.
- CORS configuration for trusted frontend origins.

🛏️ Additional Modules

- Bed Management: Track bed inventory and allocations.
- Emergency Coordination: Submit and manage emergency requests.
- Doctor–Patient Messaging: Communication between assigned doctors and patients.
- Revenue Analytics: Analyze billing and revenue information.

---

🛠️ Technology Stack

Category| Technologies
Frontend| React.js, JavaScript, JSX, Vite
Styling| CSS
Backend| Node.js, Express.js
Database| MongoDB Atlas
ODM| Mongoose
Authentication| JWT, bcryptjs
API Communication| REST API
Frontend Hosting| Vercel
Backend Hosting| Render
Version Control| Git, GitHub

---

🏗️ Project Architecture

Meridian-Health-HMS/                           
│                                               
├── backend/                                  
│   ├── config/                                
│   ├── controllers/                            
│   ├── middleware/                                           
│   ├── models/                                 
│   ├── routes/                                
│   ├── utils/                                                                 
│   ├── app.js                                 
│   ├── server.js                               
│   └── package.json                            
│                                               
├── frontend/                                   
│   ├── src/                                    
│   │   ├── components/                       
│   │   ├── pages/                             
│   │   ├── layouts/                            
│   │   ├── context/                            
│   │   └── ...                                  
│   └── package.json                          
│                                              
└── README.md                                      

The structure above illustrates the main project organization; individual folders may contain additional files.

---

⚙️ Installation and Setup

Prerequisites

- Node.js
- npm
- MongoDB Atlas account
- Git

1. Clone the repository

git clone https://github.com/praveen-kumar0333/meridian-health-hms.git

cd meridian-health-hms

2. Configure the Backend

cd backend
npm install

Create a ".env" file inside the backend directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_secret
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

Keep environment variables private. Never commit ".env" files or credentials to GitHub.

3. Start the Backend

npm start

Backend runs locally on the configured port.

4. Configure the Frontend

Open another terminal:

cd frontend
npm install

Create a ".env" file in the frontend directory:

VITE_API_URL=http://localhost:5000

5. Start the Frontend

npm run dev

Open the local URL provided by Vite in your browser.

---

🌍 Deployment

The application is deployed using:

Component| Platform
Frontend| Vercel
Backend| Render
Database| MongoDB Atlas

Production URLs

- Website: https://meridian-health-hms.vercel.app
- Login: https://meridian-health-hms.vercel.app/login
- API Health Check: https://meridian-health-hms.onrender.com/api/health

Production Environment Variables

Configure the required environment variables in the hosting platforms.

Backend (Render):

- "MONGO_URI"
- "JWT_SECRET"
- "CLIENT_URL"
- "ADMIN_EMAIL"
- "ADMIN_PASSWORD"

Frontend (Vercel):

- "VITE_API_URL"

Never expose secret values in frontend code or public repositories.

---

🔒 Security Considerations

- Authentication and authorization are enforced by the backend.
- Passwords are stored using secure password hashing.
- JWT authentication uses HTTP-only cookies.
- Protected resources require appropriate user roles.
- Patient information is restricted according to access permissions.
- Database credentials and authentication secrets must remain private.

Important: Emergency requests provide manual hospital coordination through the application. They do not automatically dispatch an ambulance. For life-threatening emergencies in India, call 112. Patient–doctor messaging is not an emergency response channel.

---

🎯 Project Objectives

1. Digitize essential hospital management operations.
2. Provide separate and secure portals for hospital administrators, doctors, and patients.
3. Simplify appointment scheduling and patient management.
4. Centralize medical records and billing information.
5. Improve hospital bed and emergency request coordination.
6. Enable communication between doctors and their assigned patients.
7. Provide a responsive and accessible healthcare management interface.

---

🚀 Future Improvements

Potential future enhancements include:

- Advanced hospital analytics and reporting.
- Improved appointment scheduling.
- Additional notification integrations.
- Enhanced audit and monitoring capabilities.
- Further accessibility and usability improvements.

---

👨‍💻 Developer

Praveen Kumar

B.Tech – Artificial Intelligence and Data Science

- GitHub: https://github.com/praveen-kumar0333
- LinkedIn: https://www.linkedin.com/in/praveen-kumar-865100369/

---

📄 License

No open-source license has currently been specified for this repository. All rights are reserved by the project owner unless a license is added.

---

Meridian Health HMS — Modern Healthcare. Connected Care.
