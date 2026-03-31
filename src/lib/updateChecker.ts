// Check if new version available
export async function checkForUpdate(currentVersion: string): Promise<boolean> {
  try {
    // GitHub API থেকে latest version fetch
    const response = await fetch(
      'https://api.github.com/repos/YOUR_USERNAME/TuitionTracker/releases/latest'
    );
    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', '');
    
    return latestVersion !== currentVersion;
  } catch {
    return false;
  }
}
