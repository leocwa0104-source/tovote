const { execSync } = require('child_process');

console.log('--- Starting Database Synchronization ---');
console.log('Attempting to push schema changes to the database...');

try {
  // Use npx to ensure we're using the project's prisma
  // --accept-data-loss: Automatically confirms schema changes that might result in data loss
  // --skip-generate: We already run generate in postinstall, so skip it here to save time
  execSync('npx prisma db push --accept-data-loss --skip-generate', { 
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' } // Force color output for better readability in logs
  });
  console.log('--- Database Synchronization Successful ---');
} catch (error) {
  console.error('--- Database Synchronization FAILED ---');
  console.error('Error details:', error.message);
  console.error('WARNING: The application will build, but runtime errors may occur if the database schema is outdated.');
  console.error('Please check your DATABASE_URL environment variable and database connection settings in Vercel.');
  // We do NOT exit with error code here to allow the build to proceed
  // This helps distinguish between build failures and database connection issues
}
