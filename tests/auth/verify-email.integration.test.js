const request = require('supertest');
const app = require('../../src/app');
const { OTP_PURPOSES } = require('../../src/constants/otp');
const { sentOtps } = require('../../src/utils/mail');
const {
  validRegisterPayload,
  VALID_PASSWORD,
  getLatestOtp,
  verifyRegisteredUser,
} = require('../helpers');

const API = '/api/v1';

describe('Email verification API', () => {
  beforeEach(() => {
    sentOtps.length = 0;
  });

  describe('POST /auth/register', () => {
    it('sends a verification OTP and returns an unverified user', async () => {
      const response = await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/verification code has been sent/i);
      expect(response.body.data.emailVerified).toBe(false);
      expect(sentOtps).toHaveLength(1);
      expect(sentOtps[0]).toMatchObject({
        to: 'jane@example.com',
        purpose: OTP_PURPOSES.VERIFY_EMAIL,
        otp: expect.stringMatching(/^\d{6}$/),
      });
    });
  });

  describe('POST /auth/verify-email', () => {
    beforeEach(async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());
    });

    it('verifies the email with a valid OTP', async () => {
      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified successfully');
      expect(response.body.data.emailVerified).toBe(true);
    });

    it('returns 400 for an invalid OTP', async () => {
      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });

    it('locks out after too many invalid OTP attempts', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await request(app)
          .post(`${API}/auth/verify-email`)
          .send({ email: 'jane@example.com', otp: '000000' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid or expired verification code');
      }

      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });

    it('returns 400 when email is already verified', async () => {
      await verifyRegisteredUser(app);

      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp: otp || '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email is already verified');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('sends another verification OTP for an unverified user', async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      sentOtps.length = 0;

      const response = await request(app)
        .post(`${API}/auth/resend-verification`)
        .send({ email: 'jane@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/verification code has been sent/i);
      expect(sentOtps).toHaveLength(1);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 403 when email is not verified', async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      const response = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Email not verified');
    });

    it('allows login after email verification', async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      await verifyRegisteredUser(app);

      const response = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toEqual(expect.any(String));
    });
  });
});
