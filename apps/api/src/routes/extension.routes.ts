import { Router, type Router as ExpressRouter } from 'express';

export const extensionRouter: ExpressRouter = Router();

// Mock /getPendingJobs
extensionRouter.post('/getPendingJobs', (_req, res) => {
  // Return empty array to stop polling errors, or mock a job
  res.json({ jobs: [] });
});

// Mock /getAutofillPayload
extensionRouter.post('/getAutofillPayload', (_req, res) => {
  res.json({
    payload: {
      profile: {
        person: {
          name: { full: 'Rajesh Kumar', first: 'Rajesh', last: 'Kumar' },
          contact: { phone: '9876543210', email: 'rajesh@example.com' },
          dob: '1990-01-01',
          gender: 'MALE',
          identity: { aadhar: '123456789012', pan: 'ABCDE1234F' }
        }
      },
      selectors: {}
    }
  });
});

// Mock /claimJob
extensionRouter.post('/claimJob', (_req, res) => {
  res.json({ success: true });
});

// Mock /reportJobResult
extensionRouter.post('/reportJobResult', (_req, res) => {
  res.json({ success: true });
});
