const { z } = require('zod');

const archiveFileSchema = z.object({
  name: z
    .string({ error: 'File name is required' })
    .trim()
    .min(1, 'File name is required'),
});

function formatZodError(zodError) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return error;
}

function validateArchiveFile(body) {
  const result = archiveFileSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

module.exports = {
  validateArchiveFile,
};
