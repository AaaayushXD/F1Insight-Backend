import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/models/User';
import { AuditLog } from '../../src/models/AuditLog';
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

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildOTPEmail: jest.fn().mockReturnValue('<p>OTP</p>'),
  buildWelcomeEmail: jest.fn().mockReturnValue('<p>Welcome</p>'),
}));

async function createAdmin() {
  const password = 'AdminP@ss1';
  const admin = await User.create({
    email: 'admin@f1insight.com',
    password: await hashPassword(password),
    name: 'Admin User',
    role: 'admin',
    isVerified: true,
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: admin.email,
    password,
  });

  return {
    user: admin,
    accessToken: loginRes.body.data.accessToken,
  };
}

async function createRegularUser(email = 'user@example.com') {
  const password = 'UserP@ss1';
  const user = await User.create({
    email,
    password: await hashPassword(password),
    name: 'Regular User',
    role: 'user',
    isVerified: true,
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: user.email,
    password,
  });

  return {
    user,
    accessToken: loginRes.body.data.accessToken,
  };
}

async function createModerator(email = 'moderator@example.com') {
  const password = 'ModP@ss1';
  const moderator = await User.create({
    email,
    password: await hashPassword(password),
    name: 'Moderator User',
    role: 'moderator',
    isVerified: true,
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: moderator.email,
    password,
  });

  return {
    user: moderator,
    accessToken: loginRes.body.data.accessToken,
  };
}

describe('Admin Endpoints', () => {
  describe('GET /api/admin/users', () => {
    it('returns paginated user list for admin', async () => {
      const { accessToken } = await createAdmin();
      await createRegularUser('user1@example.com');
      await createRegularUser('user2@example.com');

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeDefined();
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('returns 403 for non-admin user', async () => {
      const { accessToken } = await createRegularUser();

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('returns user details with prediction count', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      const res = await request(app)
        .get(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.predictionCount).toBeDefined();
      expect(typeof res.body.data.predictionCount).toBe('number');
    });

    it('returns 404 for non-existent user ID', async () => {
      const { accessToken } = await createAdmin();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('updates user role to moderator', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      const res = await request(app)
        .patch(`/api/admin/users/${user._id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'moderator' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('moderator');
      expect(res.body.data.previousRole).toBe('user');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.role).toBe('moderator');
    });

    it('creates an audit log entry', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      await request(app)
        .patch(`/api/admin/users/${user._id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'moderator' });

      const auditLog = await AuditLog.findOne({ action: 'role-change' });
      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('role-change');
      expect(auditLog?.resource).toBe('user');
      expect(auditLog?.details.targetUserId).toBeDefined();
      expect(auditLog?.details.previousRole).toBe('user');
      expect(auditLog?.details.newRole).toBe('moderator');
    });

    it('returns 400 for invalid role', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      const res = await request(app)
        .patch(`/api/admin/users/${user._id}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('soft-deletes a user', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      const res = await request(app)
        .delete(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('soft-deleted');

      // Use collection.findOne to bypass soft-delete filter
      const deletedUser = await User.collection.findOne({ _id: user._id });
      expect(deletedUser?.isDeleted).toBe(true);
      expect(deletedUser?.deletedAt).toBeDefined();
    });

    it('creates an audit log entry', async () => {
      const { accessToken } = await createAdmin();
      const { user } = await createRegularUser();

      await request(app)
        .delete(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const auditLog = await AuditLog.findOne({ action: 'user-deleted' });
      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('user-deleted');
      expect(auditLog?.resource).toBe('user');
      expect(auditLog?.details.deletedUserId).toBeDefined();
      expect(auditLog?.details.email).toBe(user.email);
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('returns paginated audit logs', async () => {
      const { accessToken } = await createAdmin();

      // Create some audit logs
      await AuditLog.create([
        {
          action: 'test-action-1',
          resource: 'test',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        {
          action: 'test-action-2',
          resource: 'test',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        {
          action: 'test-action-3',
          resource: 'test',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
      ]);

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toBeDefined();
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('works for moderator users too', async () => {
      const { accessToken } = await createModerator();

      await AuditLog.create({
        action: 'test-action',
        resource: 'test',
        details: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      });

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toBeDefined();
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns system statistics', async () => {
      const { accessToken } = await createAdmin();
      await createRegularUser('user1@example.com');
      await createRegularUser('user2@example.com');

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.users.total).toBeGreaterThan(0);
      expect(res.body.data.users.verified).toBeGreaterThan(0);
      expect(res.body.data.predictions).toBeDefined();
      expect(res.body.data.mlService).toBeDefined();
      expect(res.body.data.mlService.status).toBeDefined();
      expect(res.body.data.cache).toBeDefined();
    });
  });

  describe('POST /api/admin/notifications/broadcast', () => {
    it('sends notification to all verified users', async () => {
      const { accessToken } = await createAdmin();
      await createRegularUser('user1@example.com');
      await createRegularUser('user2@example.com');
      await createRegularUser('user3@example.com');

      const res = await request(app)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight at 10 PM',
          type: 'system',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('users');

      const notificationCount = await Notification.countDocuments();
      expect(notificationCount).toBeGreaterThanOrEqual(3);

      const notification = await Notification.findOne({
        title: 'System Maintenance',
      });
      expect(notification).toBeDefined();
      expect(notification?.message).toBe('Scheduled maintenance tonight at 10 PM');
      expect(notification?.type).toBe('system');
    });

    it('moderator can also broadcast', async () => {
      const { accessToken } = await createModerator();
      await createRegularUser('user1@example.com');

      const res = await request(app)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Race Alert',
          message: 'Next race starts in 1 hour',
          type: 'race',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/cache/flush', () => {
    it('flushes cache successfully', async () => {
      const { accessToken } = await createAdmin();

      const res = await request(app)
        .post('/api/admin/cache/flush')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Cache flushed');
    });
  });
});
