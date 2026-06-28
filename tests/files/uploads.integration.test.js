const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const filesRepository = require('../../src/modules/files/repositories');
const {
  getAuthToken,
  validRegisterPayload,
  VALID_PASSWORD,
  getLatestOtp,
  JPEG_BYTES,
} = require('../helpers');
const { OTP_PURPOSES } = require('../../src/constants/otp');

const API = '/api/v1';

async function getSecondUserToken() {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'john',
        email: 'john@example.com',
      }),
    );

  await request(app)
    .post(`${API}/auth/verify-email`)
    .send({
      email: 'john@example.com',
      otp: getLatestOtp('john@example.com', OTP_PURPOSES.VERIFY_EMAIL),
    });

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'john', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}

describe('POST /uploads', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(response.status).toBe(401);
  });

  it('returns 400 when visibility is missing', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual([
      { field: 'visibility', message: 'visibility is required' },
    ]);
  });

  it('returns 400 when no files are sent', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one file is required');
  });

  it('uploads multiple public files and returns metadata for each', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo-one.jpg')
      .attach('files', JPEG_BYTES, 'photo-two.jpg');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Files uploaded successfully');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9]{24}$/),
      originalName: 'photo-one.jpg',
      mimeType: 'image/jpeg',
      encoding: '7bit',
      size: expect.any(Number),
      provider: 'local',
      visibility: 'public',
      name: expect.stringMatching(/^[a-f0-9]{32}\.jpg$/),
      url: expect.stringMatching(/\/uploads\/public\/[a-f0-9]{32}\.jpg$/),
    });
    expect(response.body.data[0].downloadUrl).toBeUndefined();
    expect(response.body.data[1].originalName).toBe('photo-two.jpg');

    const filePath = path.join(
      config.upload.local.publicDirectory,
      response.body.data[0].name,
    );
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('removes stored files when the database write fails', async () => {
    const token = await getAuthToken(app);
    const filesBefore = fs.readdirSync(config.upload.local.publicDirectory);
    const createManySpy = vi
      .spyOn(filesRepository, 'createMany')
      .mockRejectedValueOnce(new Error('db failed'));

    const response = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    createManySpy.mockRestore();

    expect(response.status).toBe(500);

    const filesAfter = fs.readdirSync(config.upload.local.publicDirectory);
    expect(filesAfter).toEqual(filesBefore);
  });

  it('returns 400 for disallowed file types', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', Buffer.from('not an image'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/File type not allowed/);
  });
});

describe('DELETE /uploads/:fileId', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app).delete(
      `${API}/uploads/a1b2c3d4e5f678901234567890abcd12.jpg`,
    );

    expect(response.status).toBe(401);
  });

  it('archives an uploaded file by name and removes it from active storage', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(uploadResponse.status).toBe(201);

    const { id, name } = uploadResponse.body.data[0];
    const activePath = path.join(config.upload.local.publicDirectory, name);
    const archivePath = path.join(config.upload.local.archiveDirectory, name);

    expect(fs.existsSync(activePath)).toBe(true);

    const archiveResponse = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.message).toBe('File archived successfully');
    expect(archiveResponse.body.data).toEqual({
      id,
      name,
      archivedName: `_archive/${name}`,
      provider: 'local',
      visibility: 'public',
    });
    expect(fs.existsSync(activePath)).toBe(false);
    expect(fs.existsSync(archivePath)).toBe(true);

    const publicResponse = await request(app).get(`/uploads/public/${name}`);
    expect(publicResponse.status).toBe(404);
  });

  it('archives an uploaded file by id', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { id, name } = uploadResponse.body.data[0];

    const archiveResponse = await request(app)
      .delete(`${API}/uploads/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.data.id).toBe(id);
    expect(fs.existsSync(path.join(config.upload.local.publicDirectory, name))).toBe(
      false,
    );
  });

  it('returns 404 when another user tries to archive the file', async () => {
    const ownerToken = await getAuthToken(app);
    const otherToken = await getSecondUserToken();

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { name } = uploadResponse.body.data[0];

    const response = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });

  it('restores active storage when the database update fails', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=public`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { name } = uploadResponse.body.data[0];
    const activePath = path.join(config.upload.local.publicDirectory, name);
    const markArchivedSpy = vi
      .spyOn(filesRepository, 'markArchived')
      .mockRejectedValueOnce(new Error('db failed'));

    const response = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${token}`);

    markArchivedSpy.mockRestore();

    expect(response.status).toBe(500);
    expect(fs.existsSync(activePath)).toBe(true);
    expect(
      fs.existsSync(path.join(config.upload.local.archiveDirectory, name)),
    ).toBe(false);
  });

  it('returns 404 when archiving a file that does not exist', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .delete(`${API}/uploads/a1b2c3d4e5f678901234567890abcd12.jpg`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });
});

describe('private file access', () => {
  it('returns downloadUrl, blocks anonymous access, and allows owner download', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=private`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'protected.jpg');

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.data[0].url).toMatch(
      /\/uploads\/private\/[a-f0-9]{32}\.jpg$/,
    );
    expect(uploadResponse.body.data[0].downloadUrl).toMatch(
      /\/api\/v1\/uploads\/[a-f0-9]{24}\/download$/,
    );

    const downloadPath = new URL(
      uploadResponse.body.data[0].downloadUrl,
    ).pathname;
    const fileName = uploadResponse.body.data[0].name;

    const unauthenticated = await request(app).get(downloadPath);
    expect(unauthenticated.status).toBe(401);

    const publicStatic = await request(app).get(`/uploads/private/${fileName}`);
    expect(publicStatic.status).toBe(404);

    const authenticated = await request(app)
      .get(downloadPath)
      .set('Authorization', `Bearer ${token}`);

    expect(authenticated.status).toBe(200);
    expect(authenticated.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns 404 when another user tries to download the file', async () => {
    const ownerToken = await getAuthToken(app);
    const otherToken = await getSecondUserToken();

    const uploadResponse = await request(app)
      .post(`${API}/uploads?visibility=private`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', JPEG_BYTES, 'protected-other.jpg');

    expect(uploadResponse.status).toBe(201);

    const downloadPath = new URL(
      uploadResponse.body.data[0].downloadUrl,
    ).pathname;

    const response = await request(app)
      .get(downloadPath)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });
});
