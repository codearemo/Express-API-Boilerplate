const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const { getAuthToken } = require('../helpers');

const API = '/api/v1';

// Minimal valid JPEG header bytes for mime detection in tests
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

describe('POST /uploads', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post(`${API}/uploads`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(response.status).toBe(401);
  });

  it('returns 400 when no files are sent', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one file is required');
  });

  it('uploads multiple files and returns metadata for each', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo-one.jpg')
      .attach('files', JPEG_BYTES, 'photo-two.jpg');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Files uploaded successfully');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      originalName: 'photo-one.jpg',
      mimeType: 'image/jpeg',
      encoding: '7bit',
      size: expect.any(Number),
      provider: 'local',
      name: expect.stringMatching(/^[a-f0-9]{32}\.jpg$/),
      url: expect.stringMatching(/\/uploads\/[a-f0-9]{32}\.jpg$/),
    });
    expect(response.body.data[1].originalName).toBe('photo-two.jpg');

    const filePath = path.join(
      config.upload.local.directory,
      response.body.data[0].name,
    );
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns 400 for disallowed file types', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', Buffer.from('not an image'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/File type not allowed/);
  });
});

describe('POST /uploads/archive', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post(`${API}/uploads/archive`)
      .send({ name: 'a1b2c3d4e5f678901234567890abcd12.jpg' });

    expect(response.status).toBe(401);
  });

  it('archives an uploaded file and removes it from active storage', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(uploadResponse.status).toBe(201);

    const { name } = uploadResponse.body.data[0];
    const activePath = path.join(config.upload.local.directory, name);
    const archivePath = path.join(config.upload.local.archiveDirectory, name);

    expect(fs.existsSync(activePath)).toBe(true);

    const archiveResponse = await request(app)
      .post(`${API}/uploads/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name });

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.message).toBe('File archived successfully');
    expect(archiveResponse.body.data).toEqual({
      name,
      archivedName: `_archive/${name}`,
      provider: 'local',
    });
    expect(fs.existsSync(activePath)).toBe(false);
    expect(fs.existsSync(archivePath)).toBe(true);

    const publicResponse = await request(app).get(`/uploads/${name}`);
    expect(publicResponse.status).toBe(404);
  });

  it('returns 404 when archiving a file that does not exist', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'a1b2c3d4e5f678901234567890abcd12.jpg' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });

  it('returns 400 when name is missing', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});
