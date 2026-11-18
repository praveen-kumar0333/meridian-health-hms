// import express from 'express';
// import cors from 'cors';
// import { getDbStatus } from './config/db.js';
// import authRoutes from './routes/authRoutes.js';
// import dashboardRoutes from './routes/dashboardRoutes.js';
// import patientRoutes from './routes/patientRoutes.js';
// import doctorRoutes from './routes/doctorRoutes.js';
// import appointmentRoutes from './routes/appointmentRoutes.js';
// import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
// import billingRoutes from './routes/billingRoutes.js';
// import notificationRoutes from './routes/notificationRoutes.js';
// import emergencyRoutes from './routes/emergencyRoutes.js';
// import bedRoutes from './routes/bedRoutes.js';
// import chatRoutes from './routes/chatRoutes.js';
// import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// export const createApiRouter = () => {
//   const api = express.Router();

//   api.use(express.json({ limit: '2mb' }));
//   api.use(express.urlencoded({ extended: true }));

//   api.get('/health', (req, res) => {
//     const db = getDbStatus();
//     res.status(200).json({
//       success: true,
//       service: 'Meridian Health HMS API',
//       database: db,
//     });
//   });

//   api.use('/auth', authRoutes);
//   api.use('/dashboard', dashboardRoutes);
//   api.use('/patients', patientRoutes);
//   api.use('/doctors', doctorRoutes);
//   api.use('/appointments', appointmentRoutes);
//   api.use('/medical-records', medicalRecordRoutes);
//   api.use('/billing', billingRoutes);
//   api.use('/notifications', notificationRoutes);
//   api.use('/emergency', emergencyRoutes);
//   api.use('/beds', bedRoutes);
//   api.use('/chat', chatRoutes);

//   api.use(notFound);
//   api.use(errorHandler);

//   return api;
// };

// export const createBackendApp = () => {
//   const app = express();
//   app.set('trust proxy', 1);

//   const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
//     .split(',')
//     .map((o) => o.trim())
//     .filter(Boolean);

//   const allowedOrigins = new Set([
//     ...envOrigins,
//     'http://localhost:3000',
//     'http://localhost:5173',
//   ]);

//   app.use(
//     cors({
//       origin: (origin, callback) => {
//         if (!origin || allowedOrigins.has(origin)) {
//           callback(null, true);
//         } else {
//           callback(new Error('Not allowed by CORS'));
//         }
//       },
//       credentials: true,
//     })
//   );

//   app.use('/api', createApiRouter());

//   return app;
// };




export const createBackendApp = () => {
  const app = express();
  app.set('trust proxy', 1);

  const envOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = new Set([
    ...envOrigins,
    'https://meridian-health-hms.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        console.error('CORS rejected origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 204,
    })
  );

  app.use('/api', createApiRouter());

  return app;
};
