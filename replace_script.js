const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targetDir = 'd:/EndUser/hitesh/shreshtproject/shreshtibrary/app/dashboard';
walkDir(targetDir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Use a regular expression to match the hasPerm function block
        const regex = /const hasPerm = \(key: string\) => \{\s*if \(currentUser\?\.role === "super_admin" \|\| currentUser\?\.role === "sub_super_admin"\) return true;\s*if \(!currentUser\?\.permissions\) return false;\s*if \(Array\.isArray\(currentUser\.permissions\)\) return currentUser\.permissions\.includes\(key\);\s*return Boolean\(\(currentUser\.permissions as Record<string, unknown>\)\[key\]\);\s*\};/g;
        
        const replacement = `const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };`;

        if (regex.test(content)) {
            console.log("Replacing in", filePath);
            content = content.replace(regex, replacement);
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
});
