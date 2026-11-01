/* eslint-disable sort-keys */
export function getBundlePaths(parent: string) {
  const containerEnvironmentDir = `${parent}/container`;

  return {
    appsDir: `${parent}/apps`,
    binDir: `${parent}/bin`,

    scriptsDir: `${parent}/scripts`,

    containerEnvironmentDir,
    containerEnvironmentComposeYml: `${containerEnvironmentDir}/docker-compose.yml`,
    containerImagesDir: `${containerEnvironmentDir}/images`,
    containerVolumesDir: `${containerEnvironmentDir}/volumes`,
  };
}
