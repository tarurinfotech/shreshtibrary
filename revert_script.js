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
        
        let changed = false;

        // Replace for currentUser
        const regexCurrentUser = /if \(currentUser\?\.role === "super_admin"\) return true;/g;
        if (regexCurrentUser.test(content)) {
            content = content.replace(regexCurrentUser, 'if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;');
            changed = true;
        }

        // Replace for isSuper
        const regexIsSuper = /if \(isSuper\) return true;/g;
        if (regexIsSuper.test(content)) {
            content = content.replace(regexIsSuper, 'if (isSuper || user?.role === "sub_super_admin") return true;');
            changed = true;
        }

        if (changed) {
            console.log("Reverting in", filePath);
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
});
