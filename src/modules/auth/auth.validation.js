const { z } = require('zod');

const emailField = z.pipe(
  z.string({ error: 'Email is required' }).trim(),
  z.email('Invalid email address'),
);

const registerSchema = z.object({
  firstName: z.string({ error: 'First name is required' }).trim(),
  lastName: z.string({ error: 'Last name is required' }).trim(),
  username: z
    .string({ error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  email: emailField,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  identifier: z
    .string({ error: 'Email or username is required' })
    .trim()
    .min(2, 'Email or username must be at least 2 character'),
  password: z.string({ error: 'Password is required' }),
});

function isEmail(value) {
  return z.email().safeParse(value).success;
}

function formatZodError(zodError) {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  const error = new Error(details[0]?.message || 'Validation failed');
  error.statusCode = 400;
  error.details = details;

  return error;
}

function validateRegister(body) {
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateLogin(body) {
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

module.exports = {
  validateRegister,
  validateLogin,
  isEmail,
};
