import { afterAll, beforeAll } from 'bun:test';

beforeAll(() => {
  console.log('Setting up test environment...');
});

afterAll(() => {
  console.log('Cleaning up test environment...');
});
