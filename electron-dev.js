// Helper script to run Electron in development mode
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

process.env.NODE_ENV = 'development';

// Function to check if Vite dev server is ready
function waitForVite(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      http.get(`http://localhost:${port}`, (res) => {
        console.log(`Vite dev server is ready on port ${port}`);
        resolve(port);
      }).on('error', (err) => {
        if (attempts >= maxAttempts) {
          reject(new Error('Vite dev server failed to start'));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    
    check();
  });
}

// Try common ports
async function findVitePort() {
  const ports = [3000, 3001, 3002, 3003];
  
  for (const port of ports) {
    try {
      await waitForVite(port, 3);
      return port;
    } catch (e) {
      continue;
    }
  }
  
  throw new Error('Could not find Vite dev server on any port');
}

// Wait for Vite and then start Electron
findVitePort()
  .then((port) => {
    process.env.VITE_DEV_SERVER_URL = `http://localhost:${port}`;
    
    const electron = spawn(
      require('electron'),
      [path.join(__dirname, 'dist/electron/main.js')],
      { 
        stdio: 'inherit',
        env: { ...process.env }
      }
    );

    electron.on('close', () => {
      process.exit();
    });
  })
  .catch((err) => {
    console.error('Failed to start Electron:', err);
    process.exit(1);
  });

