const { readdirSync, statSync, readFileSync } = require('fs');
const { join, relative } = require('path');
const path = require('path');

// Directory to scan
const dir = '.';
// Directories to exclude
const excludedDirs = ['.next', '.git', 'node_modules'];

// Function to get all JS/TS files
function getAllFiles(directory) {
    const files = [];
    
    function traverse(currentDir) {
        const entries = readdirSync(currentDir);
        
        entries.forEach(entry => {
            const fullPath = join(currentDir, entry);
            const relativePath = relative('.', fullPath);
            
            if (excludedDirs.some((excluded) => relativePath.includes(excluded))) {
                return;
            }
            
            const stats = statSync(fullPath);
            
            if (stats.isDirectory()) {
                traverse(fullPath);
            } else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
                files.push(fullPath);
            }
        });
    }
    
    traverse(directory);
    return files;
}

// Function to extract imports from a file
function extractImports(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const imports = new Set();
    
    // Match require statements
    const requireMatches = content.match(/require\(['"]([@\w-/]+)['"]\)/g) || [];
    requireMatches.forEach(match => {
        const pkg = match.match(/require\(['"]([@\w-/]+)['"]\)/)[1];
        imports.add(pkg.split('/')[0]); // Get the package name without sub-paths
    });
    
    // Match import statements
    const importMatches = content.match(/from\s+['"]([@\w-/]+)['"]/g) || [];
    importMatches.forEach(match => {
        const pkg = match.match(/from\s+['"]([@\w-/]+)['"]/)[1];
        imports.add(pkg.split('/')[0]); // Get the package name without sub-paths
    });
    
    return imports;
}

// Main function to find unused dependencies
function findUnusedDependencies() {
    // Read package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const dependencies = new Set([
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {})
    ]);
    
    // Get all used packages
    const files = getAllFiles(dir);
    const usedPackages = new Set();
    
    files.forEach(file => {
        const imports = extractImports(file);
        imports.forEach(pkg => usedPackages.add(pkg));
    });
    
    // Find unused dependencies
    const unusedDeps = new Set();
    dependencies.forEach(dep => {
        if (!usedPackages.has(dep)) {
            unusedDeps.add(dep);
        }
    });
    
    // Print results
    console.log('Unused dependencies:');
    unusedDeps.forEach(dep => {
        const isDev = packageJson.devDependencies && dep in packageJson.devDependencies;
        console.log(`- ${dep} (${isDev ? 'devDependency' : 'dependency'})`);
    });
    
    return unusedDeps;
}

findUnusedDependencies();