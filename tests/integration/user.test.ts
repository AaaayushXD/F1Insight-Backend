import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/models/User';
import { Notification } from '../../src/models/Notification';
import { hashPassword } from '../../src/utils/hash';

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Mock email service
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildOTPEmail: jest.fn().mockReturnValue('<p>OTP</p>'),
  buildWelcomeEmail: jest.fn().mockReturnValue('<p>Welcome</p>'),
}));

async function createAuthenticatedUser(overrides = {}) {
  const password = 'StrongP@ss1';
  const user = await User.create({
    email: 'test@example.com',
    password: await hashPassword(password),
    name: 'Test User',
    isVerified: true,
    ...overrides,
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: user.email,
    password,
  });

  return {
    user,
    accessToken: loginRes.body.data.accessToken,
    cookies: loginRes.headers['set-cookie'],
  };
}

describe('User Management Endpoints', () => {
  describe('GET /api/users/me', () => {
    it('returns profile with stats for authenticated user', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.name).toBe('Test User');
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.totalPredictions).toBeDefined();
      expect(typeof res.body.data.stats.totalPredictions).toBe('number');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates name and favoriteDriver', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          favoriteDriver: 'verstappen',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.favoriteDriver).toBe('verstappen');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.favoriteDriver).toBe('verstappen');
    });

    it('ignores non-allowed fields like email or role', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          email: 'hacker@example.com',
          role: 'admin',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.email).toBe(user.email); // Email should not change
      expect(updatedUser?.role).toBe('user'); // Role should not change
    });
  });

  describe('PATCH /api/users/me/preferences', () => {
    it('updates theme and alert preferences', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const res = await request(app)
        .patch('/api/users/me/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'dark',
          raceAlerts: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preferences.theme).toBe('dark');
      expect(res.body.data.preferences.raceAlerts).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.preferences.theme).toBe('dark');
      expect(updatedUser?.preferences.raceAlerts).toBe(true);
    });
  });

  describe('PATCH /api/users/me/password', () => {
    it('changes password with correct current password', async () => {
      const { accessToken, user } = await createAuthenticatedUser();
      const currentPassword = 'StrongP@ss1';
      const newPassword = 'NewStrongP@ss2';

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user can login with new password
      const loginRes = await request(app).post('/api/auth/login').send({
        email: user.email,
        password: newPassword,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('returns 401 for wrong current password', async () => {
      const { accessToken } = await createAuthenticatedUser();

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewStrongP@ss2',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/users/me', () => {
    it('soft deletes account', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Use collection.findOne to bypass mongoose soft-delete filter
      const deletedUser = await User.collection.findOne({ _id: user._id });
      expect(deletedUser?.isDeleted).toBe(true);
      expect(deletedUser?.deletedAt).toBeDefined();
    });
  });
});

describe('Notification Endpoints', () => {
  describe('GET /api/notifications', () => {
    it('returns paginated notifications', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      // Create 3 notifications for the user
      await Notification.create([
        {
          userId: user._id,
          type: 'race',
          title: 'Race Alert 1',
          message: 'Race starting soon',
          isRead: false,
        },
        {
          userId: user._id,
          type: 'prediction',
          title: 'Prediction Result',
          message: 'Your prediction was correct',
          isRead: false,
        },
        {
          userId: user._id,
          type: 'system',
          title: 'System Update',
          message: 'New features available',
          isRead: true,
        },
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(3);
      expect(res.body.data.unreadCount).toBe(2);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const notification = await Notification.create({
        userId: user._id,
        type: 'race',
        title: 'Race Alert',
        message: 'Race starting soon',
        isRead: false,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.isRead).toBe(true);
    });
  });

  describe('PATCH /api/notifications/:id/pin', () => {
    it('toggles pin on notification', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const notification = await Notification.create({
        userId: user._id,
        type: 'race',
        title: 'Race Alert',
        message: 'Race starting soon',
        isPinned: false,
      });

      // Pin it
      const res1 = await request(app)
        .patch(`/api/notifications/${notification._id}/pin`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      let updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.isPinned).toBe(true);

      // Unpin it
      const res2 = await request(app)
        .patch(`/api/notifications/${notification._id}/pin`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res2.status).toBe(200);

      updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification?.isPinned).toBe(false);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('marks all as read', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      // Create 3 unread notifications
      await Notification.create([
        {
          userId: user._id,
          type: 'race',
          title: 'Race Alert 1',
          message: 'Message 1',
          isRead: false,
        },
        {
          userId: user._id,
          type: 'prediction',
          title: 'Prediction Result',
          message: 'Message 2',
          isRead: false,
        },
        {
          userId: user._id,
          type: 'system',
          title: 'System Update',
          message: 'Message 3',
          isRead: false,
        },
      ]);

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify all are read
      const notifications = await Notification.find({ userId: user._id });
      expect(notifications).toHaveLength(3);
      notifications.forEach((notif) => {
        expect(notif.isRead).toBe(true);
      });
    });
  });

  describe('DELETE /api/notifications/clear', () => {
    it('clears non-pinned notifications', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      // Create 2 normal + 1 pinned notification
      await Notification.create([
        {
          userId: user._id,
          type: 'race',
          title: 'Normal 1',
          message: 'Message 1',
          isPinned: false,
        },
        {
          userId: user._id,
          type: 'prediction',
          title: 'Normal 2',
          message: 'Message 2',
          isPinned: false,
        },
        {
          userId: user._id,
          type: 'system',
          title: 'Pinned',
          message: 'Message 3',
          isPinned: true,
        },
      ]);

      const res = await request(app)
        .delete('/api/notifications/clear')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify only pinned remains
      const remainingNotifications = await Notification.find({ userId: user._id });
      expect(remainingNotifications).toHaveLength(1);
      expect(remainingNotifications[0].isPinned).toBe(true);
      expect(remainingNotifications[0].title).toBe('Pinned');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('deletes a specific notification', async () => {
      const { accessToken, user } = await createAuthenticatedUser();

      const notification = await Notification.create({
        userId: user._id,
        type: 'race',
        title: 'Race Alert',
        message: 'Race starting soon',
      });

      const res = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify notification is deleted
      const deletedNotification = await Notification.findById(notification._id);
      expect(deletedNotification).toBeNull();
    });
  });
});
