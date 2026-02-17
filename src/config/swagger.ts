import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'F1Insight Backend API',
      version: '1.0.0',
      description:
        'REST API for F1Insight — bridges the React frontend with the ML prediction service. Handles authentication, user management, F1 data proxy, and ML prediction orchestration.',
      contact: {
        name: 'F1Insight',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from /api/auth/login or /api/auth/verify',
        },
      },
      schemas: {
        UserPublic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'moderator', 'admin'] },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & authorization endpoints' },
      { name: 'User', description: 'User profile & preferences' },
      { name: 'F1 Data', description: 'Ergast API proxy with caching' },
      { name: 'Predictions', description: 'ML prediction endpoints' },
      { name: 'Strategy', description: 'Race strategy recommendations' },
      { name: 'Notifications', description: 'User notification management' },
      { name: 'Admin', description: 'Admin-only operations' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
