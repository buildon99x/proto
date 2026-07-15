import fs from 'fs';
import path from 'path';

const incrementVersion = (version: string, type: 'major' | 'minor' | 'patch' = 'patch'): string => {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

const bumpRootVersion = () => {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const newVersion = incrementVersion(packageJson.version);
  packageJson.version = newVersion;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Root version bumped to ${newVersion}`);

  return newVersion;
};

const bumpProjectVersions = () => {
  const projectsDir = path.join(process.cwd(), 'projects');
  const projects = fs.readdirSync(projectsDir).filter(name => {
    const projectJsonPath = path.join(projectsDir, name, 'project.json');
    return fs.existsSync(projectJsonPath);
  });

  projects.forEach(projectName => {
    const projectJsonPath = path.join(projectsDir, projectName, 'project.json');
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));

    const newVersion = incrementVersion(projectJson.version);
    projectJson.version = newVersion;

    fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + '\n');
    console.log(`✓ ${projectName} version bumped to ${newVersion}`);
  });
};

const main = () => {
  const args = process.argv.slice(2);
  const type = (args[0] as 'major' | 'minor' | 'patch') || 'patch';
  const scope = args[1] || 'all'; // 'all', 'root', or specific project name

  if (scope === 'all' || scope === 'root') {
    bumpRootVersion();
  }

  if (scope === 'all' || (scope !== 'root')) {
    if (scope === 'all') {
      bumpProjectVersions();
    } else {
      // Bump specific project
      const projectJsonPath = path.join(process.cwd(), 'projects', scope, 'project.json');
      if (fs.existsSync(projectJsonPath)) {
        const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
        const newVersion = incrementVersion(projectJson.version, type);
        projectJson.version = newVersion;
        fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + '\n');
        console.log(`✓ ${scope} version bumped to ${newVersion}`);
      } else {
        console.error(`Project ${scope} not found`);
        process.exit(1);
      }
    }
  }
};

main();
