const fs = require('fs');
const path = require('path');

// Path to the environment file where we will inject the version
const environmentFilePath = path.join(__dirname, 'src/environments/environment.ts');

// Read the version from package.json
const { version } = require('./package.json');

// Read the current environment file
let environmentFileContent = fs.readFileSync(environmentFilePath, 'utf-8');

// Replace the version in environment.ts with the one from package.json
environmentFileContent = environmentFileContent.replace(/appVersion: '.*?'/, `appVersion: '${version}'`);

// Write the updated content back to the environment file
fs.writeFileSync(environmentFilePath, environmentFileContent);

console.log(`Updated appVersion to ${version} in environment.ts`);
