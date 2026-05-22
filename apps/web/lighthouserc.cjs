module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm -F @apexpredix/web start',
      url: ['http://localhost:3000/en', 'http://localhost:3000/en/predictions/featured-1', 'http://localhost:3000/en/premium'],
      numberOfRuns: 2,
      settings: { preset: 'mobile', formFactor: 'mobile' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
